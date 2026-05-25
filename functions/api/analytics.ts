type UsageEventName = 'analysis_started' | 'analysis_completed' | 'analysis_failed';
type UsageAnalysisMode = 'music' | 'sfx';

interface AnalyticsDataPoint {
  indexes: string[];
  blobs: string[];
  doubles: number[];
}

interface AnalyticsEngineDataset {
  writeDataPoint: (dataPoint: AnalyticsDataPoint) => void;
}

interface Env {
  SONICLENS_ANALYTICS?: AnalyticsEngineDataset;
}

interface PagesContext {
  request: Request;
  env: Env;
}

interface UsageEvent {
  eventName: UsageEventName;
  mode: UsageAnalysisMode;
  originalSizeBucket: string;
  processedSizeBucket?: string;
  durationMs?: number;
  wasTranscoded?: boolean;
  model?: string;
  errorMessage?: string;
}

const EVENT_NAMES: UsageEventName[] = [
  'analysis_started',
  'analysis_completed',
  'analysis_failed',
];

const ANALYSIS_MODES: UsageAnalysisMode[] = ['music', 'sfx'];

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

const isUsageEventName = (value: unknown): value is UsageEventName => (
  typeof value === 'string' && EVENT_NAMES.some((eventName) => eventName === value)
);

const isUsageAnalysisMode = (value: unknown): value is UsageAnalysisMode => (
  typeof value === 'string' && ANALYSIS_MODES.some((mode) => mode === value)
);

const optionalString = (value: unknown): string | undefined => (
  typeof value === 'string' && value.trim() ? value.trim().slice(0, 120) : undefined
);

const optionalNumber = (value: unknown): number | undefined => (
  typeof value === 'number' && Number.isFinite(value) ? value : undefined
);

const optionalBoolean = (value: unknown): boolean | undefined => (
  typeof value === 'boolean' ? value : undefined
);

const parseUsageEvent = (value: unknown): UsageEvent | null => {
  if (!isRecord(value)) return null;
  if (!isUsageEventName(value.eventName)) return null;
  if (!isUsageAnalysisMode(value.mode)) return null;
  if (typeof value.originalSizeBucket !== 'string' || !value.originalSizeBucket.trim()) return null;

  return {
    eventName: value.eventName,
    mode: value.mode,
    originalSizeBucket: value.originalSizeBucket.trim().slice(0, 40),
    processedSizeBucket: optionalString(value.processedSizeBucket),
    durationMs: optionalNumber(value.durationMs),
    wasTranscoded: optionalBoolean(value.wasTranscoded),
    model: optionalString(value.model),
    errorMessage: optionalString(value.errorMessage),
  };
};

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  if (!context.env.SONICLENS_ANALYTICS) {
    return Response.json({ error: 'Analytics Engine binding is not configured.' }, { status: 503 });
  }

  let parsedBody: unknown;
  try {
    parsedBody = await context.request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const event = parseUsageEvent(parsedBody);
  if (!event) {
    return Response.json({ error: 'Invalid analytics event.' }, { status: 400 });
  }

  context.env.SONICLENS_ANALYTICS.writeDataPoint({
    indexes: [event.mode],
    blobs: [
      event.eventName,
      event.mode,
      event.originalSizeBucket,
      event.processedSizeBucket ?? '',
      event.wasTranscoded === undefined ? '' : String(event.wasTranscoded),
      event.model ?? '',
      event.errorMessage ?? '',
    ],
    doubles: [
      event.durationMs ?? 0,
      1,
    ],
  });

  return new Response(null, { status: 204 });
};

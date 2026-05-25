const EVENT_NAMES = [
  'analysis_started',
  'analysis_completed',
  'analysis_failed',
];

const ANALYSIS_MODES = ['music', 'sfx'];

const isRecord = (value) => (
  typeof value === 'object' && value !== null
);

const isUsageEventName = (value) => (
  typeof value === 'string' && EVENT_NAMES.includes(value)
);

const isUsageAnalysisMode = (value) => (
  typeof value === 'string' && ANALYSIS_MODES.includes(value)
);

const optionalString = (value) => (
  typeof value === 'string' && value.trim() ? value.trim().slice(0, 120) : undefined
);

const optionalNumber = (value) => (
  typeof value === 'number' && Number.isFinite(value) ? value : undefined
);

const optionalBoolean = (value) => (
  typeof value === 'boolean' ? value : undefined
);

const parseUsageEvent = (value) => {
  if (!isRecord(value)) return null;
  if (!isUsageEventName(value.eventName)) return null;
  if (!isUsageAnalysisMode(value.mode)) return null;
  if (typeof value.originalSizeBucket !== 'string' || !value.originalSizeBucket.trim()) {
    return null;
  }

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

export async function onRequestPost(context) {
  if (!context.env.SONICLENS_ANALYTICS) {
    return Response.json({ error: 'Analytics Engine binding is not configured.' }, { status: 503 });
  }

  let parsedBody;
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
}

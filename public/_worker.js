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

const jsonError = (message, status) => (
  Response.json({ error: message }, { status })
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

const handleAnalytics = async (request, env) => {
  if (request.method !== 'POST') return new Response(null, { status: 405 });
  if (!env.SONICLENS_ANALYTICS) {
    return jsonError('Analytics Engine binding is not configured.', 503);
  }

  let parsedBody;
  try {
    parsedBody = await request.json();
  } catch {
    return jsonError('Invalid JSON body.', 400);
  }

  const event = parseUsageEvent(parsedBody);
  if (!event) return jsonError('Invalid analytics event.', 400);

  env.SONICLENS_ANALYTICS.writeDataPoint({
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/analytics') return handleAnalytics(request, env);
    return env.ASSETS.fetch(request);
  },
};

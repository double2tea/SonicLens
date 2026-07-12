const EVENT_NAMES = ['analysis_started', 'analysis_completed', 'analysis_failed'];

const ANALYSIS_MODES = ['music', 'sfx', 'video'];
const SIZE_BUCKETS = ['<5MB', '5-20MB', '20-50MB', '50MB+'];
const MAX_EVENT_BODY_BYTES = 2048;
const MAX_ANALYSIS_DURATION_MS = 24 * 60 * 60 * 1000;

const isRecord = (value) => typeof value === 'object' && value !== null;

const isUsageEventName = (value) => typeof value === 'string' && EVENT_NAMES.includes(value);

const isUsageAnalysisMode = (value) => typeof value === 'string' && ANALYSIS_MODES.includes(value);

const isSizeBucket = (value) => typeof value === 'string' && SIZE_BUCKETS.includes(value);

const optionalString = (value) =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, 120) : undefined;

const optionalDuration = (value) =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= MAX_ANALYSIS_DURATION_MS
    ? value
    : undefined;

const optionalBoolean = (value) => (typeof value === 'boolean' ? value : undefined);

const jsonError = (message, status) => Response.json({ error: message }, { status });

const writeUsageEvent = (analytics, event) => {
  analytics.writeDataPoint({
    blobs: [
      event.eventName,
      event.mode,
      event.originalSizeBucket,
      event.processedSizeBucket ?? '',
      event.wasTranscoded === undefined ? '' : String(event.wasTranscoded),
      event.model ?? '',
      event.errorMessage ?? '',
    ],
    doubles: [event.durationMs ?? 0],
    indexes: [`${event.eventName}:${event.mode}`],
  });
};

const parseUsageEvent = (value) => {
  if (!isRecord(value)) return null;
  if (!isUsageEventName(value.eventName)) return null;
  if (!isUsageAnalysisMode(value.mode)) return null;
  if (!isSizeBucket(value.originalSizeBucket)) return null;
  if (value.processedSizeBucket !== undefined && !isSizeBucket(value.processedSizeBucket))
    return null;
  if (value.durationMs !== undefined && optionalDuration(value.durationMs) === undefined)
    return null;

  return {
    eventName: value.eventName,
    mode: value.mode,
    originalSizeBucket: value.originalSizeBucket,
    processedSizeBucket: value.processedSizeBucket,
    durationMs: optionalDuration(value.durationMs),
    wasTranscoded: optionalBoolean(value.wasTranscoded),
    model: optionalString(value.model),
    errorMessage: optionalString(value.errorMessage),
  };
};

const handleAnalytics = async (request, env) => {
  if (request.method !== 'POST') return new Response(null, { status: 405 });
  const requestUrl = new URL(request.url);
  const origin = request.headers.get('Origin');
  if (origin && origin !== requestUrl.origin) return jsonError('Cross-origin request denied.', 403);
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) {
    return jsonError('Content-Type must be application/json.', 415);
  }
  const contentLength = Number(request.headers.get('Content-Length') ?? 0);
  if (contentLength > MAX_EVENT_BODY_BYTES) return jsonError('Request body too large.', 413);

  let parsedBody;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > MAX_EVENT_BODY_BYTES) {
      return jsonError('Request body too large.', 413);
    }
    parsedBody = JSON.parse(body);
  } catch {
    return jsonError('Invalid JSON body.', 400);
  }

  const event = parseUsageEvent(parsedBody);
  if (!event) return jsonError('Invalid analytics event.', 400);
  writeUsageEvent(env.SONICLENS_ANALYTICS, event);
  return new Response(null, { status: 204 });
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/analytics') return handleAnalytics(request, env);
    return env.ASSETS.fetch(request);
  },
};

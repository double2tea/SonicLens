export type UsageEventName = 'analysis_started' | 'analysis_completed' | 'analysis_failed';
export type UsageAnalysisMode = 'music' | 'sfx';

export interface UsageEvent {
  eventName: UsageEventName;
  mode: UsageAnalysisMode;
  originalSizeBucket: string;
  processedSizeBucket?: string;
  durationMs?: number;
  wasTranscoded?: boolean;
  model?: string;
  errorMessage?: string;
}

const buildAnalyticsEndpoint = (event: UsageEvent): string => {
  const eventName = encodeURIComponent(event.eventName);
  const mode = encodeURIComponent(event.mode);
  const sizeBucket = encodeURIComponent(event.originalSizeBucket);
  return `/api/analytics/${eventName}/${mode}/${sizeBucket}`;
};

export const getFileSizeBucket = (bytes: number): string => {
  const mb = bytes / 1024 / 1024;
  if (mb < 5) return '<5MB';
  if (mb < 20) return '5-20MB';
  if (mb < 50) return '20-50MB';
  return '50MB+';
};

export const trackUsageEvent = (event: UsageEvent): void => {
  if (import.meta.env.DEV) return;

  const endpoint = buildAnalyticsEndpoint(event);
  const body = JSON.stringify(event);

  if (navigator.sendBeacon) {
    const queued = navigator.sendBeacon(
      endpoint,
      new Blob([body], { type: 'application/json' })
    );
    if (queued) return;
  }

  void fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined);
};

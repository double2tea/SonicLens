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

const ANALYTICS_ENDPOINT = '/api/analytics';

export const getFileSizeBucket = (bytes: number): string => {
  const mb = bytes / 1024 / 1024;
  if (mb < 5) return '<5MB';
  if (mb < 20) return '5-20MB';
  if (mb < 50) return '20-50MB';
  return '50MB+';
};

export const trackUsageEvent = (event: UsageEvent): void => {
  if (import.meta.env.DEV) return;

  const body = JSON.stringify(event);

  if (navigator.sendBeacon) {
    const queued = navigator.sendBeacon(
      ANALYTICS_ENDPOINT,
      new Blob([body], { type: 'application/json' })
    );
    if (queued) return;
  }

  void fetch(ANALYTICS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined);
};

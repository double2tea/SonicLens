export const parseTimestampToSeconds = (value: string): number => {
  const start = value.trim().split(/\s+-\s+/, 1)[0];
  const parts = start.split(':').map(Number);
  if (
    (parts.length !== 2 && parts.length !== 3) ||
    parts.some((part) => !Number.isInteger(part) || part < 0)
  ) {
    return 0;
  }

  const seconds = parts.at(-1) ?? 0;
  if (seconds >= 60) return 0;

  if (parts.length === 2) return parts[0] * 60 + seconds;
  const minutes = parts[1];
  if (minutes >= 60) return 0;
  return parts[0] * 3600 + minutes * 60 + seconds;
};

export interface TimestampRange {
  end: number;
  start: number;
}

export const parseTimestampRange = (value: string): TimestampRange => {
  const [startValue, endValue] = value.trim().split(/\s+[-–—]\s+/, 2);
  const start = parseTimestampToSeconds(startValue);
  const parsedEnd = endValue ? parseTimestampToSeconds(endValue) : start;
  return { start, end: Math.max(start, parsedEnd) };
};

export const formatTimestamp = (seconds: number): string => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
};

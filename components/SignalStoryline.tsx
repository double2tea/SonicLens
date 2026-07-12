import type { CSSProperties } from 'react';
import { Scissors } from 'lucide-react';
import {
  formatTimestamp,
  parseTimestampRange,
  parseTimestampToSeconds,
} from '../services/timecode';
import type { EditorCuePoint, SongSegment } from '../types';

interface SignalStorylineProps {
  calibrateTime: (timeInSeconds: number) => number;
  cuePoints: EditorCuePoint[];
  isPlayable: boolean;
  onPreviewCue: (timeInSeconds: number) => void;
  onPreviewSegment: (startInSeconds: number, endInSeconds: number) => void;
  segments: SongSegment[];
  transientCount: number;
}

const getDuration = (cuePoints: EditorCuePoint[], segments: SongSegment[]): number =>
  Math.max(
    1,
    ...cuePoints.map((cue) => parseTimestampToSeconds(cue.timestamp)),
    ...segments.map((segment) => parseTimestampRange(segment.timestamp).end),
  );

export default function SignalStoryline({
  calibrateTime,
  cuePoints,
  isPlayable,
  onPreviewCue,
  onPreviewSegment,
  segments,
  transientCount,
}: SignalStorylineProps) {
  const duration = getDuration(cuePoints, segments);
  const cueGridStyle: CSSProperties = {
    gridTemplateColumns: `repeat(${Math.max(1, cuePoints.length)}, minmax(0, 1fr))`,
  };

  return (
    <section className="report-band mt-6 overflow-hidden" aria-labelledby="storyline-title">
      <div className="flex flex-col justify-between gap-3 border-b hairline px-5 py-4 sm:flex-row sm:items-end sm:px-7">
        <div>
          <p className="eyebrow">Signal storyline</p>
          <h2 id="storyline-title" className="mt-2 text-xl font-semibold tracking-[-0.04em]">
            声音叙事线
          </h2>
        </div>
        <p className="text-[0.72rem] text-[var(--text-muted)]">
          {!isPlayable
            ? '当前历史报告没有可播放音频'
            : transientCount > 0 && cuePoints.length > 0
              ? `已检测 ${transientCount} 个本地瞬态，卡点会自动吸附`
              : '点击卡点或段落可循环试听'}
        </p>
      </div>

      {cuePoints.length > 0 && (
        <div className="px-5 pt-6 sm:px-7">
          <div className="relative hidden h-8 sm:block" aria-hidden="true">
            <div className="absolute inset-x-0 top-2.5 h-px bg-[var(--line-strong)]" />
            {cuePoints.map((cue, index) => {
              const calibratedTime = calibrateTime(parseTimestampToSeconds(cue.timestamp));
              const position = Math.min(100, (calibratedTime / duration) * 100);
              return (
                <span
                  key={`${cue.timestamp}-${index}`}
                  className="absolute top-0 h-5 w-5 -translate-x-1/2 rounded-full border-[6px] border-[var(--canvas-soft)] bg-[var(--accent)]"
                  style={{ left: `${position}%` }}
                />
              );
            })}
          </div>

          <div className="story-cue-grid" style={cueGridStyle}>
            {cuePoints.map((cue, index) => {
              const sourceTime = parseTimestampToSeconds(cue.timestamp);
              const calibratedTime = calibrateTime(sourceTime);
              const offset = calibratedTime - sourceTime;
              const wasCalibrated = isPlayable && Math.abs(offset) >= 0.05;

              return (
                <button
                  key={`${cue.timestamp}-${index}`}
                  type="button"
                  disabled={!isPlayable}
                  onClick={() => onPreviewCue(calibratedTime)}
                  className="story-cue group text-left disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <span className="data-value flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.72rem] accent-text">
                    <span className="flex items-center gap-2">
                      <Scissors size={12} />
                      {cue.timestamp}
                    </span>
                    {wasCalibrated && (
                      <span className="rounded-sm bg-[rgba(23,107,69,0.09)] px-1.5 py-0.5 text-[0.58rem]">
                        校准 {offset > 0 ? '+' : ''}
                        {offset.toFixed(1)}s
                      </span>
                    )}
                  </span>
                  <span className="mt-2 block text-[0.95rem] font-semibold group-hover:accent-text">
                    {cue.eventName}
                  </span>
                  <span className="mt-2 block text-[0.76rem] leading-5 text-[var(--text-muted)]">
                    {cue.vibeChange}
                  </span>
                  <span className="mt-1 block text-[0.76rem] leading-5 text-[var(--text-secondary)]">
                    {cue.visualAdvice}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {segments.length > 0 && (
        <div className="px-5 pt-5 pb-6 sm:px-7">
          <div className="mb-2 flex items-center justify-between text-[0.6rem] text-[var(--text-muted)]">
            <span className="data-value">0:00</span>
            <span className="data-value">{formatTimestamp(duration)}</span>
          </div>
          <div className="story-segment-track">
            {segments.map((segment, index) => {
              const range = parseTimestampRange(segment.timestamp);
              const segmentDuration = Math.max(1, range.end - range.start);
              return (
                <button
                  key={`${segment.timestamp}-${index}`}
                  type="button"
                  disabled={!isPlayable}
                  onClick={() => onPreviewSegment(range.start, range.end)}
                  className="story-segment group text-left disabled:cursor-not-allowed disabled:opacity-55"
                  style={{ flexGrow: segmentDuration }}
                >
                  <span className="data-value block text-[0.6rem] text-[var(--text-muted)]">
                    {segment.timestamp}
                  </span>
                  <span className="mt-1 block truncate text-xs font-semibold group-hover:accent-text">
                    {segment.genre}
                  </span>
                  <span className="mt-1 block truncate text-[0.64rem] text-[var(--text-secondary)]">
                    {segment.mood}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

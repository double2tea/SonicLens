import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Film, VideoOff } from 'lucide-react';

interface VideoPreviewProps {
  file: File | null;
  onDurationChange?: (durationSeconds: number) => void;
  onTimeChange?: (timeSeconds: number) => void;
}

export interface VideoPreviewRef {
  seekTo: (timeSeconds: number) => void;
}

const VideoPreview = forwardRef<VideoPreviewRef, VideoPreviewProps>(function VideoPreview(
  { file, onDurationChange, onTimeChange },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    seekTo: (timeSeconds: number) => {
      const video = videoRef.current;
      if (!video || !Number.isFinite(timeSeconds)) return;

      const upperBound = Number.isFinite(video.duration) ? video.duration : timeSeconds;
      video.currentTime = Math.max(0, Math.min(timeSeconds, upperBound));
    },
  }));

  useEffect(() => {
    setPlaybackError(null);
    if (!file) {
      setObjectUrl(null);
      return;
    }

    const nextObjectUrl = URL.createObjectURL(file);
    setObjectUrl(nextObjectUrl);

    return () => URL.revokeObjectURL(nextObjectUrl);
  }, [file]);

  if (!file) {
    return (
      <section
        className="grid aspect-video min-h-44 place-items-center rounded-xl border hairline bg-black/[0.025] px-6 text-center sm:min-h-52"
        aria-label="原片预览不可用"
      >
        <div className="max-w-sm">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-lg bg-black/[0.05] text-[var(--text-muted)]">
            <VideoOff aria-hidden="true" size={19} />
          </span>
          <p className="mt-4 text-sm font-semibold text-[var(--text)]">原片未保存在历史记录中</p>
          <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
            报告与声音规划仍可查看；如需按分镜跳转预览，请重新载入原视频。
          </p>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="原片预览" data-export-ignore="true">
      <div className="relative overflow-hidden rounded-xl border border-black/20 bg-[#121713] shadow-[0_18px_48px_rgba(21,31,24,0.12)]">
        {objectUrl ? (
          <video
            ref={videoRef}
            src={objectUrl}
            controls
            playsInline
            preload="metadata"
            className="aspect-video w-full bg-[#121713] object-contain"
            onDurationChange={(event) => {
              const duration = event.currentTarget.duration;
              if (Number.isFinite(duration)) onDurationChange?.(duration);
            }}
            onError={() => setPlaybackError('当前浏览器无法播放这段原片。')}
            onTimeUpdate={(event) => onTimeChange?.(event.currentTarget.currentTime)}
          />
        ) : (
          <div className="aspect-video w-full animate-pulse bg-[#18201a]" aria-hidden="true" />
        )}

        <div className="pointer-events-none absolute top-3 left-3 flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-md bg-[#101611]/75 px-2.5 py-1.5 text-[0.65rem] text-white/75 backdrop-blur-md">
          <Film aria-hidden="true" size={12} className="shrink-0 text-emerald-300" />
          <span className="truncate">{file.name}</span>
        </div>
      </div>

      {playbackError && (
        <p role="alert" className="mt-2 text-xs text-[var(--danger)]">
          {playbackError}
        </p>
      )}
    </section>
  );
});

export default VideoPreview;

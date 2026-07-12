import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Pause, Play, Repeat2, Scissors } from 'lucide-react';
import { detectTransientTimes } from '../services/transientDetection';

type WebKitAudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

const createAudioContext = (): AudioContext => {
  const AudioContextConstructor =
    window.AudioContext ?? (window as WebKitAudioWindow).webkitAudioContext;
  if (!AudioContextConstructor) throw new Error('当前浏览器不支持音频解码。');
  return new AudioContextConstructor();
};

interface PlaybackRange {
  end: number;
  start: number;
}

interface WaveformPlayerProps {
  autoPlay?: boolean;
  file: File;
  isPreparingRange?: boolean;
  onAnalyzeRange?: (start: number, end: number) => Promise<void> | void;
  onTransientsDetected?: (timesInSeconds: number[]) => void;
}

export interface WaveformPlayerRef {
  previewAround: (timeInSeconds: number) => void;
  previewRange: (startInSeconds: number, endInSeconds: number) => void;
}

const formatTime = (time: number): string => {
  if (!Number.isFinite(time)) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const WaveformPlayer = forwardRef<WaveformPlayerRef, WaveformPlayerProps>(function WaveformPlayer(
  { autoPlay = false, file, isPreparingRange = false, onAnalyzeRange, onTransientsDetected },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loopRangeRef = useRef<PlaybackRange | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopRange, setLoopRange] = useState<PlaybackRange | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [selectionEnd, setSelectionEnd] = useState(0);
  const [selectionStart, setSelectionStart] = useState(0);
  const [showSelection, setShowSelection] = useState(false);
  const [waveform, setWaveform] = useState<number[]>([]);

  const play = async () => {
    if (!audioRef.current) return;
    try {
      await audioRef.current.play();
      setPlaybackError(null);
    } catch {
      setPlaybackError('浏览器阻止了播放，请再次点击播放按钮。');
    }
  };

  const updateLoopRange = (range: PlaybackRange | null) => {
    loopRangeRef.current = range;
    setLoopRange(range);
  };

  const previewRange = (startInSeconds: number, endInSeconds: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(startInSeconds) || !Number.isFinite(endInSeconds)) return;

    const audioDuration = Number.isFinite(audio.duration) ? audio.duration : duration;
    const start = Math.max(0, Math.min(startInSeconds, audioDuration));
    const end = Math.max(start, Math.min(endInSeconds, audioDuration));
    if (end <= start) return;

    updateLoopRange({ start, end });
    audio.currentTime = start;
    setCurrentTime(start);
    void play();
  };

  useImperativeHandle(ref, () => ({
    previewAround: (timeInSeconds: number) => {
      previewRange(timeInSeconds - 2, timeInSeconds + 3);
    },
    previewRange,
  }));

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audioRef.current = audio;
    loopRangeRef.current = null;
    setLoopRange(null);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setPlaybackError(null);
    setShowSelection(false);

    const onLoadedMetadata = () => {
      const nextDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
      setDuration(nextDuration);
      setSelectionStart(0);
      setSelectionEnd(Math.min(30, nextDuration));
    };
    const onTimeUpdate = () => {
      const range = loopRangeRef.current;
      const loopLead = range ? Math.min(0.05, (range.end - range.start) / 2) : 0;
      if (range && audio.currentTime >= range.end - loopLead) {
        audio.currentTime = range.start;
      }
      setCurrentTime(audio.currentTime);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      const range = loopRangeRef.current;
      if (!range) {
        setCurrentTime(0);
        return;
      }

      audio.currentTime = range.start;
      setCurrentTime(range.start);
      void audio.play().catch(() => {
        setPlaybackError('浏览器阻止了播放，请再次点击播放按钮。');
      });
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    if (autoPlay) {
      void audio.play().catch(() => {
        setPlaybackError('浏览器阻止了播放，请再次点击播放按钮。');
      });
    }

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.src = '';
      audioRef.current = null;
      loopRangeRef.current = null;
      URL.revokeObjectURL(url);
    };
  }, [autoPlay, file]);

  useEffect(() => {
    let cancelled = false;
    let audioContext: AudioContext | null = null;
    setWaveform([]);
    onTransientsDetected?.([]);

    const generateWaveform = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        audioContext = createAudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const rawData = audioBuffer.getChannelData(0);
        const sampleCount = 180;
        const blockSize = Math.max(1, Math.floor(rawData.length / sampleCount));
        const values = Array.from({ length: sampleCount }, (_, index) => {
          let sum = 0;
          let sampled = 0;
          const start = index * blockSize;
          const end = Math.min(start + blockSize, rawData.length);
          const stride = Math.max(1, Math.floor((end - start) / 256));
          for (let cursor = start; cursor < end; cursor += stride) {
            sum += Math.abs(rawData[cursor]);
            sampled += 1;
          }
          return sum / Math.max(1, sampled);
        });
        const peak = Math.max(...values, 0.001);
        if (!cancelled) {
          setWaveform(values.map((value) => value / peak));
          onTransientsDetected?.(detectTransientTimes(rawData, audioBuffer.sampleRate));
        }
      } catch {
        if (!cancelled) {
          setWaveform([]);
          onTransientsDetected?.([]);
        }
      } finally {
        if (audioContext) await audioContext.close();
      }
    };

    void generateWaveform();
    return () => {
      cancelled = true;
    };
  }, [file, onTransientsDetected]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveform.length === 0) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    context.scale(ratio, ratio);
    context.clearRect(0, 0, width, height);

    const progress = duration > 0 ? currentTime / duration : 0;
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    const step = width / waveform.length;
    waveform.forEach((value, index) => {
      const barHeight = Math.max(2, value * height * 0.72);
      context.fillStyle = index / waveform.length <= progress ? accent : 'rgba(21,31,24,0.18)';
      context.fillRect(index * step, (height - barHeight) / 2, Math.max(1, step - 1.5), barHeight);
    });
  }, [currentTime, duration, waveform]);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void play();
    else audio.pause();
  };

  const seek = (value: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    updateLoopRange(null);
    audio.currentTime = value;
    setCurrentTime(value);
  };

  const updateSelectionStart = (value: number) => {
    setSelectionStart(Math.max(0, Math.min(value, selectionEnd - 1)));
  };

  const updateSelectionEnd = (value: number) => {
    setSelectionEnd(Math.min(duration, Math.max(value, selectionStart + 1)));
  };

  const selectionLeft = duration > 0 ? (selectionStart / duration) * 100 : 0;
  const selectionWidth = duration > 0 ? ((selectionEnd - selectionStart) / duration) * 100 : 0;
  const canAnalyzeSelection = Boolean(onAnalyzeRange) && duration >= 1 && !isPreparingRange;

  return (
    <div className="waveform-shell">
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={togglePlayback}
          className="accent-bg grid h-10 w-10 shrink-0 place-items-center rounded-lg"
          aria-label={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? (
            <Pause size={17} fill="currentColor" />
          ) : (
            <Play size={17} fill="currentColor" className="ml-0.5" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="relative h-14 overflow-hidden rounded-sm">
            {waveform.length > 0 ? (
              <canvas ref={canvasRef} className="block h-full w-full" aria-hidden="true" />
            ) : (
              <div className="absolute inset-x-0 top-1/2 h-px bg-black/[0.16]" aria-hidden="true" />
            )}
            {showSelection && duration > 0 && (
              <div
                className="pointer-events-none absolute inset-y-0 border-x border-[var(--accent)] bg-[rgba(23,107,69,0.12)]"
                style={{ left: `${selectionLeft}%`, width: `${selectionWidth}%` }}
                aria-hidden="true"
              />
            )}
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(currentTime, duration || 0)}
              onChange={(event) => seek(Number(event.target.value))}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              aria-label="播放进度"
            />
          </div>
          <div className="data-value mt-1 flex justify-between text-[0.62rem] text-[var(--text-muted)]">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {onAnalyzeRange && (
          <button
            type="button"
            onClick={() => setShowSelection((visible) => !visible)}
            aria-expanded={showSelection}
            className={`hidden shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold sm:inline-flex ${
              showSelection
                ? 'accent-surface accent-text'
                : 'hairline text-[var(--text-muted)] hover:border-[var(--line-strong)] hover:text-[var(--text)]'
            }`}
          >
            <Scissors size={14} />
            选择片段
          </button>
        )}
      </div>

      {loopRange && (
        <div className="mt-3 flex items-center justify-between gap-3 border-t hairline pt-3 text-xs">
          <span className="flex items-center gap-2 text-[var(--text-secondary)]">
            <Repeat2 size={14} className="accent-text" />
            循环试听
            <span className="data-value accent-text">
              {formatTime(loopRange.start)}–{formatTime(loopRange.end)}
            </span>
          </span>
          <button
            type="button"
            onClick={() => updateLoopRange(null)}
            className="text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            结束循环
          </button>
        </div>
      )}

      {onAnalyzeRange && (
        <button
          type="button"
          onClick={() => setShowSelection((visible) => !visible)}
          aria-expanded={showSelection}
          className={`mt-3 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold sm:hidden ${
            showSelection ? 'accent-surface accent-text' : 'hairline text-[var(--text-muted)]'
          }`}
        >
          <Scissors size={14} />
          选择片段
        </button>
      )}

      {showSelection && onAnalyzeRange && (
        <div className="mt-3 grid gap-4 border-t hairline pt-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <label className="block">
            <span className="flex justify-between text-[0.68rem] text-[var(--text-muted)]">
              <span>片段起点</span>
              <span className="data-value text-[var(--text)]">{formatTime(selectionStart)}</span>
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(0, selectionEnd - 1)}
              step={0.1}
              value={selectionStart}
              onChange={(event) => updateSelectionStart(Number(event.target.value))}
              className="mt-2 w-full accent-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="flex justify-between text-[0.68rem] text-[var(--text-muted)]">
              <span>片段终点</span>
              <span className="data-value text-[var(--text)]">{formatTime(selectionEnd)}</span>
            </span>
            <input
              type="range"
              min={Math.min(duration, selectionStart + 1)}
              max={duration}
              step={0.1}
              value={selectionEnd}
              onChange={(event) => updateSelectionEnd(Number(event.target.value))}
              className="mt-2 w-full accent-[var(--accent)]"
            />
          </label>
          <button
            type="button"
            disabled={!canAnalyzeSelection}
            onClick={() => void onAnalyzeRange(selectionStart, selectionEnd)}
            className="accent-bg inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Scissors size={14} />
            {isPreparingRange ? '正在准备片段' : '重新分析此片段'}
          </button>
        </div>
      )}

      {playbackError && (
        <p className="mt-3 text-xs text-[var(--danger)]" role="alert">
          {playbackError}
        </p>
      )}
    </div>
  );
});

export default WaveformPlayer;

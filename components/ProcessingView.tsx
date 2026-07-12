import { AudioWaveform, X } from 'lucide-react';

interface ProcessingViewProps {
  detail: string;
  fileName: string;
  mode: 'music' | 'sfx' | 'video';
  onCancel: () => void;
  stage: 'prepare' | 'detect' | 'analyze';
  title: string;
}

export default function ProcessingView({
  detail,
  fileName,
  mode,
  onCancel,
  stage,
  title,
}: ProcessingViewProps) {
  const isVideo = mode === 'video';
  const steps = isVideo
    ? [
        { id: 'prepare', label: '01 Prepare' },
        { id: 'detect', label: '02 Detect cuts' },
        { id: 'analyze', label: '03 Analyze' },
        { id: 'report', label: '04 Report' },
      ]
    : [
        { id: 'prepare', label: '01 Prepare' },
        { id: 'analyze', label: '02 Analyze' },
        { id: 'report', label: '03 Report' },
      ];
  const activeIndex = steps.findIndex((step) => step.id === stage);
  const progressPercent = Math.round(((activeIndex + 1) / steps.length) * 100);

  return (
    <section className="mx-auto max-w-3xl py-14 sm:py-24" aria-live="polite" aria-busy="true">
      <div className="surface overflow-hidden p-7 sm:p-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="eyebrow">Analysis in progress</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.045em] text-balance sm:text-4xl">
              {title || (stage === 'analyze' ? '正在理解声音结构' : '正在准备分析媒体')}
            </h1>
          </div>
          <span className="accent-surface grid h-12 w-12 shrink-0 place-items-center rounded-xl border accent-text">
            <AudioWaveform size={22} className="animate-pulse" />
          </span>
        </div>

        <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--text-muted)] text-pretty">
          {detail || '处理在当前浏览器中进行，请保持此页面打开。'}
        </p>

        <div className="mt-10 space-y-4">
          <div
            className="h-1.5 overflow-hidden rounded-full bg-black/[0.08]"
            role="progressbar"
            aria-label="分析进度"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
          >
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div
            className={`grid gap-3 font-mono text-[0.58rem] tracking-wider uppercase sm:text-[0.62rem] ${isVideo ? 'grid-cols-4' : 'grid-cols-3'}`}
          >
            {steps.map((step, index) => (
              <span
                key={step.id}
                aria-current={index === activeIndex ? 'step' : undefined}
                className={`${index <= activeIndex ? 'accent-text' : 'text-[var(--text-muted)]'} ${index === steps.length - 1 ? 'text-right' : ''}`}
              >
                {step.label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t hairline pt-5 sm:flex-row sm:items-center sm:justify-between">
          <span className="min-w-0 truncate font-mono text-xs text-[var(--text-muted)]">
            {fileName}
          </span>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center gap-2 rounded-lg border hairline px-3 py-2 text-xs font-semibold text-[var(--text-muted)] hover:border-[var(--line-strong)] hover:text-[var(--text)]"
          >
            <X size={14} />
            取消分析
          </button>
        </div>
      </div>
    </section>
  );
}

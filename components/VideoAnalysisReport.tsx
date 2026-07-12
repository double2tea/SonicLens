import { useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Captions,
  Check,
  ChevronDown,
  CircleDot,
  Film,
  Image,
  MessageCircle,
  MessageSquareText,
  Mic2,
  Move3d,
  Music2,
  Paintbrush,
  ShieldAlert,
  Sparkles,
  Type,
  Volume2,
  WandSparkles,
  Waves,
} from 'lucide-react';
import { formatTimestamp } from '../services/timecode';
import type {
  SeedAudioContentMode,
  SeedAudioDeliveryMode,
  EditPriority,
  EditRecommendationCategory,
  SoundPriority,
  SoundRoute,
  VideoAnalysisResult,
  VideoShot,
} from '../types';
import VideoPreview from './VideoPreview';
import type { VideoPreviewRef } from './VideoPreview';

interface VideoAnalysisReportProps {
  analysis: VideoAnalysisResult;
  file: File | null;
  isGeneratingSeedAudio?: boolean;
  onDiscussShot?: (shot: VideoShot) => void;
  onGenerateSeedAudio?: () => Promise<void>;
  seedAudioError?: string | null;
}

const priorityLabels: Record<SoundPriority, string> = {
  must: '必须命中',
  recommended: '建议加入',
  creative: '创意选项',
};

const routeLabels: Record<SoundRoute, string> = {
  integrated: '一体生成',
  timed_clip: '定时片段',
  library_foley: '素材 / 拟音',
  mix_only: '混音处理',
  omit: '留白',
};

const deliveryModeLabels: Record<SeedAudioDeliveryMode, string> = {
  integrated_demo: '一体化 Demo',
  assembled_mix: '定时组合混音',
  stems: '分轨生成',
};

const contentModeLabels: Record<SeedAudioContentMode, string> = {
  speech: 'Speech',
  mixed: 'Mixed',
  nonverbal: 'Nonverbal',
};

const diegeticLabels = {
  diegetic: '画内声',
  non_diegetic: '画外声',
  ambiguous: '主观 / 模糊声源',
} as const;

const editPriorityLabels: Record<EditPriority, string> = {
  high: '高优先',
  medium: '中优先',
  low: '低优先',
};

const editCategoryLabels: Record<EditRecommendationCategory, string> = {
  structure: '结构',
  pacing: '节奏',
  cut: '剪辑',
  continuity: '连续性',
  transition: '转场',
  color: '色彩',
  vfx: '视觉效果',
  motion_graphics: '动态包装',
  typography: '字体',
  branding: '品牌',
};

const priorityOrder: Record<EditPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const getShotDuration = (shot: VideoShot): number =>
  Math.max(0.1, shot.endSeconds - shot.startSeconds);

const formatRange = (shot: VideoShot): string =>
  `${formatTimestamp(shot.startSeconds)}–${formatTimestamp(shot.endSeconds)}`;

function DetailBlock({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  if (!value.trim()) return null;

  return (
    <div className="border-l hairline pl-4">
      <p className="flex items-center gap-2 text-[0.67rem] font-medium text-[var(--text-muted)]">
        {icon}
        {label}
      </p>
      <p className="mt-2 text-[0.78rem] leading-6 text-[var(--text-secondary)] text-pretty">
        {value}
      </p>
    </div>
  );
}

function ShotCard({
  active,
  canSeek,
  index,
  isShotSegmentation,
  onDiscuss,
  onSeek,
  shot,
}: {
  active: boolean;
  canSeek: boolean;
  index: number;
  isShotSegmentation: boolean;
  onDiscuss?: () => void;
  onSeek: () => void;
  shot: VideoShot;
}) {
  const detailsId = `video-shot-${index}-details`;

  return (
    <article
      className={`relative border-t py-6 transition-colors first:border-t-0 sm:py-7 ${
        active ? 'border-[var(--accent)]' : 'hairline'
      }`}
      aria-current={active ? 'true' : undefined}
    >
      <div className="grid gap-5 lg:grid-cols-[8.25rem_minmax(0,1fr)] lg:gap-7">
        <div>
          <button
            type="button"
            onClick={onSeek}
            disabled={!canSeek}
            aria-describedby={detailsId}
            className={`group inline-flex items-center gap-2 rounded-md px-2 py-1.5 font-mono text-[0.72rem] font-semibold disabled:cursor-not-allowed disabled:opacity-45 ${
              active
                ? 'accent-surface accent-text'
                : 'text-[var(--text-muted)] hover:bg-black/[0.04] hover:text-[var(--text)]'
            }`}
          >
            {formatRange(shot)}
            <ArrowRight
              aria-hidden="true"
              size={13}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </button>
          <p className="mt-3 px-2 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--text-muted)]">
            {isShotSegmentation ? '候选镜头' : '分析段落'} {String(index + 1).padStart(2, '0')}
          </p>
        </div>

        <div id={detailsId} className="min-w-0">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <div className="flex flex-wrap gap-1.5">
                {[shot.shotType, shot.cameraAngle, shot.cameraMovement, shot.transition]
                  .filter((value) => value.trim())
                  .map((value, detailIndex) => (
                    <span
                      key={`${detailIndex}-${value}`}
                      className="rounded-md border hairline bg-black/[0.018] px-2 py-1 text-[0.65rem] text-[var(--text-muted)]"
                    >
                      {value}
                    </span>
                  ))}
              </div>
              <p className="mt-4 max-w-4xl text-[0.92rem] font-medium leading-7 text-[var(--text)] text-pretty">
                {shot.visualDescription}
              </p>
            </div>

            {onDiscuss && (
              <button
                type="button"
                onClick={onDiscuss}
                className="inline-flex shrink-0 items-center gap-2 self-start rounded-md border hairline px-2.5 py-2 text-[0.68rem] font-semibold text-[var(--text-muted)] hover:border-[var(--line-strong)] hover:text-[var(--text)]"
              >
                <MessageCircle aria-hidden="true" size={13} />
                {isShotSegmentation ? '复核这一镜' : '复核这一段'}
              </button>
            )}
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <DetailBlock
              icon={<Move3d aria-hidden="true" size={13} />}
              label="可见动作"
              value={shot.visibleAction}
            />
            <DetailBlock
              icon={<Captions aria-hidden="true" size={13} />}
              label="屏幕文字"
              value={shot.onScreenText}
            />
            <DetailBlock
              icon={<MessageSquareText aria-hidden="true" size={13} />}
              label="对白 / VO"
              value={shot.dialogue}
            />
            <DetailBlock
              icon={<Volume2 aria-hidden="true" size={13} />}
              label="原声观察"
              value={shot.existingSound}
            />
          </div>

          <details className="group mt-5 border-t hairline pt-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md py-1 text-[0.68rem] font-medium text-[var(--text-muted)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] [&::-webkit-details-marker]:hidden">
              <span className="flex min-w-0 items-center gap-2">
                <Waves aria-hidden="true" size={13} />
                <span className="truncate">声音建议 · {shot.soundCue.cue}</span>
              </span>
              <ChevronDown
                aria-hidden="true"
                size={14}
                className="shrink-0 transition-transform group-open:rotate-180"
              />
            </summary>

            <div className="mt-4 rounded-lg bg-black/[0.025] p-4">
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-md border hairline px-2 py-1 text-[0.62rem] font-semibold text-[var(--text-secondary)]">
                  {priorityLabels[shot.soundCue.priority]}
                </span>
                <span className="rounded-md border hairline px-2 py-1 text-[0.62rem] text-[var(--text-muted)]">
                  {routeLabels[shot.soundCue.route]}
                </span>
                <span className="rounded-md border hairline px-2 py-1 text-[0.62rem] text-[var(--text-muted)]">
                  {diegeticLabels[shot.soundCue.diegeticStatus]}
                </span>
              </div>

              <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <dt className="text-[0.64rem] text-[var(--text-muted)]">叙事功能</dt>
                  <dd className="mt-1.5 text-[0.74rem] leading-5 text-[var(--text-secondary)]">
                    {shot.soundCue.function}
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.64rem] text-[var(--text-muted)]">声音性格</dt>
                  <dd className="mt-1.5 text-[0.74rem] leading-5 text-[var(--text-secondary)]">
                    {shot.soundCue.character}
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.64rem] text-[var(--text-muted)]">混音风险</dt>
                  <dd className="mt-1.5 text-[0.74rem] leading-5 text-[var(--text-secondary)]">
                    {shot.soundCue.mixRisk}
                  </dd>
                </div>
              </dl>
            </div>
          </details>
        </div>
      </div>
    </article>
  );
}

function DiagnosticOverview({ analysis }: { analysis: VideoAnalysisResult }) {
  const { strengths, topIssues } = analysis.editReview;

  return (
    <section aria-labelledby="diagnostic-overview-title">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Editorial diagnosis</p>
          <h2
            id="diagnostic-overview-title"
            className="mt-2 text-xl font-semibold tracking-[-0.04em]"
          >
            诊断总览
          </h2>
        </div>
        <p className="max-w-md text-xs leading-5 text-[var(--text-muted)]">
          先识别有效表达，再处理影响观看体验的核心问题。
        </p>
      </div>

      <div className="mt-6 grid overflow-hidden rounded-xl border hairline lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        <div className="border-b hairline p-5 lg:border-b-0">
          <p className="flex items-center gap-2 text-[0.7rem] font-semibold text-[var(--text-secondary)]">
            <span className="grid h-6 w-6 place-items-center rounded-full accent-surface accent-text">
              <Check aria-hidden="true" size={13} />
            </span>
            已经成立
          </p>
          <ul className="mt-4 space-y-3">
            {strengths.map((strength, index) => (
              <li
                key={`${index}-${strength}`}
                className="flex gap-3 text-[0.78rem] leading-6 text-[var(--text-secondary)]"
              >
                <CircleDot aria-hidden="true" size={12} className="mt-1.5 shrink-0 accent-text" />
                {strength}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-black/[0.018] p-5">
          <p className="flex items-center gap-2 text-[0.7rem] font-semibold text-[var(--text-secondary)]">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-black/[0.065] text-[var(--text-secondary)]">
              <AlertCircle aria-hidden="true" size={13} />
            </span>
            优先处理
          </p>
          <ol className="mt-4 space-y-3">
            {topIssues.map((issue, index) => (
              <li
                key={`${index}-${issue}`}
                className="grid grid-cols-[1.4rem_minmax(0,1fr)] gap-3 text-[0.78rem] leading-6 text-[var(--text-secondary)]"
              >
                <span className="data-value pt-0.5 text-[0.65rem] text-[var(--text-muted)]">
                  {String(index + 1).padStart(2, '0')}
                </span>
                {issue}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function RhythmReview({
  analysis,
  canSeek,
  onSeek,
}: {
  analysis: VideoAnalysisResult;
  canSeek: boolean;
  onSeek: (timeInSeconds: number) => void;
}) {
  const points = analysis.editReview.rhythm;

  return (
    <section className="border-y hairline py-7" aria-labelledby="rhythm-review-title">
      <div className="grid gap-6 lg:grid-cols-[minmax(15rem,0.72fr)_minmax(0,1.28fr)] lg:items-end">
        <div>
          <p className="eyebrow">Pacing map</p>
          <h2 id="rhythm-review-title" className="mt-2 text-xl font-semibold tracking-[-0.04em]">
            节奏走势
          </h2>
          <p className="mt-4 text-[0.8rem] leading-6 text-[var(--text-secondary)] text-pretty">
            {analysis.editReview.rhythmSummary}
          </p>
        </div>

        {points.length > 0 && (
          <div>
            <div
              className="flex h-28 items-end gap-1 border-b hairline px-1"
              aria-label="视频节奏强度图"
            >
              {points.map((point, index) => {
                const intensity = Math.min(5, Math.max(1, point.intensity));
                const duration = Math.max(0.1, point.endSeconds - point.startSeconds);

                return (
                  <button
                    key={`${point.startSeconds}-${point.endSeconds}-${index}`}
                    type="button"
                    onClick={() => onSeek(point.startSeconds)}
                    disabled={!canSeek}
                    aria-label={`${formatTimestamp(point.startSeconds)} 至 ${formatTimestamp(point.endSeconds)}，${point.label}，强度 ${intensity} / 5`}
                    className="min-w-2 rounded-t-sm bg-[var(--accent)] transition-opacity hover:opacity-100 disabled:cursor-not-allowed"
                    style={{
                      flexGrow: duration,
                      height: `${16 + intensity * 16}%`,
                      opacity: 0.28 + intensity * 0.13,
                    }}
                  />
                );
              })}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {points.map((point, index) => (
                <div
                  key={`${point.label}-${index}`}
                  className="grid grid-cols-[4.8rem_minmax(0,1fr)] gap-3 text-[0.67rem] leading-5"
                >
                  <span className="font-mono text-[var(--text-muted)]">
                    {formatTimestamp(point.startSeconds)}
                  </span>
                  <span className="text-[var(--text-secondary)]">
                    <strong className="font-semibold text-[var(--text)]">{point.label}</strong>
                    <span className="text-[var(--text-muted)]">
                      {' '}
                      · 强度 {point.intensity}/5 · {point.description}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function VisualFinishReview({ analysis }: { analysis: VideoAnalysisResult }) {
  const { visualFinish } = analysis.editReview;
  const items = [
    {
      icon: <Image aria-hidden="true" size={15} />,
      label: '构图与连续性',
      value: visualFinish.compositionAndContinuity,
    },
    {
      icon: <Paintbrush aria-hidden="true" size={15} />,
      label: '色彩与曝光',
      value: visualFinish.colorAndExposure,
    },
    {
      icon: <WandSparkles aria-hidden="true" size={15} />,
      label: '效果与动态包装',
      value: visualFinish.vfxAndMotion,
    },
    {
      icon: <Type aria-hidden="true" size={15} />,
      label: '字体与品牌',
      value: visualFinish.typographyAndBranding,
    },
  ];

  return (
    <section aria-labelledby="visual-finish-title">
      <p className="eyebrow">Visual finish</p>
      <h2 id="visual-finish-title" className="mt-2 text-xl font-semibold tracking-[-0.04em]">
        画面完成度
      </h2>
      <div className="mt-6 grid gap-px overflow-hidden rounded-xl border hairline bg-[var(--line)] sm:grid-cols-2">
        {items.map((item) => (
          <article key={item.label} className="bg-[var(--canvas-soft)] p-5">
            <div className="flex items-center gap-2.5 text-[0.7rem] font-semibold text-[var(--text)]">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-black/[0.045] text-[var(--text-muted)]">
                {item.icon}
              </span>
              {item.label}
            </div>
            <p className="mt-4 text-[0.78rem] leading-6 text-[var(--text-secondary)] text-pretty">
              {item.value}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function EditActionList({
  analysis,
  canSeek,
  onSeek,
}: {
  analysis: VideoAnalysisResult;
  canSeek: boolean;
  onSeek: (timeInSeconds: number) => void;
}) {
  const recommendations = [...analysis.editReview.recommendations].sort(
    (left, right) =>
      priorityOrder[left.priority] - priorityOrder[right.priority] ||
      left.startSeconds - right.startSeconds,
  );

  return (
    <section aria-labelledby="edit-actions-title">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Action list</p>
          <h2 id="edit-actions-title" className="mt-2 text-xl font-semibold tracking-[-0.04em]">
            剪辑优化清单
          </h2>
        </div>
        <p className="text-xs text-[var(--text-muted)]">按优先级排序 · 每项可回看对应时间码</p>
      </div>

      <div className="mt-6 divide-y hairline border-y hairline">
        {recommendations.map((recommendation, index) => (
          <article
            key={`${recommendation.startSeconds}-${recommendation.category}-${index}`}
            className="grid gap-4 py-5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-6"
          >
            <div>
              <button
                type="button"
                onClick={() => onSeek(recommendation.startSeconds)}
                disabled={!canSeek}
                className="group inline-flex items-center gap-2 rounded-md font-mono text-[0.68rem] font-semibold text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {formatTimestamp(recommendation.startSeconds)}–
                {formatTimestamp(recommendation.endSeconds)}
                <ArrowRight
                  aria-hidden="true"
                  size={12}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </button>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span
                  className={`rounded-md px-2 py-1 text-[0.7rem] font-semibold ${
                    recommendation.priority === 'high'
                      ? 'accent-surface accent-text'
                      : 'bg-black/[0.045] text-[var(--text-muted)]'
                  }`}
                >
                  {editPriorityLabels[recommendation.priority]}
                </span>
                <span className="rounded-md border hairline px-2 py-1 text-[0.7rem] text-[var(--text-muted)]">
                  {editCategoryLabels[recommendation.category]}
                </span>
              </div>
            </div>

            <div className="min-w-0">
              <h3 className="text-[0.9rem] font-semibold leading-6 text-[var(--text)]">
                {recommendation.action}
              </h3>
              <p className="mt-2 text-[0.74rem] leading-5 text-[var(--text-muted)]">
                依据：{recommendation.evidence}
              </p>
              <p className="mt-2 flex gap-2 text-[0.74rem] leading-5 text-[var(--text-secondary)]">
                <Sparkles aria-hidden="true" size={13} className="mt-1 shrink-0 accent-text" />
                {recommendation.expectedImpact}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SeedAudioHandoff({
  analysis,
  isGenerating,
  onGenerate,
  seedAudioError,
}: {
  analysis: VideoAnalysisResult;
  isGenerating: boolean;
  onGenerate?: () => Promise<void>;
  seedAudioError?: string | null;
}) {
  const { seedAudio } = analysis;

  if (!seedAudio) {
    return (
      <section
        className="rounded-xl border hairline bg-black/[0.018] p-5 sm:p-6"
        aria-labelledby="seed-audio-on-demand-title"
      >
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="eyebrow">Optional handoff</p>
            <h2 id="seed-audio-on-demand-title" className="mt-2 text-base font-semibold">
              需要时再准备 SeedAudio
            </h2>
            <p className="mt-2 max-w-xl text-[0.74rem] leading-5 text-[var(--text-muted)]">
              视频诊断已经完成。只有进入声音生成阶段时，才需要创建平台适配 Prompt。
            </p>
          </div>
          <button
            type="button"
            onClick={onGenerate}
            disabled={!onGenerate || isGenerating}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--text)] px-4 text-[0.72rem] font-semibold text-[var(--canvas)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Sparkles aria-hidden="true" size={14} />
            {isGenerating ? '正在生成…' : '生成 SeedAudio 方案'}
          </button>
        </div>
        {seedAudioError && (
          <p role="alert" className="mt-4 text-[0.7rem] leading-5 text-[var(--text-secondary)]">
            {seedAudioError}
          </p>
        )}
      </section>
    );
  }

  return (
    <details className="group report-band" aria-labelledby="seed-audio-brief-title">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-5 p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:p-7 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="eyebrow block">Optional · SeedAudio handoff</span>
          <span id="seed-audio-brief-title" className="mt-2 block text-base font-semibold">
            生成平台交付方案
          </span>
        </span>
        <span className="flex items-center gap-3">
          <span className="hidden rounded-md border hairline px-2.5 py-1.5 text-[0.64rem] text-[var(--text-muted)] sm:inline-flex">
            {deliveryModeLabels[seedAudio.recommendedMode]}
          </span>
          <ChevronDown
            aria-hidden="true"
            size={16}
            className="text-[var(--text-muted)] transition-transform group-open:rotate-180"
          />
        </span>
      </summary>

      <div className="grid border-t hairline lg:grid-cols-[0.72fr_1.28fr]">
        <div className="border-b hairline p-5 sm:p-7 lg:border-r lg:border-b-0">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-md accent-surface px-2.5 py-1.5 text-[0.66rem] font-bold accent-text">
              {deliveryModeLabels[seedAudio.recommendedMode]}
            </span>
            <span className="rounded-md border hairline px-2.5 py-1.5 font-mono text-[0.66rem] text-[var(--text-muted)]">
              {contentModeLabels[seedAudio.contentMode]}
            </span>
          </div>

          <p className="mt-5 text-[0.78rem] leading-6 text-[var(--text-secondary)] text-pretty">
            {seedAudio.projectContext}
          </p>

          {seedAudio.avoid.length > 0 && (
            <div className="mt-6 border-t hairline pt-5">
              <p className="flex items-center gap-2 text-[0.68rem] font-medium text-[var(--text-muted)]">
                <ShieldAlert aria-hidden="true" size={14} />
                避免
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {seedAudio.avoid.map((item, index) => (
                  <span
                    key={`${index}-${item}`}
                    className="rounded-md border hairline px-2 py-1 text-[0.64rem] text-[var(--text-muted)]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-5 sm:p-7">
          <div className="grid gap-5 sm:grid-cols-2">
            <DetailBlock
              icon={<Mic2 aria-hidden="true" size={13} />}
              label="Speaker / VO"
              value={seedAudio.speakerVo}
            />
            <DetailBlock
              icon={<Music2 aria-hidden="true" size={13} />}
              label="Music"
              value={seedAudio.music}
            />
            <DetailBlock
              icon={<Sparkles aria-hidden="true" size={13} />}
              label="SFX / Ambience"
              value={seedAudio.sfxAmbience}
            />
            <DetailBlock
              icon={<Volume2 aria-hidden="true" size={13} />}
              label="Mix"
              value={seedAudio.mix}
            />
          </div>

          <div className="mt-6 rounded-xl bg-[#18201a] p-5 text-[#eef3ef]">
            <div className="flex items-center justify-between gap-4">
              <p className="flex items-center gap-2 text-[0.67rem] font-semibold text-emerald-200">
                <Sparkles aria-hidden="true" size={13} />
                SeedAudio text_prompt
              </p>
              <span className="font-mono text-[0.62rem] text-white/45">
                {seedAudio.textPrompt.length} / 2048
              </span>
            </div>
            <p className="mt-4 font-mono text-[0.73rem] leading-6 text-white/80 text-pretty">
              {seedAudio.textPrompt}
            </p>
          </div>
        </div>
      </div>
    </details>
  );
}

export default function VideoAnalysisReport({
  analysis,
  file,
  isGeneratingSeedAudio = false,
  onDiscussShot,
  onGenerateSeedAudio,
  seedAudioError,
}: VideoAnalysisReportProps) {
  const previewRef = useRef<VideoPreviewRef>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const isShotSegmentation = analysis.segmentation.mode === 'shot';
  const detection = analysis.segmentation.detection;
  const analysisUnitLabel = isShotSegmentation ? '候选镜头' : '分析段落';
  const activeShotIndex = useMemo(
    () =>
      analysis.shots.findIndex(
        (shot) => currentTime >= shot.startSeconds && currentTime < shot.endSeconds,
      ),
    [analysis.shots, currentTime],
  );

  const seekToShot = (shot: VideoShot) => {
    previewRef.current?.seekTo(shot.startSeconds);
    setCurrentTime(shot.startSeconds);
  };

  return (
    <div className="space-y-7">
      <section className="grid gap-7 border-b hairline pb-7 lg:grid-cols-[minmax(0,1.12fr)_minmax(19rem,0.88fr)] lg:items-start">
        <VideoPreview ref={previewRef} file={file} onTimeChange={setCurrentTime} />

        <div className="lg:pt-1">
          <p className="eyebrow">Video reading</p>
          <h2 className="mt-3 flex items-center gap-2.5 text-2xl font-semibold tracking-[-0.045em]">
            <Film aria-hidden="true" size={20} className="accent-text" />
            审片摘要
          </h2>
          <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)] text-pretty">
            {analysis.summary}
          </p>

          <div className="mt-6 border-t hairline pt-5">
            <p className="text-[0.68rem] font-medium text-[var(--text-muted)]">叙事弧线</p>
            <p className="mt-2 text-[0.8rem] leading-6 text-[var(--text-secondary)] text-pretty">
              {analysis.narrativeArc}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-1.5">
            {analysis.visualStyle.map((style, index) => (
              <span
                key={`${index}-${style}`}
                className="rounded-md border hairline bg-black/[0.018] px-2.5 py-1.5 text-[0.68rem] text-[var(--text-secondary)]"
              >
                {style}
              </span>
            ))}
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-4 border-t hairline pt-5">
            <div>
              <dt className="text-[0.64rem] text-[var(--text-muted)]">片长</dt>
              <dd className="data-value mt-1.5 text-sm">
                {formatTimestamp(analysis.durationSeconds)}
              </dd>
            </div>
            <div>
              <dt className="text-[0.64rem] text-[var(--text-muted)]">{analysisUnitLabel}</dt>
              <dd className="data-value mt-1.5 text-sm">{analysis.shots.length}</dd>
            </div>
          </dl>
        </div>
      </section>

      {(detection || !isShotSegmentation) && (
        <section
          aria-label="时间线识别依据"
          className="rounded-lg border hairline bg-black/[0.018] px-4 py-4 sm:px-5"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-[0.72rem] font-semibold text-[var(--text)]">
                {detection ? '两阶段时间线' : '镜头总数未可靠确认'}
              </p>
              <p className="mt-1.5 text-[0.72rem] leading-5 text-[var(--text-muted)] text-pretty">
                {analysis.segmentation.note}
              </p>
            </div>
            {detection && (
              <dl className="grid shrink-0 grid-cols-3 gap-x-5 border-t hairline pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                <div>
                  <dt className="text-[0.58rem] text-[var(--text-muted)]">切点采样</dt>
                  <dd className="data-value mt-1 text-xs text-[var(--text)]">
                    {detection.sampleRateFps} FPS
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.58rem] text-[var(--text-muted)]">检测切点</dt>
                  <dd className="data-value mt-1 text-xs text-[var(--text)]">
                    {detection.detectedCuts}
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.58rem] text-[var(--text-muted)]">覆盖置信</dt>
                  <dd className="mt-1 text-xs font-semibold text-[var(--text)]">
                    {detection.confidence === 'high'
                      ? '高'
                      : detection.confidence === 'medium'
                        ? '中'
                        : '低'}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </section>
      )}

      <DiagnosticOverview analysis={analysis} />

      <RhythmReview
        analysis={analysis}
        canSeek={Boolean(file)}
        onSeek={(timeInSeconds) => {
          previewRef.current?.seekTo(timeInSeconds);
          setCurrentTime(timeInSeconds);
        }}
      />

      <VisualFinishReview analysis={analysis} />

      <EditActionList
        analysis={analysis}
        canSeek={Boolean(file)}
        onSeek={(timeInSeconds) => {
          previewRef.current?.seekTo(timeInSeconds);
          setCurrentTime(timeInSeconds);
        }}
      />

      <section aria-labelledby="segment-review-title">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">{isShotSegmentation ? 'Shot review' : 'Sequence review'}</p>
            <h2 id="segment-review-title" className="mt-2 text-xl font-semibold tracking-[-0.04em]">
              {isShotSegmentation ? '逐镜复核' : '段落复核'}
            </h2>
          </div>
          <p className="max-w-md text-xs leading-5 text-[var(--text-muted)]">
            {isShotSegmentation
              ? '点击时间码或时间轴片段回看原片；逐镜检查画面、动作、节奏与转场是否成立。'
              : '点击时间码或时间轴片段回看原片；按段检查画面、动作、节奏与转场是否成立。'}
          </p>
        </div>

        {analysis.shots.length > 0 ? (
          <>
            <div className="mt-6 flex h-11 gap-1" aria-label={`${analysisUnitLabel}时间轴`}>
              {analysis.shots.map((shot, index) => (
                <button
                  key={`${shot.startSeconds}-${shot.endSeconds}-${index}`}
                  type="button"
                  onClick={() => seekToShot(shot)}
                  disabled={!file}
                  aria-label={`跳转至${analysisUnitLabel} ${index + 1}，${formatRange(shot)}`}
                  aria-pressed={activeShotIndex === index}
                  title={`${formatRange(shot)} · ${shot.shotType}`}
                  className={`min-w-2 rounded-[0.25rem] border disabled:cursor-not-allowed disabled:opacity-45 ${
                    activeShotIndex === index
                      ? 'border-[var(--accent)] bg-[var(--accent)]'
                      : 'hairline bg-black/[0.045] hover:border-[var(--line-strong)] hover:bg-black/[0.075]'
                  }`}
                  style={{ flexGrow: getShotDuration(shot) }}
                />
              ))}
            </div>

            <div className="mt-2">
              {analysis.shots.map((shot, index) => (
                <ShotCard
                  key={`${shot.startSeconds}-${shot.endSeconds}-${index}`}
                  active={activeShotIndex === index}
                  canSeek={Boolean(file)}
                  index={index}
                  isShotSegmentation={isShotSegmentation}
                  shot={shot}
                  onSeek={() => seekToShot(shot)}
                  onDiscuss={onDiscussShot ? () => onDiscussShot(shot) : undefined}
                />
              ))}
            </div>
          </>
        ) : (
          <p className="mt-6 border-y hairline py-6 text-sm text-[var(--text-muted)]">
            本次分析没有返回可用{analysisUnitLabel}。
          </p>
        )}
      </section>

      {analysis.risks.length > 0 && (
        <section className="border-y hairline py-5" aria-labelledby="video-risks-title">
          <div className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
            <div>
              <p className="eyebrow">Production risks</p>
              <h2 id="video-risks-title" className="mt-2 text-sm font-semibold">
                制作提醒
              </h2>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {analysis.risks.map((risk, index) => (
                <li
                  key={`${index}-${risk}`}
                  className="flex gap-2.5 text-[0.74rem] leading-5 text-[var(--text-secondary)]"
                >
                  <ShieldAlert
                    aria-hidden="true"
                    size={13}
                    className="mt-1 shrink-0 text-[var(--text-muted)]"
                  />
                  {risk}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <SeedAudioHandoff
        analysis={analysis}
        isGenerating={isGeneratingSeedAudio}
        onGenerate={onGenerateSeedAudio}
        seedAudioError={seedAudioError}
      />
    </div>
  );
}

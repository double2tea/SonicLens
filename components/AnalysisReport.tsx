import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import {
  ArrowUpRight,
  ChevronRight,
  Clock3,
  Disc3,
  Gauge,
  Headphones,
  Layers3,
  Scissors,
  Tag,
  Waves,
} from 'lucide-react';
import { formatTimestamp, parseTimestampRange } from '../services/timecode';
import { snapTimeToTransient } from '../services/transientDetection';
import { generateSeedAudioBrief } from '../services/geminiService';
import type {
  AnalysisResult,
  MusicAnalysisResult,
  SimilarTrack,
  SonicProfile,
  SfxAnalysisResult,
  VideoAnalysisResult,
  VideoShot,
} from '../types';
import AnalysisAgent from './AnalysisAgent';
import AnalysisAgentDialog from './AnalysisAgentDialog';
import AnalysisVisualizer from './AnalysisVisualizer';
import ExportMenu from './ExportMenu';
import PromptGenerator from './PromptGenerator';
import ReferenceTrackLinks from './ReferenceTrackLinks';
import SignalStoryline from './SignalStoryline';
import StockLinks from './StockLinks';
import VideoAnalysisReport from './VideoAnalysisReport';
import WaveformPlayer from './WaveformPlayer';
import type { WaveformPlayerRef } from './WaveformPlayer';

interface AnalysisReportProps {
  analysis: AnalysisResult;
  agentMediaFile: File | null;
  agentMediaIsProxy: boolean;
  contentRef: RefObject<HTMLDivElement | null>;
  file: File | null;
  fileName: string;
  isPreparingRange: boolean;
  onAnalyzeRange: (start: number, end: number) => Promise<void>;
  onAnalysisChange?: (sourceIdentity: string, analysis: AnalysisResult) => void;
  processingSummary: string;
  reportIdentity: string;
}

interface MetricProps {
  label: string;
  value: string;
}

function Metric({ label, value }: MetricProps) {
  return (
    <div className="min-w-0 border-l hairline pl-4">
      <dt className="text-[0.68rem] font-medium text-[var(--text-muted)]">{label}</dt>
      <dd className="data-value mt-1.5 text-[0.95rem] leading-5 text-[var(--text)]">
        {value || '—'}
      </dd>
    </div>
  );
}

function Tags({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-md border hairline bg-black/[0.018] px-2.5 py-1.5 text-[0.72rem] text-[var(--text-secondary)]"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

const profileRows: Array<{ key: keyof SonicProfile; label: string }> = [
  { key: 'energy', label: '能量' },
  { key: 'happiness', label: '愉悦' },
  { key: 'acousticness', label: '声学' },
  { key: 'intensity', label: '激烈' },
  { key: 'instrumental', label: '器乐' },
];

function ProfileBars({ profile }: { profile: SonicProfile }) {
  return (
    <dl className="space-y-3">
      {profileRows.map(({ key, label }) => {
        const value = profile[key];
        return (
          <div key={key} className="grid grid-cols-[3rem_1fr_2.1rem] items-center gap-3">
            <dt className="text-[0.72rem] text-[var(--text-muted)]">{label}</dt>
            <dd className="h-1 overflow-hidden rounded-full bg-black/[0.11]">
              <span
                className="block h-full rounded-full bg-[var(--accent)]"
                style={{ width: `${value}%` }}
              />
            </dd>
            <dd className="data-value text-right text-[0.7rem] text-[var(--text-secondary)]">
              {(value / 10).toFixed(1)}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

interface MusicReportProps {
  analysis: MusicAnalysisResult;
  calibrateTime: (timeInSeconds: number) => number;
  isPlayable: boolean;
  onPreviewCue: (timeInSeconds: number) => void;
  onPreviewSegment: (startInSeconds: number, endInSeconds: number) => void;
  transientCount: number;
}

function MusicReport({
  analysis,
  calibrateTime,
  isPlayable,
  onPreviewCue,
  onPreviewSegment,
  transientCount,
}: MusicReportProps) {
  const cuePoints = analysis.editorCuePoints ?? [];
  const segments = analysis.segments ?? [];

  return (
    <>
      {(cuePoints.length > 0 || segments.length > 0) && (
        <SignalStoryline
          calibrateTime={calibrateTime}
          cuePoints={cuePoints}
          isPlayable={isPlayable}
          onPreviewCue={onPreviewCue}
          onPreviewSegment={onPreviewSegment}
          segments={segments}
          transientCount={transientCount}
        />
      )}

      <section className="report-band mt-6" aria-labelledby="sound-profile-title">
        <div className="grid lg:grid-cols-[1.04fr_0.96fr]">
          <div className="border-b hairline p-5 sm:p-7 lg:border-r lg:border-b-0">
            <p className="eyebrow">Listening notes</p>
            <h2 id="sound-profile-title" className="mt-2 text-xl font-semibold tracking-[-0.04em]">
              声音画像
            </h2>
            <p className="mt-4 max-w-2xl text-[0.82rem] leading-6 text-[var(--text-secondary)] text-pretty">
              {analysis.educationalContext}
            </p>

            {analysis.mood && analysis.mood.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-[0.7rem] font-medium text-[var(--text-muted)]">情绪</p>
                <Tags items={analysis.mood} />
              </div>
            )}
            {analysis.instruments.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-[0.7rem] font-medium text-[var(--text-muted)]">
                  乐器与声部
                </p>
                <Tags items={analysis.instruments} />
              </div>
            )}
          </div>

          <div className="p-5 sm:p-7">
            <p className="eyebrow">Sonic profile</p>
            {analysis.sonicProfile ? (
              <div className="mt-3 grid items-center gap-4 sm:grid-cols-[1.08fr_0.92fr]">
                <AnalysisVisualizer profile={analysis.sonicProfile} />
                <ProfileBars profile={analysis.sonicProfile} />
              </div>
            ) : (
              <p className="mt-5 text-xs text-[var(--text-muted)]">本次未返回声学雷达数据</p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function SimilarTracksPanel({ tracks }: { tracks: SimilarTrack[] }) {
  return (
    <div className="grid gap-px overflow-hidden rounded-lg border hairline bg-[var(--line)] md:grid-cols-2">
      {tracks.map((track) => (
        <article key={`${track.artist}-${track.title}`} className="bg-[var(--canvas-soft)] p-4">
          <div className="flex gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-black/[0.045] text-[var(--text-muted)]">
              <Disc3 size={15} />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold">{track.title}</h3>
              <p className="mt-1 truncate text-xs text-[var(--text-muted)]">{track.artist}</p>
            </div>
          </div>
          <ReferenceTrackLinks track={track} />
        </article>
      ))}
    </div>
  );
}

function SfxReport({ analysis }: { analysis: SfxAnalysisResult }) {
  return (
    <>
      <section className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="report-band p-5 sm:p-7">
          <p className="eyebrow">UCS classification</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em]">声音身份</h2>
          <div className="mt-6 space-y-5">
            <div>
              <p className="text-xs text-[var(--text-muted)]">UCS Cat ID</p>
              <p className="data-value mt-2 text-lg accent-text">{analysis.sfx.ucsCatId}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t hairline pt-5">
              <div>
                <p className="text-xs text-[var(--text-muted)]">分类</p>
                <p className="mt-2 text-sm">{analysis.sfx.ucsCategory}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">子分类</p>
                <p className="mt-2 text-sm">{analysis.sfx.ucsSubCategory}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="report-band p-5 sm:p-7">
          <p className="eyebrow">Acoustic reading</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em]">声音原理</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)] text-pretty">
            {analysis.educationalContext}
          </p>
          <div className="mt-6 border-t hairline pt-5">
            <p className="mb-3 text-xs text-[var(--text-muted)]">来源与材质</p>
            <Tags items={analysis.instruments} />
          </div>
        </div>
      </section>

      <section className="report-band mt-6 p-5 sm:p-7" aria-labelledby="foley-title">
        <p className="eyebrow">Foley plan</p>
        <h2 id="foley-title" className="mt-2 text-xl font-semibold tracking-[-0.04em]">
          拟音方案
        </h2>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <p className="text-xs font-medium text-[var(--text-muted)]">实作步骤</p>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)] text-pretty">
              {analysis.sfx.foleyInstructions}
            </p>
          </div>
          <div className="border-t hairline pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
            <p className="text-xs font-medium text-[var(--text-muted)]">可用替代物</p>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              {analysis.sfx.accessibleAlternatives}
            </p>
          </div>
        </div>
        <div className="mt-6 border-t hairline pt-5">
          <p className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
            <Scissors size={14} className="accent-text" />
            音画同步建议
          </p>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-[var(--text-secondary)]">
            {analysis.sfx.visualSyncTips}
          </p>
        </div>
      </section>
    </>
  );
}

type UtilityView = 'prompt' | 'references' | 'stock';

export default function AnalysisReport({
  analysis,
  agentMediaFile,
  agentMediaIsProxy,
  contentRef,
  file,
  fileName,
  isPreparingRange,
  onAnalyzeRange,
  onAnalysisChange,
  processingSummary,
  reportIdentity,
}: AnalysisReportProps) {
  const playerRef = useRef<WaveformPlayerRef>(null);
  const [activeUtility, setActiveUtility] = useState<UtilityView | null>(null);
  const [transientCandidates, setTransientCandidates] = useState<number[]>([]);
  const [agentInput, setAgentInput] = useState('');
  const [isAgentOpen, setIsAgentOpen] = useState(false);
  const [isGeneratingSeedAudio, setIsGeneratingSeedAudio] = useState(false);
  const [seedAudioError, setSeedAudioError] = useState<string | null>(null);
  const seedAudioControllerRef = useRef<AbortController | null>(null);
  const isMusic = analysis.type === 'music';
  const isVideo = analysis.type === 'video';
  const title = isMusic ? analysis.mainGenre : isVideo ? analysis.title : analysis.sfx.name;
  const timelineDuration = isMusic
    ? Math.max(
        0,
        ...(analysis.segments ?? []).map((segment) => parseTimestampRange(segment.timestamp).end),
      )
    : 0;

  const previewCue = (timeInSeconds: number) => playerRef.current?.previewAround(timeInSeconds);
  const previewSegment = (startInSeconds: number, endInSeconds: number) =>
    playerRef.current?.previewRange(startInSeconds, endInSeconds);
  const calibrateTime = (timeInSeconds: number) =>
    snapTimeToTransient(timeInSeconds, transientCandidates);
  const similarTracks = isMusic ? (analysis.similarTracks ?? []) : [];
  const audioPrompt = isVideo ? undefined : analysis.optimizedPrompt;
  const videoReportAnalysis: VideoAnalysisResult | null = isVideo ? analysis : null;
  const reportAnalysis: AnalysisResult = videoReportAnalysis ?? analysis;
  const isShotSegmentation = videoReportAnalysis?.segmentation.mode === 'shot';
  const highestVideoPriority = videoReportAnalysis
    ? videoReportAnalysis.editReview.recommendations.length === 0
      ? videoReportAnalysis.editReview.verdict?.status === 'ready'
        ? '无需修改'
        : '待复核'
      : videoReportAnalysis.editReview.recommendations.some(({ priority }) => priority === 'high')
        ? '高'
        : videoReportAnalysis.editReview.recommendations.some(
              ({ priority }) => priority === 'medium',
            )
          ? '中'
          : '低'
    : '';

  useEffect(() => {
    return () => seedAudioControllerRef.current?.abort();
  }, [analysis]);

  const discussShot = (shot: VideoShot) => {
    const reviewUnit = isShotSegmentation ? '这一镜' : '这一段';
    setAgentInput(
      `请复核 ${formatTimestamp(shot.startSeconds)}–${formatTimestamp(shot.endSeconds)} ${reviewUnit}的画面表达、节奏、转场与剪辑衔接，并给出有时间码依据的优化建议。`,
    );
    setIsAgentOpen(true);
  };

  const generateVideoSeedAudio = async () => {
    if (!videoReportAnalysis) return;

    seedAudioControllerRef.current?.abort();
    const controller = new AbortController();
    seedAudioControllerRef.current = controller;
    setIsGeneratingSeedAudio(true);
    setSeedAudioError(null);
    try {
      const seedAudio = await generateSeedAudioBrief(videoReportAnalysis, controller.signal);
      controller.signal.throwIfAborted();
      const updatedAnalysis: VideoAnalysisResult = { ...videoReportAnalysis, seedAudio };
      onAnalysisChange?.(reportIdentity, updatedAnalysis);
    } catch (error) {
      if (controller.signal.aborted) return;
      setSeedAudioError(error instanceof Error ? error.message : 'SeedAudio 方案生成失败');
    } finally {
      if (seedAudioControllerRef.current === controller) {
        seedAudioControllerRef.current = null;
        setIsGeneratingSeedAudio(false);
      }
    }
  };

  const utilityItems: Array<{ id: UtilityView; eyebrow: string; meta: string; title: string }> = [
    ...(similarTracks.length > 0
      ? [
          {
            id: 'references' as const,
            eyebrow: 'References',
            title: '相似曲目',
            meta: `${similarTracks.length} 首曲目`,
          },
        ]
      : []),
    ...(audioPrompt
      ? [
          {
            id: 'prompt' as const,
            eyebrow: 'Prompt workshop',
            title: '生成声音变体',
            meta: '已配置',
          },
        ]
      : []),
    ...(!isVideo
      ? [
          {
            id: 'stock' as const,
            eyebrow: 'Source library',
            title: '查找相似素材',
            meta: '4 个类别',
          },
        ]
      : []),
  ];

  return (
    <div ref={contentRef} className="fade-up pb-12">
      <section className="report-hero">
        <div className="flex items-center justify-between gap-5">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <span className="eyebrow">
              {isMusic ? 'Music analysis' : isVideo ? 'Video analysis' : 'SFX analysis'}
            </span>
            <span className="h-1 w-1 rounded-full bg-[var(--text-muted)]" aria-hidden="true" />
            <span className="truncate font-mono text-[0.68rem] text-[var(--text-muted)]">
              {fileName}
            </span>
          </div>
          <ExportMenu analysis={reportAnalysis} fileName={fileName} contentRef={contentRef} />
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(15rem,0.7fr)_minmax(0,1.3fr)] lg:items-end">
          <div className="min-w-0">
            <h1 className="text-4xl font-semibold leading-none tracking-[-0.055em] text-balance sm:text-5xl lg:text-[3.7rem]">
              {title}
            </h1>
            {processingSummary && (
              <p className="mt-3 text-[0.7rem] text-[var(--text-muted)]">{processingSummary}</p>
            )}
          </div>

          {isMusic ? (
            <dl className="grid grid-cols-2 gap-y-5 sm:grid-cols-3 lg:grid-cols-[0.72fr_0.72fr_0.6fr_0.62fr_1.5fr]">
              <Metric label="平均速度" value={analysis.bpm ? `${analysis.bpm} BPM` : '—'} />
              <Metric label="调式" value={analysis.key || '—'} />
              <Metric label="拍号" value={analysis.timeSignature || '—'} />
              <Metric
                label="时长"
                value={timelineDuration ? formatTimestamp(timelineDuration) : '—'}
              />
              <Metric label="律动" value={analysis.rhythmDescription || '—'} />
            </dl>
          ) : isVideo ? (
            <dl className="grid grid-cols-2 gap-y-5 sm:grid-cols-4">
              <Metric label="时长" value={formatTimestamp(analysis.durationSeconds)} />
              <Metric
                label={isShotSegmentation ? '候选镜头' : '分析段落'}
                value={String(analysis.shots.length)}
              />
              <Metric label="最高优先级" value={highestVideoPriority} />
              <Metric label="优化建议" value={`${analysis.editReview.recommendations.length} 项`} />
            </dl>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-3 text-sm">
                <Tag size={16} className="accent-text" />
                {analysis.sfx.ucsCategory}
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Waves size={16} className="accent-text" />
                {analysis.sfx.ucsSubCategory}
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Layers3 size={16} className="accent-text" />
                {analysis.instruments.length} 个声音来源
              </div>
            </div>
          )}
        </div>

        {!isVideo && file ? (
          <div className="mt-6" data-export-ignore="true">
            <WaveformPlayer
              ref={playerRef}
              file={file}
              isPreparingRange={isPreparingRange}
              onAnalyzeRange={onAnalyzeRange}
              onTransientsDetected={isMusic ? setTransientCandidates : undefined}
            />
          </div>
        ) : !isVideo ? (
          <div
            className="mt-6 flex items-start gap-3 border-y hairline py-4 text-xs leading-5 text-[var(--text-muted)]"
            data-export-ignore="true"
          >
            <Headphones size={16} className="mt-0.5 shrink-0 accent-text" />
            这条旧历史记录没有关联音频；新生成的报告会在当前浏览器保留波形与试听能力。
          </div>
        ) : null}
      </section>

      {analysis.type === 'music' ? (
        <MusicReport
          analysis={analysis}
          calibrateTime={calibrateTime}
          isPlayable={Boolean(file)}
          onPreviewCue={previewCue}
          onPreviewSegment={previewSegment}
          transientCount={transientCandidates.length}
        />
      ) : analysis.type === 'video' && videoReportAnalysis ? (
        <section className="report-band mt-6 p-5 sm:p-7">
          <VideoAnalysisReport
            analysis={videoReportAnalysis}
            file={file}
            isGeneratingSeedAudio={isGeneratingSeedAudio}
            onDiscussShot={discussShot}
            onGenerateSeedAudio={generateVideoSeedAudio}
            seedAudioError={seedAudioError}
          />
        </section>
      ) : analysis.type === 'sfx' ? (
        <SfxReport analysis={analysis} />
      ) : null}

      {utilityItems.length > 0 && (
        <section className="utility-shelf mt-6" aria-label="报告工具">
          <div className="grid divide-y hairline md:flex md:divide-x md:divide-y-0">
            {utilityItems.map((item) => {
              const isActive = activeUtility === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveUtility(isActive ? null : item.id)}
                  aria-expanded={isActive}
                  aria-controls="report-utility-panel"
                  className="group flex min-h-28 flex-1 items-center justify-between gap-5 px-5 py-5 text-left sm:px-7"
                >
                  <span>
                    <span className="eyebrow block">{item.eyebrow}</span>
                    <span className="mt-3 block text-lg font-semibold">{item.title}</span>
                    <span className="mt-1 block text-[0.72rem] text-[var(--text-muted)]">
                      {item.meta}
                    </span>
                  </span>
                  <ChevronRight
                    size={18}
                    className={`shrink-0 text-[var(--text-muted)] group-hover:accent-text ${isActive ? 'rotate-90 accent-text' : ''}`}
                  />
                </button>
              );
            })}
          </div>

          {activeUtility && (
            <div id="report-utility-panel" className="border-t hairline p-5 sm:p-7">
              {activeUtility === 'references' && similarTracks.length > 0 && (
                <SimilarTracksPanel tracks={similarTracks} />
              )}
              {activeUtility === 'prompt' && audioPrompt && !isVideo && (
                <PromptGenerator prompt={audioPrompt} type={analysis.type} embedded />
              )}
              {activeUtility === 'stock' && !isVideo && (
                <div>
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                    <div>
                      <p className="eyebrow">Source library</p>
                      <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em]">
                        查找相似素材
                      </h2>
                    </div>
                    <span className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      根据分析关键词生成搜索入口 <ArrowUpRight size={13} />
                    </span>
                  </div>
                  <StockLinks
                    keywords={analysis.keywords}
                    genre={isMusic ? analysis.mainGenre : undefined}
                    type={analysis.type}
                  />
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {videoReportAnalysis && (
        <AnalysisAgentDialog open={isAgentOpen} onOpenChange={setIsAgentOpen}>
          <AnalysisAgent
            key={reportIdentity}
            analysis={videoReportAnalysis}
            input={agentInput}
            mediaFile={agentMediaFile}
            mediaIsProxy={agentMediaIsProxy}
            onInputChange={setAgentInput}
          />
        </AnalysisAgentDialog>
      )}

      <footer className="mt-6 flex flex-wrap items-center justify-between gap-4 px-1 text-[0.62rem] text-[var(--text-muted)]">
        <span className="flex items-center gap-2">
          <Gauge size={12} />
          模型结果需要结合专业判断复核
        </span>
        <span className="flex items-center gap-2">
          <Clock3 size={12} />
          SonicLens report
        </span>
      </footer>
    </div>
  );
}

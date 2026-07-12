import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { AlertTriangle, ArrowRight, KeyRound, RotateCcw } from 'lucide-react';
import AppHeader from './components/AppHeader';
import FileUpload from './components/FileUpload';
import HistoryPanel from './components/HistoryPanel';
import ModeSelector from './components/ModeSelector';
import ProcessingView from './components/ProcessingView';
import SettingsModal from './components/SettingsModal';
import {
  cacheAnalysisHistoryItem,
  clearAnalysisHistory,
  deleteAnalysisHistoryItem,
  loadAnalysisHistory,
  toggleAnalysisHistoryFavorite,
  updateAnalysisHistoryItem,
} from './services/analysisHistory';
import type { AnalysisHistoryItem } from './services/analysisHistory';
import {
  clearAnalysisAudio,
  deleteAnalysisAudio,
  loadAnalysisAudio,
  pruneAnalysisAudio,
  saveAnalysisAudio,
} from './services/analysisAudioStore';
import { extractAudioRange, prepareAudioForAnalysis } from './services/audioUtils';
import type { AudioPreparationResult } from './services/audioUtils';
import { getGeminiRuntimeConfig, hasGeminiApiKey } from './services/geminiConfig';
import { analyzeMedia } from './services/geminiService';
import { formatTimestamp } from './services/timecode';
import { getFileSizeBucket, trackUsageEvent } from './services/usageAnalytics';
import { readVideoDuration } from './services/videoUtils';
import { AnalysisState } from './types';
import type { AnalysisMode, AnalysisResult } from './types';

const AnalysisReport = lazy(() => import('./components/AnalysisReport'));

interface AppState {
  analysis: AnalysisResult | null;
  error: string | null;
  fileName: string | null;
  mode: AnalysisMode;
  originalFile: File | null;
  processingDetail: string;
  processingSummary: string;
  processingStage: 'prepare' | 'detect' | 'analyze';
  processingTitle: string;
  status: AnalysisState;
}

type AppAction =
  | { type: 'set-mode'; mode: AnalysisMode }
  | { type: 'start'; file: File }
  | {
      type: 'progress';
      title: string;
      detail: string;
      stage?: 'prepare' | 'detect' | 'analyze';
    }
  | { type: 'analyzing'; summary: string }
  | { type: 'complete'; analysis: AnalysisResult }
  | { type: 'update-analysis'; analysis: AnalysisResult }
  | { type: 'fail'; message: string }
  | { type: 'restore'; item: AnalysisHistoryItem; file: File | null }
  | { type: 'reset' };

const initialState: AppState = {
  analysis: null,
  error: null,
  fileName: null,
  mode: 'music',
  originalFile: null,
  processingDetail: '',
  processingSummary: '',
  processingStage: 'prepare',
  processingTitle: '',
  status: AnalysisState.IDLE,
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'set-mode':
      return state.status === AnalysisState.IDLE ? { ...state, mode: action.mode } : state;
    case 'start':
      return {
        ...state,
        analysis: null,
        error: null,
        fileName: action.file.name,
        originalFile: action.file,
        processingDetail: '',
        processingSummary: '',
        processingStage: 'prepare',
        processingTitle: '正在读取媒体',
        status: AnalysisState.CONVERTING,
      };
    case 'progress':
      return {
        ...state,
        processingTitle: action.title,
        processingDetail: action.detail,
        processingStage: action.stage ?? state.processingStage,
      };
    case 'analyzing':
      return {
        ...state,
        processingDetail:
          state.mode === 'video'
            ? '模型正在诊断镜头结构、节奏、画面完成度、包装表达与声音线索。'
            : '模型正在识别结构、节奏、音色与剪辑线索。',
        processingSummary: action.summary,
        processingStage: state.mode === 'video' ? 'detect' : 'analyze',
        processingTitle: state.mode === 'video' ? '正在诊断视频结构' : '正在理解声音结构',
        status: AnalysisState.ANALYZING,
      };
    case 'complete':
      return { ...state, analysis: action.analysis, status: AnalysisState.COMPLETE };
    case 'update-analysis':
      return state.status === AnalysisState.COMPLETE
        ? { ...state, analysis: action.analysis }
        : state;
    case 'fail':
      return { ...state, error: action.message, status: AnalysisState.ERROR };
    case 'restore':
      return {
        ...state,
        analysis: action.item.analysis,
        error: null,
        fileName: action.item.fileName,
        mode: action.item.analysisMode,
        originalFile: action.file,
        processingDetail: '',
        processingSummary: action.item.processingSummary,
        processingStage: 'analyze',
        processingTitle: '',
        status: AnalysisState.COMPLETE,
      };
    case 'reset':
      return { ...initialState, mode: state.mode };
  }
};

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : '分析失败，请重试。';

const formatBytes = (bytes: number): string => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const describePreparedFile = (result: AudioPreparationResult, sourceIsVideo: boolean): string => {
  if (!result.wasTranscoded) return `原始音频 ${formatBytes(result.processedBytes)}，无需转码`;
  const source = sourceIsVideo ? '视频音轨' : '音频';
  return `${source} ${formatBytes(result.originalBytes)} → ${formatBytes(result.processedBytes)} · mono ${result.sampleRate / 1000} kHz`;
};

export default function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [analysisHistory, setAnalysisHistory] =
    useState<AnalysisHistoryItem[]>(loadAnalysisHistory);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPreparingRange, setIsPreparingRange] = useState(false);
  const [historyNotice, setHistoryNotice] = useState<string | null>(null);
  const activeJobRef = useRef<{ controller: AbortController; id: number } | null>(null);
  const nextJobIdRef = useRef(0);
  const currentHistoryItemIdRef = useRef<string | null>(null);
  const restoreRequestIdRef = useRef(0);
  const rangePreparationRef = useRef<AbortController | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const hasApiKey = hasGeminiApiKey();

  const isProcessing =
    state.status === AnalysisState.CONVERTING || state.status === AnalysisState.ANALYZING;
  const canReset = state.status !== AnalysisState.IDLE;
  const currentJobId = () => activeJobRef.current?.id;

  const stopActiveJob = useCallback(() => {
    activeJobRef.current?.controller.abort();
    activeJobRef.current = null;
    rangePreparationRef.current?.abort();
    rangePreparationRef.current = null;
    restoreRequestIdRef.current += 1;
  }, []);

  useEffect(
    () => () => {
      stopActiveJob();
    },
    [stopActiveJob],
  );

  const reset = useCallback(() => {
    stopActiveJob();
    currentHistoryItemIdRef.current = null;
    setHistoryNotice(null);
    dispatch({ type: 'reset' });
  }, [stopActiveJob]);

  const analyzeFile = useCallback(
    async (selectedFile: File) => {
      if (!hasGeminiApiKey()) {
        setIsSettingsOpen(true);
        return;
      }

      setHistoryNotice(null);
      stopActiveJob();
      currentHistoryItemIdRef.current = null;
      const job = { controller: new AbortController(), id: nextJobIdRef.current + 1 };
      nextJobIdRef.current = job.id;
      activeJobRef.current = job;
      dispatch({ type: 'start', file: selectedFile });

      const startedAt = performance.now();
      const originalSizeBucket = getFileSizeBucket(selectedFile.size);
      const config = getGeminiRuntimeConfig();
      const mode = state.mode;
      trackUsageEvent({
        eventName: 'analysis_started',
        mode,
        originalSizeBucket,
        model: config.model,
      });

      try {
        let analysisFile = selectedFile;
        let processedBytes = selectedFile.size;
        let wasTranscoded = false;
        let summary = `原始视频 ${formatBytes(selectedFile.size)} · 视频诊断与剪辑分析`;
        let videoDurationSeconds: number | undefined;

        if (mode === 'video') {
          if (selectedFile.type !== 'video/mp4') {
            throw new Error('视频分析当前仅支持 MP4 文件。');
          }
          dispatch({
            type: 'progress',
            title: '正在准备原始视频',
            detail: '保留完整画面与声音，不提取或转存帧图。',
          });
          videoDurationSeconds = await readVideoDuration(selectedFile, job.controller.signal);
          summary = `原始视频 ${formatBytes(selectedFile.size)} · ${formatTimestamp(videoDurationSeconds)} · 视频诊断与剪辑分析`;
        } else {
          const targetUploadMb = Math.min(config.audioTargetUploadMb, config.maxUploadMb);
          const preparedAudio = await prepareAudioForAnalysis(selectedFile, {
            maxBytes: targetUploadMb * 1024 * 1024,
            signal: job.controller.signal,
            onProgress: ({ title, detail }) => {
              if (currentJobId() === job.id) dispatch({ type: 'progress', title, detail });
            },
          });
          analysisFile = preparedAudio.file;
          processedBytes = preparedAudio.processedBytes;
          wasTranscoded = preparedAudio.wasTranscoded;
          summary = describePreparedFile(preparedAudio, selectedFile.type.startsWith('video/'));
        }
        job.controller.signal.throwIfAborted();

        dispatch({ type: 'analyzing', summary });
        const result = await analyzeMedia(
          analysisFile,
          mode,
          job.controller.signal,
          videoDurationSeconds,
          ({ stage, title, detail }) => {
            if (currentJobId() === job.id) {
              dispatch({ type: 'progress', stage, title, detail });
            }
          },
        );
        if (currentJobId() !== job.id) return;

        dispatch({ type: 'complete', analysis: result });
        trackUsageEvent({
          eventName: 'analysis_completed',
          mode,
          originalSizeBucket,
          processedSizeBucket: getFileSizeBucket(processedBytes),
          durationMs: Math.round(performance.now() - startedAt),
          wasTranscoded,
          model: config.model,
        });

        const nextHistory = cacheAnalysisHistoryItem({
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          analysisMode: mode,
          processingSummary: summary,
          analysis: result,
        });
        setAnalysisHistory(nextHistory);
        currentHistoryItemIdRef.current = nextHistory[0].id;
        try {
          await pruneAnalysisAudio(nextHistory.map((item) => item.id));
          if (mode === 'video') {
            setHistoryNotice('视频报告已保存；为控制空间，不保存原始视频或帧图。');
          } else {
            await saveAnalysisAudio(nextHistory[0].id, analysisFile);
            setHistoryNotice('报告、音频与波形已保存到当前浏览器。');
          }
        } catch (storageError: unknown) {
          setHistoryNotice(`报告已保存，但媒体存储清理失败：${getErrorMessage(storageError)}`);
        }
      } catch (error: unknown) {
        if (job.controller.signal.aborted || currentJobId() !== job.id) return;
        const message = getErrorMessage(error);
        trackUsageEvent({
          eventName: 'analysis_failed',
          mode,
          originalSizeBucket,
          durationMs: Math.round(performance.now() - startedAt),
          model: config.model,
          errorMessage: message,
        });
        dispatch({ type: 'fail', message });
      } finally {
        if (currentJobId() === job.id) activeJobRef.current = null;
      }
    },
    [state.mode, stopActiveJob],
  );

  const deleteHistory = async (id: string) => {
    if (currentHistoryItemIdRef.current === id) currentHistoryItemIdRef.current = null;
    setAnalysisHistory(deleteAnalysisHistoryItem(id));
    try {
      await deleteAnalysisAudio(id);
      setHistoryNotice('已删除历史报告与关联音频。');
    } catch (storageError: unknown) {
      setHistoryNotice(`历史报告已删除，但关联音频清理失败：${getErrorMessage(storageError)}`);
    }
  };

  const clearHistory = async () => {
    currentHistoryItemIdRef.current = null;
    setAnalysisHistory(clearAnalysisHistory());
    try {
      await clearAnalysisAudio();
      setHistoryNotice('历史报告与关联音频已清空。');
    } catch (storageError: unknown) {
      setHistoryNotice(`历史报告已清空，但关联音频清理失败：${getErrorMessage(storageError)}`);
    }
  };

  const toggleFavorite = (id: string) => {
    setAnalysisHistory(toggleAnalysisHistoryFavorite(id));
  };

  const restoreHistory = async (item: AnalysisHistoryItem) => {
    stopActiveJob();
    const restoreRequestId = restoreRequestIdRef.current + 1;
    restoreRequestIdRef.current = restoreRequestId;
    currentHistoryItemIdRef.current = item.id;
    if (item.analysisMode === 'video') {
      dispatch({ type: 'restore', item, file: null });
      setHistoryNotice('视频报告已恢复；原始视频与帧图不会写入历史记录。');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setHistoryNotice('正在恢复历史报告与音频…');
    try {
      const file = await loadAnalysisAudio(item.id);
      if (restoreRequestIdRef.current !== restoreRequestId) return;
      dispatch({ type: 'restore', item, file });
      setHistoryNotice(
        file ? '历史报告、音频与波形已恢复。' : '历史报告已恢复；这条旧记录没有关联音频。',
      );
    } catch (storageError: unknown) {
      if (restoreRequestIdRef.current !== restoreRequestId) return;
      dispatch({ type: 'restore', item, file: null });
      setHistoryNotice(`报告已恢复，但关联音频无法读取：${getErrorMessage(storageError)}`);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const analyzeRange = useCallback(
    async (start: number, end: number) => {
      if (!state.originalFile) {
        setHistoryNotice('当前报告没有可用于局部分析的音频。');
        return;
      }

      rangePreparationRef.current?.abort();
      const controller = new AbortController();
      rangePreparationRef.current = controller;
      setIsPreparingRange(true);
      setHistoryNotice(null);
      try {
        const rangeFile = await extractAudioRange(
          state.originalFile,
          start,
          end,
          controller.signal,
        );
        controller.signal.throwIfAborted();
        rangePreparationRef.current = null;
        await analyzeFile(rangeFile);
      } catch (error: unknown) {
        if (controller.signal.aborted) return;
        setHistoryNotice(`片段准备失败：${getErrorMessage(error)}`);
      } finally {
        if (rangePreparationRef.current === controller) rangePreparationRef.current = null;
        setIsPreparingRange(false);
      }
    },
    [analyzeFile, state.originalFile],
  );

  const retry = () => {
    if (state.originalFile) void analyzeFile(state.originalFile);
  };

  const updateAnalysis = useCallback((sourceIdentity: string, analysis: AnalysisResult) => {
    const historyItemId = currentHistoryItemIdRef.current;
    if (historyItemId !== sourceIdentity) return;
    setAnalysisHistory(updateAnalysisHistoryItem(historyItemId, analysis));
    dispatch({ type: 'update-analysis', analysis });
  }, []);

  const currentReportIdentity = state.analysis
    ? (analysisHistory.find((item) => item.analysis === state.analysis)?.id ??
      `${state.fileName}-${state.processingSummary}-${state.analysis.type}`)
    : 'idle';

  const pageDescription = useMemo(() => {
    if (state.mode === 'music') {
      return '导入音频或视频，识别曲风、段落、节奏与画面卡点；视频会在本地提取音轨。';
    }
    if (state.mode === 'sfx') {
      return '导入音频或视频，拆解声学特征、UCS 分类、拟音方法与音画同步策略。';
    }
    return '诊断镜头结构、节奏、画面完成度与包装表达，给出带时间码的剪辑优化建议。';
  }, [state.mode]);

  return (
    <div className="min-h-dvh">
      <a href="#main-content" className="skip-link">
        跳到主要内容
      </a>
      {isSettingsOpen && <SettingsModal isOpen onClose={() => setIsSettingsOpen(false)} />}
      <AppHeader
        canReset={canReset}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onReset={reset}
      />

      <main id="main-content" className="app-shell">
        {state.status === AnalysisState.IDLE && (
          <div className="fade-up py-10 sm:py-14 lg:py-16">
            <section className="mb-10 grid gap-7 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div>
                <h1 className="max-w-3xl text-[2.25rem] font-semibold leading-[1.04] tracking-[-0.05em] text-balance sm:text-5xl lg:text-[3.5rem]">
                  让视听成为
                  <br />
                  可剪辑的结构。
                </h1>
              </div>
              <div className="lg:pb-1">
                <p className="max-w-md text-sm leading-6 text-[var(--text-muted)] text-pretty">
                  {pageDescription}
                </p>
                <div className="mt-5">
                  <ModeSelector
                    mode={state.mode}
                    onChange={(mode) => dispatch({ type: 'set-mode', mode })}
                  />
                </div>
              </div>
            </section>

            {!hasApiKey && (
              <section
                className="mb-5 flex flex-col justify-between gap-3 border-y hairline py-3 sm:flex-row sm:items-center"
                aria-labelledby="api-key-required"
              >
                <div className="flex items-center gap-3">
                  <KeyRound size={15} className="shrink-0 accent-text" />
                  <div>
                    <h2 id="api-key-required" className="text-[0.8rem] font-semibold">
                      连接你自己的模型 API
                    </h2>
                    <p className="mt-0.5 text-[0.68rem] leading-5 text-[var(--text-muted)]">
                      凭证仅保存在当前浏览器
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className="accent-bg inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-bold"
                >
                  配置 API
                  <ArrowRight size={14} />
                </button>
              </section>
            )}

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(17rem,0.45fr)]">
              <FileUpload
                onFileSelect={(file) => void analyzeFile(file)}
                disabled={!hasApiKey}
                mode={state.mode}
              />
              <HistoryPanel
                items={analysisHistory}
                onRestore={(item) => void restoreHistory(item)}
                onDelete={(id) => void deleteHistory(id)}
                onClear={() => void clearHistory()}
                onToggleFavorite={toggleFavorite}
              />
            </div>

            {historyNotice && (
              <p role="status" className="mt-4 text-right text-[0.68rem] accent-text">
                {historyNotice}
              </p>
            )}
          </div>
        )}

        {isProcessing && state.fileName && (
          <ProcessingView
            title={state.processingTitle}
            detail={state.processingDetail}
            fileName={state.fileName}
            mode={state.mode}
            onCancel={reset}
            stage={state.processingStage}
          />
        )}

        {state.status === AnalysisState.ERROR && (
          <section className="mx-auto max-w-2xl py-16 sm:py-24" role="alert">
            <div className="surface p-7 sm:p-10">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[rgba(217,137,118,0.1)] text-[var(--danger)]">
                <AlertTriangle size={20} />
              </span>
              <p className="eyebrow mt-7 text-[var(--danger)]">Analysis stopped</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">这次分析没有完成</h1>
              <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">{state.error}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                {state.originalFile && (
                  <button
                    type="button"
                    onClick={retry}
                    className="accent-bg inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold"
                  >
                    <RotateCcw size={14} />
                    重试
                  </button>
                )}
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-lg border hairline px-4 py-2.5 text-xs font-semibold text-[var(--text-muted)] hover:border-[var(--line-strong)] hover:text-[var(--text)]"
                >
                  返回工作台
                </button>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className="px-3 py-2.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)]"
                >
                  检查 API 设置
                </button>
              </div>
            </div>
          </section>
        )}

        {state.status === AnalysisState.COMPLETE && state.analysis && state.fileName && (
          <div className="pt-5 sm:pt-6">
            {historyNotice && (
              <p role="status" className="mb-4 text-right text-[0.68rem] accent-text">
                {historyNotice}
              </p>
            )}
            <Suspense
              fallback={
                <div className="surface min-h-72 animate-pulse p-8" aria-label="正在载入报告">
                  <div className="h-3 w-32 rounded bg-black/[0.06]" />
                  <div className="mt-8 h-12 max-w-xl rounded bg-black/[0.06]" />
                  <div className="mt-12 h-24 rounded-xl bg-black/[0.035]" />
                </div>
              }
            >
              <AnalysisReport
                key={currentReportIdentity}
                analysis={state.analysis}
                contentRef={reportRef}
                file={state.originalFile}
                fileName={state.fileName}
                isPreparingRange={isPreparingRange}
                onAnalyzeRange={analyzeRange}
                onAnalysisChange={updateAnalysis}
                processingSummary={state.processingSummary}
                reportIdentity={currentReportIdentity}
              />
            </Suspense>
          </div>
        )}
      </main>
    </div>
  );
}

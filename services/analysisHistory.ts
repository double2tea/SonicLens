import { isAnalysisResult } from '../types';
import type { AnalysisMode, AnalysisResult, VideoAnalysisResult, VideoEditReview } from '../types';

export const ANALYSIS_HISTORY_LIMIT = 50;

const ANALYSIS_HISTORY_STORAGE_KEY = 'soniclens.analysisHistory';

export interface AnalysisHistoryItem {
  id: string;
  createdAt: string;
  fileName: string;
  fileSize: number;
  analysisMode: AnalysisMode;
  processingSummary: string;
  isFavorite: boolean;
  analysis: AnalysisResult;
}

interface AnalysisHistoryInput {
  fileName: string;
  fileSize: number;
  analysisMode: AnalysisMode;
  processingSummary: string;
  analysis: AnalysisResult;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isAnalysisMode = (value: unknown): value is AnalysisMode =>
  value === 'music' || value === 'sfx' || value === 'video';

interface LegacyVideoShotForMigration {
  startSeconds: number;
  endSeconds: number;
  shotType: string;
  cameraMovement: string;
  visibleAction: string;
  onScreenText: string;
}

const isLegacyVideoShotForMigration = (value: unknown): value is LegacyVideoShotForMigration =>
  isRecord(value) &&
  isFiniteNumber(value.startSeconds) &&
  isFiniteNumber(value.endSeconds) &&
  typeof value.shotType === 'string' &&
  typeof value.cameraMovement === 'string' &&
  typeof value.visibleAction === 'string' &&
  typeof value.onScreenText === 'string';

const formatSeconds = (seconds: number): string => seconds.toFixed(1).replace(/\.0$/, '');

const createLegacyVideoEditReview = (analysis: Record<string, unknown>): VideoEditReview | null => {
  const durationSeconds = analysis.durationSeconds;
  const rawShots = analysis.shots;
  if (
    !isFiniteNumber(durationSeconds) ||
    durationSeconds <= 0 ||
    !Array.isArray(rawShots) ||
    rawShots.length === 0 ||
    !rawShots.every(isLegacyVideoShotForMigration)
  ) {
    return null;
  }

  const segments = rawShots;
  const averageSegmentDuration = durationSeconds / segments.length;
  const longestSegment = segments.reduce((longest, segment) =>
    segment.endSeconds - segment.startSeconds > longest.endSeconds - longest.startSeconds
      ? segment
      : longest,
  );
  const visualStyle = isStringArray(analysis.visualStyle) ? analysis.visualStyle : [];
  const narrativeArc =
    typeof analysis.narrativeArc === 'string' ? analysis.narrativeArc.trim() : '';
  const onScreenText = segments.map((segment) => segment.onScreenText.trim()).filter(Boolean);

  return {
    strengths: [
      `已建立 ${segments.length} 个分析段落，时间线覆盖 ${formatSeconds(durationSeconds)} 秒。`,
      ...(narrativeArc ? [`已识别叙事方向：${narrativeArc}`] : []),
    ],
    topIssues: [
      `最长段落持续 ${formatSeconds(longestSegment.endSeconds - longestSegment.startSeconds)} 秒，旧报告尚未评价该段的信息密度。`,
      '旧报告尚未分项评价调色、视觉效果、动态包装与品牌收束。',
    ],
    rhythmSummary: `全片划分为 ${segments.length} 个分析段落，平均段长 ${formatSeconds(averageSegmentDuration)} 秒；建议优先复核最长段落的动作变化与信息增量。`,
    rhythm: segments.map((segment, index) => {
      const segmentDuration = segment.endSeconds - segment.startSeconds;
      const intensity = Math.max(
        1,
        Math.min(5, Math.round((averageSegmentDuration / segmentDuration) * 3)),
      );
      return {
        startSeconds: segment.startSeconds,
        endSeconds: segment.endSeconds,
        intensity,
        label: segment.shotType || `段落 ${index + 1}`,
        description: `${segment.cameraMovement || '未标注运镜'} · ${segment.visibleAction || '未标注动作'}`,
      };
    }),
    visualFinish: {
      compositionAndContinuity: `旧报告已记录 ${segments.length} 个分析段落的构图与运镜观察，需结合相邻段落复核动作、视线和运动方向的连续性。`,
      colorAndExposure: visualStyle.length
        ? `视觉风格标注为“${visualStyle.join('、')}”，需进一步复核段落间曝光、白平衡与色彩一致性。`
        : '旧报告未分项评价段落间曝光、白平衡与色彩一致性。',
      vfxAndMotion: '旧报告未分项评价合成、转场特效与动态图形的完成度。',
      typographyAndBranding: onScreenText.length
        ? `已识别画面文字“${onScreenText.join('、')}”，需复核层级、可读性与品牌一致性。`
        : '旧报告未识别画面文字，需按成片用途复核字幕、标题、Logo 与尾板需求。',
    },
    recommendations: [
      {
        startSeconds: longestSegment.startSeconds,
        endSeconds: longestSegment.endSeconds,
        category: 'pacing',
        priority: 'medium',
        evidence: `${longestSegment.shotType || '该段落'}对应的分析段落持续 ${formatSeconds(longestSegment.endSeconds - longestSegment.startSeconds)} 秒，是旧报告中的最长段落。`,
        action: '复核动作变化与叙事信息；若出现无新增信息的停滞段，收紧入点或出点。',
        expectedImpact: '减少节奏停滞，并让关键动作或信息更快到达。',
      },
    ],
  };
};

const PREVIOUS_LEGACY_SEGMENTATION_NOTE = '旧报告未记录逐镜切点可信度，已按分析段落展示。';

const LEGACY_VIDEO_SEGMENTATION = {
  mode: 'sequence',
  note: '旧报告未记录逐镜切点可信度；原有时间单元与相关“镜头”描述均按分析段落理解。',
} as const;

const isSyntheticLegacyEditReview = (value: unknown): boolean =>
  isRecord(value) &&
  Array.isArray(value.strengths) &&
  value.strengths.some(
    (strength) => typeof strength === 'string' && strength.includes('个分镜，时间线覆盖'),
  ) &&
  typeof value.rhythmSummary === 'string' &&
  value.rhythmSummary.includes('平均镜长');

const migrateLegacyVideoAnalysis = (value: unknown): VideoAnalysisResult | null => {
  if (!isRecord(value) || value.type !== 'video') return null;

  const segmentation = value.segmentation;
  const needsSegmentation = !('segmentation' in value);
  const needsLegacyNoteUpgrade =
    isRecord(segmentation) &&
    segmentation.mode === 'sequence' &&
    segmentation.note === PREVIOUS_LEGACY_SEGMENTATION_NOTE;
  if (!needsSegmentation && !needsLegacyNoteUpgrade) return null;

  const generatedEditReview = createLegacyVideoEditReview(value);
  const editReview =
    !('editReview' in value) || isSyntheticLegacyEditReview(value.editReview)
      ? generatedEditReview
      : value.editReview;
  if (editReview === null) return null;

  const migrated = { ...value, editReview, segmentation: LEGACY_VIDEO_SEGMENTATION };
  return isAnalysisResult(migrated, 'video') && migrated.type === 'video' ? migrated : null;
};

interface NormalizedHistoryEntry {
  changed: boolean;
  item: AnalysisHistoryItem;
}

const normalizeStoredHistoryItem = (value: unknown): NormalizedHistoryEntry | null => {
  if (!isRecord(value)) return null;

  if (
    typeof value.id === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.fileName === 'string' &&
    typeof value.fileSize === 'number' &&
    isAnalysisMode(value.analysisMode) &&
    typeof value.processingSummary === 'string' &&
    (value.isFavorite === undefined || typeof value.isFavorite === 'boolean')
  ) {
    const migratedVideoAnalysis =
      value.analysisMode === 'video' ? migrateLegacyVideoAnalysis(value.analysis) : null;
    const analysis =
      migratedVideoAnalysis ??
      (isAnalysisResult(value.analysis, value.analysisMode) ? value.analysis : null);
    if (!analysis) return null;

    return {
      changed: value.isFavorite === undefined || analysis !== value.analysis,
      item: {
        id: value.id,
        createdAt: value.createdAt,
        fileName: value.fileName,
        fileSize: value.fileSize,
        analysisMode: value.analysisMode,
        processingSummary: value.processingSummary,
        isFavorite: value.isFavorite ?? false,
        analysis,
      },
    };
  }

  return null;
};

export const loadAnalysisHistory = (): AnalysisHistoryItem[] => {
  const storedValue = window.localStorage.getItem(ANALYSIS_HISTORY_STORAGE_KEY);
  if (!storedValue) return [];

  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(storedValue);
  } catch {
    window.localStorage.removeItem(ANALYSIS_HISTORY_STORAGE_KEY);
    return [];
  }

  if (!Array.isArray(parsedValue)) return [];
  const normalizedEntries = parsedValue.map(normalizeStoredHistoryItem);
  const canPersistNormalization = normalizedEntries.every(
    (entry): entry is NormalizedHistoryEntry => entry !== null,
  );
  const entries = normalizedEntries
    .filter((entry): entry is NormalizedHistoryEntry => entry !== null)
    .slice(0, ANALYSIS_HISTORY_LIMIT);
  const history = entries.map((entry) => entry.item);

  if (canPersistNormalization && entries.some((entry) => entry.changed)) {
    try {
      window.localStorage.setItem(ANALYSIS_HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch {
      return history;
    }
  }

  return history;
};

export const cacheAnalysisHistoryItem = (input: AnalysisHistoryInput): AnalysisHistoryItem[] => {
  const nextItem: AnalysisHistoryItem = {
    id: `${Date.now()}-${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
    ...input,
    isFavorite: false,
  };
  const nextHistory = [nextItem, ...loadAnalysisHistory()].slice(0, ANALYSIS_HISTORY_LIMIT);
  window.localStorage.setItem(ANALYSIS_HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
  return nextHistory;
};

export const toggleAnalysisHistoryFavorite = (id: string): AnalysisHistoryItem[] => {
  const history = loadAnalysisHistory();
  const itemToToggle = history.find((item) => item.id === id);
  if (!itemToToggle) return history;

  const nextHistory = history.map((item) =>
    item.id === id ? { ...item, isFavorite: !item.isFavorite } : item,
  );
  window.localStorage.setItem(ANALYSIS_HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
  return nextHistory;
};

export const updateAnalysisHistoryItem = (
  id: string,
  analysis: AnalysisResult,
): AnalysisHistoryItem[] => {
  const history = loadAnalysisHistory();
  const itemToUpdate = history.find((item) => item.id === id);
  if (!itemToUpdate) return history;
  if (!isAnalysisResult(analysis, itemToUpdate.analysisMode)) {
    throw new Error('更新后的分析结果与历史报告类型不匹配。');
  }

  const nextHistory = history.map((item) => (item.id === id ? { ...item, analysis } : item));
  window.localStorage.setItem(ANALYSIS_HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
  return nextHistory;
};

export const deleteAnalysisHistoryItem = (id: string): AnalysisHistoryItem[] => {
  const nextHistory = loadAnalysisHistory().filter((item) => item.id !== id);
  window.localStorage.setItem(ANALYSIS_HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
  return nextHistory;
};

export const clearAnalysisHistory = (): AnalysisHistoryItem[] => {
  window.localStorage.removeItem(ANALYSIS_HISTORY_STORAGE_KEY);
  return [];
};

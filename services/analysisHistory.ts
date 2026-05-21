import type { MusicAnalysisResult } from '../types';

export const ANALYSIS_HISTORY_LIMIT = 50;

const ANALYSIS_HISTORY_STORAGE_KEY = 'soniclens.analysisHistory';

export interface AnalysisHistoryItem {
  id: string;
  createdAt: string;
  fileName: string;
  fileSize: number;
  analysisMode: 'music' | 'sfx';
  processingSummary: string;
  analysis: MusicAnalysisResult;
}

interface AnalysisHistoryInput {
  fileName: string;
  fileSize: number;
  analysisMode: 'music' | 'sfx';
  processingSummary: string;
  analysis: MusicAnalysisResult;
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

const isStringArray = (value: unknown): value is string[] => (
  Array.isArray(value) && value.every((item) => typeof item === 'string')
);

const isAnalysisResult = (value: unknown): value is MusicAnalysisResult => {
  if (!isRecord(value)) return false;
  return (value.type === 'music' || value.type === 'sfx') && isStringArray(value.keywords);
};

const isAnalysisMode = (value: unknown): value is 'music' | 'sfx' => (
  value === 'music' || value === 'sfx'
);

const isHistoryItem = (value: unknown): value is AnalysisHistoryItem => {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === 'string'
    && typeof value.createdAt === 'string'
    && typeof value.fileName === 'string'
    && typeof value.fileSize === 'number'
    && isAnalysisMode(value.analysisMode)
    && typeof value.processingSummary === 'string'
    && isAnalysisResult(value.analysis)
  );
};

export const loadAnalysisHistory = (): AnalysisHistoryItem[] => {
  const storedValue = window.localStorage.getItem(ANALYSIS_HISTORY_STORAGE_KEY);
  if (!storedValue) return [];

  try {
    const parsedValue: unknown = JSON.parse(storedValue);
    if (!Array.isArray(parsedValue)) return [];
    return parsedValue.filter(isHistoryItem).slice(0, ANALYSIS_HISTORY_LIMIT);
  } catch {
    window.localStorage.removeItem(ANALYSIS_HISTORY_STORAGE_KEY);
    return [];
  }
};

export const cacheAnalysisHistoryItem = (input: AnalysisHistoryInput): AnalysisHistoryItem[] => {
  const nextItem: AnalysisHistoryItem = {
    id: `${Date.now()}-${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
    ...input,
  };
  const nextHistory = [nextItem, ...loadAnalysisHistory()].slice(0, ANALYSIS_HISTORY_LIMIT);
  window.localStorage.setItem(ANALYSIS_HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
  return nextHistory;
};

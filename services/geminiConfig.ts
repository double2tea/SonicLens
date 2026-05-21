export const GEMINI_API_KEY_STORAGE_KEY = 'CUSTOM_GEMINI_API_KEY';
export const GEMINI_BASE_URL_STORAGE_KEY = 'CUSTOM_GEMINI_BASE_URL';
export const GEMINI_MODEL_STORAGE_KEY = 'CUSTOM_GEMINI_MODEL';

export const DEFAULT_GEMINI_BASE_URL = 'https://cdn.12ai.org';
export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash';
export const DEFAULT_MAX_UPLOAD_MB = 30;
export const DEFAULT_AUDIO_TARGET_UPLOAD_MB = 12;
export const DEFAULT_MAX_OUTPUT_TOKENS = 12288;

export interface GeminiRuntimeConfig {
  apiKey?: string;
  baseUrl: string;
  model: string;
  maxUploadMb: number;
  audioTargetUploadMb: number;
  maxOutputTokens: number;
}

export interface StoredGeminiSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
}

const normalizeBaseUrl = (value: string): string => value.trim().replace(/\/+$/, '');

const readStorageValue = (key: string): string => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(key)?.trim() ?? '';
};

const parsePositiveNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const getStoredGeminiSettings = (): StoredGeminiSettings => ({
  apiKey: readStorageValue(GEMINI_API_KEY_STORAGE_KEY),
  baseUrl: readStorageValue(GEMINI_BASE_URL_STORAGE_KEY),
  model: readStorageValue(GEMINI_MODEL_STORAGE_KEY),
});

export const getGeminiRuntimeConfig = (): GeminiRuntimeConfig => {
  const stored = getStoredGeminiSettings();
  const envApiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
  const envBaseUrl = import.meta.env.VITE_GEMINI_BASE_URL?.trim();
  const envModel = import.meta.env.VITE_GEMINI_MODEL?.trim();

  return {
    apiKey: stored.apiKey || envApiKey || undefined,
    baseUrl: normalizeBaseUrl(stored.baseUrl || envBaseUrl || DEFAULT_GEMINI_BASE_URL),
    model: stored.model || envModel || DEFAULT_GEMINI_MODEL,
    maxUploadMb: parsePositiveNumber(
      import.meta.env.VITE_GEMINI_MAX_UPLOAD_MB,
      DEFAULT_MAX_UPLOAD_MB
    ),
    audioTargetUploadMb: parsePositiveNumber(
      import.meta.env.VITE_AUDIO_TARGET_UPLOAD_MB,
      DEFAULT_AUDIO_TARGET_UPLOAD_MB
    ),
    maxOutputTokens: parsePositiveNumber(
      import.meta.env.VITE_GEMINI_MAX_OUTPUT_TOKENS,
      DEFAULT_MAX_OUTPUT_TOKENS
    ),
  };
};

export const hasGeminiApiKey = (): boolean => Boolean(getGeminiRuntimeConfig().apiKey);

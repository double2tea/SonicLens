/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_GEMINI_BASE_URL?: string;
  readonly VITE_GEMINI_MODEL?: string;
  readonly VITE_GEMINI_MAX_UPLOAD_MB?: string;
  readonly VITE_AUDIO_TARGET_UPLOAD_MB?: string;
  readonly VITE_GEMINI_MAX_OUTPUT_TOKENS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

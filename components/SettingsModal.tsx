import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Save,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import {
  DEFAULT_GEMINI_BASE_URL,
  DEFAULT_GEMINI_MODEL,
  GEMINI_API_KEY_STORAGE_KEY,
  GEMINI_BASE_URL_STORAGE_KEY,
  GEMINI_MODEL_STORAGE_KEY,
  getStoredGeminiSettings,
} from '../services/geminiConfig';

const API_KEY_REGISTER_URL = 'https://new.12ai.org/register?aff=PYE8';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SettingsErrors {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

const inputClassName =
  'w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-[var(--color-accent)]/70 focus:ring-2 focus:ring-[var(--color-accent)]/15';

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const apiKeyInputRef = useRef<HTMLInputElement>(null);
  const [apiKey, setApiKey] = useState(() => getStoredGeminiSettings().apiKey);
  const [baseUrl, setBaseUrl] = useState(
    () => getStoredGeminiSettings().baseUrl || DEFAULT_GEMINI_BASE_URL,
  );
  const [model, setModel] = useState(() => getStoredGeminiSettings().model || DEFAULT_GEMINI_MODEL);
  const [showApiKey, setShowApiKey] = useState(false);
  const [errors, setErrors] = useState<SettingsErrors>({});
  const [status, setStatus] = useState<'idle' | 'saved' | 'cleared'>('idle');

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const focusFrame = window.requestAnimationFrame(() => apiKeyInputRef.current?.focus());

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEscape);
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (status === 'idle') return;
    const timeout = window.setTimeout(() => setStatus('idle'), 2400);
    return () => window.clearTimeout(timeout);
  }, [status]);

  const validate = (): SettingsErrors => {
    const nextErrors: SettingsErrors = {};

    if (!apiKey.trim()) nextErrors.apiKey = '请输入 API Key。';
    if (!baseUrl.trim()) {
      nextErrors.baseUrl = '请输入 API Base URL。';
    } else {
      try {
        const parsedUrl = new URL(baseUrl.trim());
        if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
          nextErrors.baseUrl = 'URL 必须以 http:// 或 https:// 开头。';
        }
      } catch {
        nextErrors.baseUrl = '请输入完整有效的 URL。';
      }
    }
    if (!model.trim()) nextErrors.model = '请输入模型名称。';

    return nextErrors;
  };

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    setStatus('idle');

    if (Object.keys(nextErrors).length > 0) return;

    const nextApiKey = apiKey.trim();
    const nextBaseUrl = baseUrl.trim();
    const nextModel = model.trim();

    localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, nextApiKey);
    localStorage.setItem(GEMINI_BASE_URL_STORAGE_KEY, nextBaseUrl);
    localStorage.setItem(GEMINI_MODEL_STORAGE_KEY, nextModel);
    setApiKey(nextApiKey);
    setBaseUrl(nextBaseUrl);
    setModel(nextModel);
    setStatus('saved');
  };

  const handleClear = () => {
    localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
    localStorage.removeItem(GEMINI_BASE_URL_STORAGE_KEY);
    localStorage.removeItem(GEMINI_MODEL_STORAGE_KEY);
    setApiKey('');
    setBaseUrl(DEFAULT_GEMINI_BASE_URL);
    setModel(DEFAULT_GEMINI_MODEL);
    setErrors({});
    setStatus('cleared');
    apiKeyInputRef.current?.focus();
  };

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;

    const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusableElements?.length) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#111713]/70 p-4 backdrop-blur-xl"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        aria-describedby="settings-description"
        onKeyDown={handleDialogKeyDown}
        className="relative max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-[#18201a]/98"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-white/8 bg-[#18201a]/98 px-6 py-5 backdrop-blur-xl sm:px-7">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
              <KeyRound aria-hidden="true" size={14} />
              BYOK Configuration
            </div>
            <h2 id="settings-title" className="text-xl font-semibold tracking-[-0.02em] text-white">
              模型连接
            </h2>
            <p id="settings-description" className="mt-1 text-sm text-slate-500">
              使用你自己的 API 凭证进行分析。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭设置"
            className="-mr-2 rounded-lg p-2 text-slate-500 outline-none transition hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/60"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} noValidate className="space-y-6 px-6 py-6 sm:px-7">
          <div className="flex gap-3 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.045] p-4">
            <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
            <p className="text-xs leading-5 text-slate-400">
              API Key 仅保存在当前浏览器本机，并由浏览器直接发送至下方配置的 API 服务。
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-4">
              <label htmlFor="gemini-api-key" className="text-sm font-medium text-slate-200">
                API Key <span className="text-[var(--color-accent)]">*</span>
              </label>
              <a
                href={API_KEY_REGISTER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 outline-none transition hover:text-[var(--color-accent)] focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/60"
              >
                注册 12AI
                <ExternalLink aria-hidden="true" size={12} />
              </a>
            </div>
            <div className="relative">
              <input
                ref={apiKeyInputRef}
                id="gemini-api-key"
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(event) => {
                  setApiKey(event.target.value);
                  setErrors((current) => ({ ...current, apiKey: undefined }));
                  setStatus('idle');
                }}
                autoComplete="off"
                required
                aria-invalid={Boolean(errors.apiKey)}
                aria-describedby={errors.apiKey ? 'gemini-api-key-error' : undefined}
                className={`${inputClassName} pr-12 ${errors.apiKey ? 'border-red-400/50' : ''}`}
                placeholder="输入你的 API Key"
              />
              <button
                type="button"
                onClick={() => setShowApiKey((current) => !current)}
                aria-label={showApiKey ? '隐藏 API Key' : '显示 API Key'}
                aria-pressed={showApiKey}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-slate-500 outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-accent)]/60"
              >
                {showApiKey ? (
                  <EyeOff aria-hidden="true" size={17} />
                ) : (
                  <Eye aria-hidden="true" size={17} />
                )}
              </button>
            </div>
            {errors.apiKey && (
              <p id="gemini-api-key-error" className="mt-2 text-xs text-red-300">
                {errors.apiKey}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="gemini-base-url"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              API Base URL <span className="text-[var(--color-accent)]">*</span>
            </label>
            <input
              id="gemini-base-url"
              type="url"
              value={baseUrl}
              onChange={(event) => {
                setBaseUrl(event.target.value);
                setErrors((current) => ({ ...current, baseUrl: undefined }));
                setStatus('idle');
              }}
              required
              spellCheck={false}
              aria-invalid={Boolean(errors.baseUrl)}
              aria-describedby={errors.baseUrl ? 'gemini-base-url-error' : 'gemini-base-url-hint'}
              className={`${inputClassName} font-mono text-[13px] ${errors.baseUrl ? 'border-red-400/50' : ''}`}
              placeholder={DEFAULT_GEMINI_BASE_URL}
            />
            {errors.baseUrl ? (
              <p id="gemini-base-url-error" className="mt-2 text-xs text-red-300">
                {errors.baseUrl}
              </p>
            ) : (
              <p id="gemini-base-url-hint" className="mt-2 text-xs text-slate-600">
                请求将直接发送至此服务地址。
              </p>
            )}
          </div>

          <div>
            <label htmlFor="gemini-model" className="mb-2 block text-sm font-medium text-slate-200">
              模型 <span className="text-[var(--color-accent)]">*</span>
            </label>
            <input
              id="gemini-model"
              type="text"
              value={model}
              onChange={(event) => {
                setModel(event.target.value);
                setErrors((current) => ({ ...current, model: undefined }));
                setStatus('idle');
              }}
              required
              spellCheck={false}
              aria-invalid={Boolean(errors.model)}
              aria-describedby={errors.model ? 'gemini-model-error' : 'gemini-model-hint'}
              className={`${inputClassName} font-mono text-[13px] ${errors.model ? 'border-red-400/50' : ''}`}
              placeholder={DEFAULT_GEMINI_MODEL}
            />
            {errors.model ? (
              <p id="gemini-model-error" className="mt-2 text-xs text-red-300">
                {errors.model}
              </p>
            ) : (
              <p id="gemini-model-hint" className="mt-2 text-xs text-slate-600">
                使用视频模式时，请选择支持视频理解与结构化 JSON 输出的模型。
              </p>
            )}
          </div>

          <div className="border-t border-white/8 pt-5">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-slate-500 outline-none transition hover:bg-red-400/[0.06] hover:text-red-300 focus-visible:ring-2 focus-visible:ring-red-300/40"
              >
                <Trash2 aria-hidden="true" size={16} />
                清除本机配置
              </button>
              <button
                type="submit"
                className="inline-flex min-w-36 items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white outline-none transition hover:brightness-110 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#18201a]"
              >
                <Save aria-hidden="true" size={16} />
                保存配置
              </button>
            </div>

            <div aria-live="polite" className="min-h-7 pt-3 text-right">
              {status === 'saved' && (
                <p className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300">
                  <Check aria-hidden="true" size={14} /> 配置已保存在本机
                </p>
              )}
              {status === 'cleared' && (
                <p className="text-xs font-medium text-[var(--text-muted)]">本机配置已清除</p>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsModal;

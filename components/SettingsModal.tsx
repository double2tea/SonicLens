import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Key, ExternalLink } from 'lucide-react';
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

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(DEFAULT_GEMINI_BASE_URL);
  const [model, setModel] = useState(DEFAULT_GEMINI_MODEL);
  const [status, setStatus] = useState<'idle' | 'saved' | 'cleared'>('idle');

  useEffect(() => {
    if (isOpen) {
      const saved = getStoredGeminiSettings();
      setApiKey(saved.apiKey);
      setBaseUrl(saved.baseUrl || DEFAULT_GEMINI_BASE_URL);
      setModel(saved.model || DEFAULT_GEMINI_MODEL);
      setStatus('idle');
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, apiKey.trim());
    localStorage.setItem(GEMINI_BASE_URL_STORAGE_KEY, baseUrl.trim());
    localStorage.setItem(GEMINI_MODEL_STORAGE_KEY, model.trim());
    setStatus('saved');
    setTimeout(() => setStatus('idle'), 2000);
  };

  const handleClear = () => {
    localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
    localStorage.removeItem(GEMINI_BASE_URL_STORAGE_KEY);
    localStorage.removeItem(GEMINI_MODEL_STORAGE_KEY);
    setApiKey('');
    setBaseUrl(DEFAULT_GEMINI_BASE_URL);
    setModel(DEFAULT_GEMINI_MODEL);
    setStatus('cleared');
    setTimeout(() => setStatus('idle'), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-white/10 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Key size={18} className="text-[var(--color-accent)]" />
            Settings
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Gemini API Key
          </label>
          <a
            href={API_KEY_REGISTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--color-accent)] hover:text-white transition-colors mb-3"
          >
            没有 API Key？使用邀请码注册 12AI
            <ExternalLink size={12} />
          </a>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 mb-4"
            placeholder="Enter your API key"
          />

          <label className="block text-sm font-medium text-slate-300 mb-2">
            API Base URL
          </label>
          <input
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 mb-4"
            placeholder={DEFAULT_GEMINI_BASE_URL}
          />

          <label className="block text-sm font-medium text-slate-300 mb-2">
            Model
          </label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 mb-4"
            placeholder={DEFAULT_GEMINI_MODEL}
          />
          
          <div className="flex gap-2">
            <button 
              onClick={handleSave}
              className="flex-1 bg-[var(--color-accent)] text-white py-2 rounded-lg font-medium hover:bg-[var(--color-accent)]/90 transition-colors flex items-center justify-center gap-2"
            >
              <Save size={16} /> Save
            </button>
            <button 
              onClick={handleClear}
              className="px-4 py-2 bg-white/5 text-slate-300 rounded-lg font-medium hover:bg-white/10 transition-colors flex items-center justify-center"
            >
              <Trash2 size={16} />
            </button>
          </div>

          {status === 'saved' && <p className="text-green-400 text-xs mt-3 text-center">API key saved successfully!</p>}
          {status === 'cleared' && <p className="text-yellow-400 text-xs mt-3 text-center">API key cleared.</p>}
          
          <p className="text-xs text-slate-500 mt-6 leading-relaxed">
            Settings are stored locally in this browser. Cloudflare Pages can also provide
            VITE_GEMINI_API_KEY, VITE_GEMINI_BASE_URL, and VITE_GEMINI_MODEL at build time.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;

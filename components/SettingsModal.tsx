import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Key } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'saved' | 'cleared'>('idle');

  useEffect(() => {
    if (isOpen) {
      const savedKey = localStorage.getItem('CUSTOM_GEMINI_API_KEY') || '';
      setApiKey(savedKey);
      setStatus('idle');
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('CUSTOM_GEMINI_API_KEY', apiKey);
    setStatus('saved');
    setTimeout(() => setStatus('idle'), 2000);
  };

  const handleClear = () => {
    localStorage.removeItem('CUSTOM_GEMINI_API_KEY');
    setApiKey('');
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
            Custom Gemini API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 mb-4"
            placeholder="Enter your API key"
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
            Your API key is stored locally in your browser and is only used for requests made from this session.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;

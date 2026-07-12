import type { AnalysisMode } from '../types';

interface ModeSelectorProps {
  disabled?: boolean;
  mode: AnalysisMode;
  onChange: (mode: AnalysisMode) => void;
}

const modes = [
  {
    id: 'music' as const,
    label: '音乐',
  },
  {
    id: 'sfx' as const,
    label: '音效',
  },
  {
    id: 'video' as const,
    label: '视频',
  },
];

export default function ModeSelector({ disabled = false, mode, onChange }: ModeSelectorProps) {
  return (
    <div
      className="inline-grid grid-cols-3 gap-1 rounded-lg border hairline bg-black/[0.012] p-1"
      role="radiogroup"
      aria-label="分析模式"
    >
      {modes.map((item) => {
        const isActive = item.id === mode;
        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={disabled}
            onClick={() => onChange(item.id)}
            className={`min-w-20 rounded-md px-4 py-2 text-center text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
              isActive
                ? 'bg-black/[0.08] text-[var(--text)]'
                : 'text-[var(--text-muted)] hover:bg-black/[0.035] hover:text-[var(--text)]'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

import type { ReactNode } from 'react';
import { Plus, Settings2 } from 'lucide-react';

interface AppHeaderProps {
  actions?: ReactNode;
  canReset: boolean;
  onOpenSettings: () => void;
  onReset: () => void;
}

export default function AppHeader({ actions, canReset, onOpenSettings, onReset }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b hairline bg-[rgba(238,237,231,0.96)] backdrop-blur-xl">
      <div className="app-shell flex h-14 items-center justify-between gap-4">
        <button
          type="button"
          onClick={onReset}
          className="group flex min-w-0 items-center gap-3"
          aria-label="返回 SonicLens 工作台"
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-black/[0.045]">
            <svg aria-hidden="true" viewBox="0 0 28 28" className="h-5 w-5">
              <path
                d="M3 15.5c3 0 3-7 6-7s3 11 6 11 3-7 6-7 3 3 4 3"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2.2"
                className="accent-text"
              />
            </svg>
          </span>
          <span className="truncate text-[0.92rem] font-semibold tracking-[-0.02em]">
            SonicLens
          </span>
        </button>

        <nav className="flex shrink-0 items-center gap-1.5" aria-label="工作台操作">
          {actions}
          <button
            type="button"
            onClick={onOpenSettings}
            className="grid h-9 w-9 place-items-center rounded-lg text-[var(--text-muted)] hover:bg-black/[0.05] hover:text-[var(--text)]"
            aria-label="打开 API 设置"
          >
            <Settings2 size={17} strokeWidth={1.8} />
          </button>
          {canReset && (
            <button
              type="button"
              onClick={onReset}
              className="ml-1 inline-flex h-9 items-center gap-2 rounded-lg border hairline px-3 text-xs font-semibold text-[var(--text)] hover:border-[var(--line-strong)] hover:bg-black/[0.035]"
            >
              <Plus size={15} strokeWidth={1.9} />
              <span className="hidden sm:inline">新分析</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

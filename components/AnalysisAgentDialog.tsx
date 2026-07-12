import { useEffect, useId, useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { MessageCircle, Minus, Sparkles } from 'lucide-react';
import { createPortal } from 'react-dom';

export interface AnalysisAgentDialogProps {
  children: ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

const focusableSelector =
  'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

export default function AnalysisAgentDialog({
  children,
  onOpenChange,
  open,
}: AnalysisAgentDialogProps) {
  const dialogId = useId();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused =
      returnFocusRef.current ??
      (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    returnFocusRef.current = previouslyFocused;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => {
      const preferredFocus = dialogRef.current?.querySelector<HTMLElement>(
        '[data-agent-initial-focus="true"]:not([disabled])',
      );
      (preferredFocus ?? dialogRef.current)?.focus();
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus();
      returnFocusRef.current = null;
    };
  }, [open]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onOpenChange(false);
      return;
    }
    if (event.key !== 'Tab') return;

    const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector);
    if (!focusableElements?.length) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

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

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <button
        hidden={open}
        type="button"
        aria-controls={dialogId}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={(event) => {
          returnFocusRef.current = event.currentTarget;
          onOpenChange(true);
        }}
        className="fixed right-4 bottom-4 z-[70] inline-flex min-h-12 items-center gap-3 rounded-full border border-white/10 bg-[#18201a] px-4 text-left text-white shadow-[0_14px_38px_rgba(21,31,24,0.22)] hover:bg-[#223027] sm:right-6 sm:bottom-6"
        data-export-ignore="true"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-white/8 text-emerald-200">
          <MessageCircle aria-hidden="true" size={16} />
        </span>
        <span>
          <span className="block text-[0.68rem] font-semibold tracking-[0.08em] text-white/55 uppercase">
            Agent
          </span>
          <span className="block text-xs font-semibold">继续讨论报告</span>
        </span>
      </button>

      <div hidden={!open} className="fixed inset-0 z-[80]" data-export-ignore="true">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[#151b17]/28 backdrop-blur-[2px]"
          onMouseDown={() => onOpenChange(false)}
        />
        <div
          ref={dialogRef}
          id={dialogId}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className="absolute inset-2 flex min-h-0 flex-col overflow-hidden rounded-xl border border-black/20 bg-[var(--surface-raised)] shadow-[0_28px_80px_rgba(21,31,24,0.28)] outline-none sm:inset-auto sm:right-5 sm:bottom-5 sm:h-[min(46rem,calc(100dvh-2.5rem))] sm:w-[min(46rem,calc(100vw-2.5rem))]"
        >
          <header className="flex shrink-0 items-center justify-between gap-4 border-b hairline px-5 py-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <span className="accent-surface grid h-9 w-9 shrink-0 place-items-center rounded-lg border accent-text">
                <Sparkles aria-hidden="true" size={16} />
              </span>
              <div className="min-w-0">
                <p className="eyebrow">Analysis agent</p>
                <h2 id={titleId} className="mt-1 truncate text-lg font-semibold tracking-[-0.03em]">
                  继续讨论报告
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="收起分析 Agent"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border hairline text-[var(--text-muted)] hover:border-[var(--line-strong)] hover:bg-black/[0.035] hover:text-[var(--text)]"
            >
              <Minus aria-hidden="true" size={18} />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
        </div>
      </div>
    </>,
    document.body,
  );
}

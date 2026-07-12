import { useEffect, useRef, useState } from 'react';
import { Eye, LoaderCircle, Send, Sparkles, Square } from 'lucide-react';
import { streamAnalysisAgent, type AnalysisAgentMessage } from '../services/geminiService';
import type { VideoAnalysisResult } from '../types';

interface ConversationMessage extends AnalysisAgentMessage {
  id: string;
  interruptionNote?: string;
}

interface AnalysisAgentProps {
  analysis: VideoAnalysisResult;
  file: File | null;
  input: string;
  onInputChange: (value: string) => void;
}

const quickQuestions = ['找出最拖节奏的段落', '检查转场和包装问题', '按优先级整理剪辑清单'];

export default function AnalysisAgent({
  analysis,
  file,
  input,
  onInputChange,
}: AnalysisAgentProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [reviewOriginal, setReviewOriginal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamAnnouncement, setStreamAnnouncement] = useState('');
  const controllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    [],
  );

  useEffect(() => {
    if (!isNearBottomRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isSending, messages]);

  const sendMessage = async () => {
    const userMessage = input.trim();
    if (!userMessage || isSending) return;

    const priorMessages = messages.map(({ role, text }) => ({ role, text }));
    const userEntry: ConversationMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: userMessage,
    };
    const modelEntry: ConversationMessage = {
      id: crypto.randomUUID(),
      role: 'model',
      text: '',
    };
    setMessages((current) => [...current, userEntry, modelEntry]);
    onInputChange('');
    setError(null);
    setStreamAnnouncement('Agent 正在分析。');
    setIsSending(true);

    const controller = new AbortController();
    controllerRef.current = controller;
    let accumulatedText = '';
    let pendingDelta = '';
    let frame: number | null = null;

    const flushDeltas = () => {
      frame = null;
      if (!pendingDelta) return;
      accumulatedText += pendingDelta;
      pendingDelta = '';
      setMessages((current) =>
        current.map((message) =>
          message.id === modelEntry.id ? { ...message, text: accumulatedText } : message,
        ),
      );
    };

    const queueDelta = (delta: string) => {
      pendingDelta += delta;
      if (frame === null) frame = window.requestAnimationFrame(flushDeltas);
    };

    try {
      const finalText = await streamAnalysisAgent(
        {
          analysis,
          messages: priorMessages,
          userMessage,
          media: reviewOriginal && file ? file : undefined,
          signal: controller.signal,
        },
        queueDelta,
      );
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;
      pendingDelta = '';
      accumulatedText = finalText;
      setMessages((current) =>
        current.map((message) =>
          message.id === modelEntry.id ? { ...message, text: finalText } : message,
        ),
      );
      setStreamAnnouncement('Agent 响应完成。');
      setReviewOriginal(false);
    } catch (requestError: unknown) {
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;
      accumulatedText += pendingDelta;
      pendingDelta = '';

      if (controller.signal.aborted) {
        if (accumulatedText) {
          setMessages((current) =>
            current.map((message) =>
              message.id === modelEntry.id
                ? { ...message, text: accumulatedText, interruptionNote: '响应已停止' }
                : message,
            ),
          );
          setStreamAnnouncement('Agent 响应已停止。');
        } else {
          setMessages((current) =>
            current.filter(({ id }) => id !== userEntry.id && id !== modelEntry.id),
          );
          onInputChange(userMessage);
          setStreamAnnouncement('已停止，问题已恢复到输入框。');
        }
      } else {
        const message = requestError instanceof Error ? requestError.message : 'Agent 请求失败。';
        if (accumulatedText) {
          setMessages((current) =>
            current.map((entry) =>
              entry.id === modelEntry.id
                ? { ...entry, text: accumulatedText, interruptionNote: '响应中断，可继续追问' }
                : entry,
            ),
          );
          setStreamAnnouncement('Agent 响应中断，已保留已有内容。');
        } else {
          setMessages((current) =>
            current.filter(({ id }) => id !== userEntry.id && id !== modelEntry.id),
          );
          onInputChange(userMessage);
          setStreamAnnouncement('Agent 请求失败。');
        }
        setError(message);
      }
    } finally {
      if (frame !== null) window.cancelAnimationFrame(frame);
      if (controllerRef.current === controller) controllerRef.current = null;
      setIsSending(false);
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const stopResponse = () => controllerRef.current?.abort();

  return (
    <section className="flex h-full min-h-0 flex-col" aria-label="Agent 对话">
      <div className="flex shrink-0 flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <p className="max-w-xl text-xs leading-5 text-[var(--text-muted)]">
          默认只读取当前结构化报告；开启后，本轮才会重新发送原始视频进行复核。
        </p>
        <button
          type="button"
          aria-pressed={reviewOriginal}
          disabled={!file || isSending}
          onClick={() => setReviewOriginal((current) => !current)}
          className={`inline-flex min-h-10 items-center gap-2 self-start rounded-md border px-3 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-45 ${
            reviewOriginal
              ? 'accent-surface accent-text'
              : 'hairline text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
        >
          <Eye size={14} />
          {reviewOriginal ? '本轮会重新查看原片' : '本轮重新查看原片'}
        </button>
      </div>

      <div
        ref={logRef}
        role="log"
        aria-live="off"
        aria-busy={isSending}
        onScroll={(event) => {
          const { clientHeight, scrollHeight, scrollTop } = event.currentTarget;
          isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 96;
        }}
        className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto border-y hairline py-4 pr-1"
      >
        {messages.length === 0 ? (
          <div className="grid min-h-28 place-items-center text-center">
            <div>
              <Sparkles size={18} className="mx-auto accent-text" />
              <p className="mt-3 text-sm font-medium">从报告证据继续审片</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                可以追问节奏、剪辑、转场、效果、包装与画面完成度。
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <article
              key={message.id}
              className={`max-w-[92%] rounded-lg px-4 py-3 text-sm leading-6 ${
                message.role === 'user'
                  ? 'ml-auto accent-surface text-[var(--text)]'
                  : 'border hairline bg-white/30 text-[var(--text-secondary)]'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.text}</p>
              {message.interruptionNote && (
                <p className="mt-2 text-[0.7rem] font-medium text-[var(--text-muted)]">
                  {message.interruptionNote}
                </p>
              )}
            </article>
          ))
        )}
        {isSending && (
          <p className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <LoaderCircle size={13} className="animate-spin" /> Agent 正在整理证据与建议…
          </p>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {streamAnnouncement}
      </p>

      <div className="mt-3 flex shrink-0 flex-wrap gap-2">
        {quickQuestions.map((question) => (
          <button
            key={question}
            type="button"
            disabled={isSending}
            onClick={() => {
              onInputChange(question);
              inputRef.current?.focus();
            }}
            className="rounded-full border hairline px-3 py-1.5 text-[0.7rem] text-[var(--text-muted)] hover:border-[var(--line-strong)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {question}
          </button>
        ))}
      </div>

      <form
        className="mt-3 grid shrink-0 gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          void sendMessage();
        }}
      >
        <div>
          <label htmlFor="analysis-agent-input" className="sr-only">
            与分析 Agent 对话
          </label>
          <textarea
            ref={inputRef}
            id="analysis-agent-input"
            data-agent-initial-focus="true"
            value={input}
            disabled={isSending}
            rows={2}
            placeholder="例如：找出前 30 秒最拖节奏的部分，并给出具体剪辑动作。"
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void sendMessage();
              }
            }}
            className="w-full resize-none rounded-lg border hairline bg-white/30 px-4 py-3 text-sm leading-6 outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] disabled:opacity-60"
          />
        </div>
        <button
          type={isSending ? 'button' : 'submit'}
          disabled={!isSending && !input.trim()}
          onClick={isSending ? stopResponse : undefined}
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-45 ${
            isSending ? 'border hairline text-[var(--text)]' : 'accent-bg'
          }`}
        >
          {isSending ? <Square size={13} fill="currentColor" /> : <Send size={14} />}
          {isSending ? '停止' : '发送'}
        </button>
      </form>

      {!file && (
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          这条历史报告未保留原始视频；Agent 仍可基于报告继续讨论。
        </p>
      )}
      {error && (
        <p className="mt-3 text-xs text-[var(--danger)]" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

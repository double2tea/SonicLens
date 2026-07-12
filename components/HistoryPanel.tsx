import { useId, useMemo, useState } from 'react';
import { Search, Star, Trash2, X } from 'lucide-react';
import type { AnalysisHistoryItem } from '../services/analysisHistory';

interface HistoryPanelProps {
  items: AnalysisHistoryItem[];
  onClear: () => void;
  onDelete: (id: string) => void;
  onRestore: (item: AnalysisHistoryItem) => void;
  onToggleFavorite: (id: string) => void;
}

const formatTime = (value: string): string =>
  new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

const formatSize = (bytes: number): string => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const getTitle = (item: AnalysisHistoryItem): string => {
  if (item.analysis.type === 'sfx') return item.analysis.sfx.name;
  if (item.analysis.type === 'video') return item.analysis.title;
  return item.analysis.mainGenre;
};

const getAnalysisSearchTerms = (item: AnalysisHistoryItem): string[] => {
  const { analysis } = item;
  if (analysis.type === 'video') {
    return [
      analysis.title,
      analysis.summary,
      analysis.narrativeArc,
      analysis.segmentation.note,
      ...analysis.visualStyle,
      ...analysis.keywords,
      ...analysis.risks,
      ...analysis.editReview.strengths,
      ...analysis.editReview.topIssues,
      analysis.editReview.rhythmSummary,
      analysis.editReview.visualFinish.compositionAndContinuity,
      analysis.editReview.visualFinish.colorAndExposure,
      analysis.editReview.visualFinish.vfxAndMotion,
      analysis.editReview.visualFinish.typographyAndBranding,
      ...analysis.editReview.recommendations.flatMap((recommendation) => [
        recommendation.evidence,
        recommendation.action,
        recommendation.expectedImpact,
      ]),
      ...(analysis.seedAudio
        ? [analysis.seedAudio.projectContext, analysis.seedAudio.textPrompt]
        : []),
      ...analysis.shots.flatMap((shot) => [
        shot.shotType,
        shot.cameraAngle,
        shot.cameraMovement,
        shot.transition,
        shot.visualDescription,
        shot.visibleAction,
        shot.onScreenText,
        shot.dialogue,
        shot.existingSound,
        shot.soundCue.cue,
        shot.soundCue.function,
        shot.soundCue.character,
        shot.soundCue.route,
        shot.soundCue.mixRisk,
      ]),
    ];
  }

  return [
    ...analysis.keywords,
    ...analysis.instruments,
    ...(analysis.type === 'music' ? (analysis.mood ?? []) : []),
  ];
};

const matchesSearch = (item: AnalysisHistoryItem, query: string): boolean => {
  const normalizedQuery = query.trim().toLocaleLowerCase('zh-CN');
  if (!normalizedQuery) return true;

  const searchableText = [
    getTitle(item),
    item.fileName,
    item.analysisMode,
    ...getAnalysisSearchTerms(item),
  ]
    .join(' ')
    .toLocaleLowerCase('zh-CN');
  return searchableText.includes(normalizedQuery);
};

export default function HistoryPanel({
  items,
  onClear,
  onDelete,
  onRestore,
  onToggleFavorite,
}: HistoryPanelProps) {
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [query, setQuery] = useState('');
  const searchInputId = useId();
  const filteredItems = useMemo(
    () => items.filter((item) => (!favoritesOnly || item.isFavorite) && matchesSearch(item, query)),
    [favoritesOnly, items, query],
  );
  const isFiltering = favoritesOnly || query.trim().length > 0;

  const clearHistory = () => {
    onClear();
    setConfirmingClear(false);
  };

  return (
    <aside
      className="flex min-h-56 min-w-0 flex-col border-t hairline pt-5 lg:min-h-[350px] lg:border-t-0 lg:border-l lg:pl-7 lg:pt-0"
      aria-labelledby="history-title"
    >
      <div className="flex items-start justify-between gap-4 border-b hairline pb-4">
        <h2 id="history-title" className="text-sm font-semibold tracking-[-0.02em]">
          最近分析
        </h2>
        <span className="data-value text-[0.64rem] text-[var(--text-muted)]">
          {isFiltering ? `${filteredItems.length}/${items.length}` : items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 items-center py-10">
          <div className="max-w-52">
            <p className="text-sm font-medium">暂无分析记录</p>
            <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
              完成分析后，可从这里恢复报告与分析结论。
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="border-b hairline py-3">
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <label htmlFor={searchInputId} className="sr-only">
                  搜索历史记录
                </label>
                <Search
                  size={13}
                  className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[var(--text-muted)]"
                  aria-hidden="true"
                />
                <input
                  id={searchInputId}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索文件、类型或关键词"
                  className="h-9 w-full rounded-md border hairline bg-transparent pr-8 pl-8 text-xs outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute top-1/2 right-1 grid h-7 w-7 -translate-y-1/2 place-items-center rounded text-[var(--text-muted)] hover:text-[var(--text)]"
                    aria-label="清除历史搜索"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              <button
                type="button"
                aria-pressed={favoritesOnly}
                onClick={() => setFavoritesOnly((active) => !active)}
                className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium ${
                  favoritesOnly
                    ? 'accent-surface accent-text'
                    : 'hairline text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                <Star size={13} fill={favoritesOnly ? 'currentColor' : 'none'} />
                收藏
              </button>
            </div>
            <p className="sr-only" role="status" aria-live="polite">
              找到 {filteredItems.length} 条历史记录
            </p>
          </div>

          {filteredItems.length === 0 ? (
            <div className="flex flex-1 items-center py-10" role="status">
              <div>
                <p className="text-sm font-medium">没有匹配记录</p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setFavoritesOnly(false);
                  }}
                  className="mt-2 text-xs accent-text"
                >
                  清除筛选
                </button>
              </div>
            </div>
          ) : (
            <div className="-mr-1 mt-3 max-h-[30rem] flex-1 space-y-1 overflow-y-auto pr-1">
              {filteredItems.map((item) => (
                <div key={item.id} className="group relative rounded-lg hover:bg-black/[0.035]">
                  <button
                    type="button"
                    onClick={() => onRestore(item)}
                    className="w-full rounded-lg px-3 py-3 pr-20 text-left"
                  >
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{getTitle(item)}</span>
                      <span className="shrink-0 font-mono text-[0.58rem] tracking-wider text-[var(--accent)] uppercase">
                        {item.analysisMode}
                      </span>
                    </span>
                    <span className="mt-1 block truncate text-[0.7rem] text-[var(--text-muted)]">
                      {item.fileName}
                    </span>
                    <span className="data-value mt-2 flex gap-2 text-[0.62rem] text-[var(--text-muted)]">
                      <span>{formatTime(item.createdAt)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatSize(item.fileSize)}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(item.id)}
                    aria-label={`${item.isFavorite ? '取消收藏' : '收藏'} ${item.fileName}`}
                    aria-pressed={item.isFavorite}
                    className={`absolute top-1.5 right-10 grid h-9 w-9 place-items-center rounded-md hover:bg-black/[0.05] focus:opacity-100 group-hover:opacity-100 ${
                      item.isFavorite
                        ? 'accent-text opacity-100'
                        : 'text-[var(--text-muted)] opacity-60'
                    }`}
                  >
                    <Star size={13} fill={item.isFavorite ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(item.id)}
                    className="absolute top-1.5 right-1 grid h-9 w-9 place-items-center rounded-md text-[var(--text-muted)] opacity-0 hover:bg-black/[0.05] hover:text-[var(--danger)] focus:opacity-100 group-hover:opacity-100"
                    aria-label={`删除 ${item.fileName} 的历史记录`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {items.length > 0 && (
        <div className="mt-4 border-t hairline pt-4">
          {confirmingClear ? (
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-[var(--text-muted)]">清空全部历史？</span>
              <span className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingClear(false)}
                  className="px-2 py-1 text-[var(--text-muted)] hover:text-[var(--text)]"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={clearHistory}
                  className="rounded-md bg-[rgba(217,137,118,0.12)] px-2 py-1 text-[var(--danger)] hover:bg-[rgba(217,137,118,0.2)]"
                >
                  确认清空
                </button>
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingClear(true)}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--danger)]"
            >
              清空历史
            </button>
          )}
        </div>
      )}
    </aside>
  );
}

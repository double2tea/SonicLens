import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { ChevronDown, Download, FileCode2, FileImage, FileText, LoaderCircle } from 'lucide-react';
import type {
  AnalysisResult,
  EditPriority,
  EditRecommendationCategory,
  SoundPriority,
  SoundRoute,
  VideoSoundCue,
  VideoEditDecision,
  VideoEditorialStatus,
} from '../types';

interface ExportMenuProps {
  analysis: AnalysisResult;
  contentRef: RefObject<HTMLDivElement | null>;
  fileName: string;
}

const escapeHtml = (value: string | number): string =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const renderTags = (items: string[]): string =>
  items.map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join('');

const editPriorityLabels: Record<EditPriority, string> = {
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级',
};

const editPriorityOrder: Record<EditPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const editCategoryLabels: Record<EditRecommendationCategory, string> = {
  structure: '结构',
  pacing: '节奏',
  cut: '剪切',
  continuity: '连续性',
  transition: '转场',
  color: '色彩',
  vfx: '视觉效果',
  motion_graphics: '动态包装',
  typography: '字体',
  branding: '品牌',
  sound: '声音',
};

const editDecisionLabels: Record<VideoEditDecision, string> = {
  trim: '缩短',
  remove: '删除',
  replace: '替换',
  reorder: '重排',
  polish: '精修',
  verify: '核对',
};

const editorialStatusLabels: Record<VideoEditorialStatus, string> = {
  ready: '可直接交付',
  minor_revision: '小改后交付',
  major_revision: '需要重剪',
};

const soundPriorityLabels: Record<SoundPriority, string> = {
  must: '必须保留',
  recommended: '建议加入',
  creative: '创意选项',
};

const diegeticStatusLabels: Record<VideoSoundCue['diegeticStatus'], string> = {
  diegetic: '画内声',
  non_diegetic: '画外声',
  ambiguous: '声源待确认',
};

const soundRouteLabels: Record<SoundRoute, string> = {
  integrated: '整体生成',
  timed_clip: '定时音效',
  library_foley: '素材库 / 拟音',
  mix_only: '仅混音处理',
  omit: '无需添加',
};

const qualityRecoveryReasonLabels = {
  max_tokens: '输出截断后使用紧凑结构恢复',
  invalid_response: '结构校验失败后重新生成',
  low_detail: '首次结果信息偏薄，已启动定向深化',
  repair_failed: '定向深化请求未完成，已保留首次结果',
} as const;

const createHtmlReport = (analysis: AnalysisResult, fileName: string): string => {
  const videoRecommendations =
    analysis.type === 'video'
      ? [...analysis.editReview.recommendations].sort(
          (left, right) =>
            editPriorityOrder[left.priority] - editPriorityOrder[right.priority] ||
            left.startSeconds - right.startSeconds,
        )
      : [];
  const videoHighestPriority =
    videoRecommendations.length === 0
      ? analysis.type === 'video' && analysis.editReview.verdict?.status === 'ready'
        ? '无需修改'
        : '待复核'
      : videoRecommendations.some(({ priority }) => priority === 'high')
        ? '高'
        : videoRecommendations.some(({ priority }) => priority === 'medium')
          ? '中'
          : '低';
  const title =
    analysis.type === 'music'
      ? analysis.mainGenre
      : analysis.type === 'video'
        ? analysis.title
        : analysis.sfx.name;
  const detail =
    analysis.type === 'music'
      ? `
      <section class="metrics">
        <div><small>BPM</small><strong>${escapeHtml(analysis.bpm ?? '—')}</strong></div>
        <div><small>Key</small><strong>${escapeHtml(analysis.key ?? '—')}</strong></div>
        <div><small>Time</small><strong>${escapeHtml(analysis.timeSignature ?? '—')}</strong></div>
      </section>
      <section><h2>声音画像</h2><p>${escapeHtml(analysis.educationalContext)}</p></section>
      ${analysis.mood?.length ? `<section><h2>情绪</h2>${renderTags(analysis.mood)}</section>` : ''}
      ${analysis.instruments.length ? `<section><h2>乐器与声部</h2>${renderTags(analysis.instruments)}</section>` : ''}
      ${
        analysis.segments?.length
          ? `
        <section><h2>段落时间轴</h2>
          ${analysis.segments
            .map(
              (segment) => `
            <article class="row">
              <code>${escapeHtml(segment.timestamp)}</code>
              <div><strong>${escapeHtml(segment.genre)}</strong><small>${escapeHtml(segment.mood)}</small><p>${escapeHtml(segment.description)}</p></div>
            </article>
          `,
            )
            .join('')}
        </section>`
          : ''
      }
      ${
        analysis.similarTracks?.length
          ? `
        <section><h2>相似曲目</h2>
          ${analysis.similarTracks.map((track) => `<p><strong>${escapeHtml(track.title)}</strong> · ${escapeHtml(track.artist)}</p>`).join('')}
        </section>`
          : ''
      }
    `
      : analysis.type === 'video'
        ? `
      <section class="metrics">
        <div><small>Duration</small><strong>${escapeHtml(analysis.durationSeconds.toFixed(1))}s</strong></div>
        <div><small>${analysis.segmentation.mode === 'shot' ? '候选镜头' : '分析段落'}</small><strong>${escapeHtml(analysis.shots.length)}</strong></div>
        <div><small>最高优先级</small><strong>${escapeHtml(videoHighestPriority)}</strong></div>
      </section>
      <section><h2>${analysis.editReview.verdict ? '审片结论' : '审片摘要'}</h2>
        ${analysis.editReview.verdict ? `<p><b>交付判断：</b>${escapeHtml(editorialStatusLabels[analysis.editReview.verdict.status])}</p>` : ''}
        <p>${escapeHtml(analysis.editReview.verdict?.rationale ?? analysis.summary)}</p>
        ${analysis.editReview.verdict ? `<p><b>内容与目的：</b>${escapeHtml(analysis.summary)}</p>` : ''}
        <p><b>叙事结构：</b>${escapeHtml(analysis.narrativeArc)}</p>
        ${analysis.visualStyle.length ? `<p><b>视觉方向：</b></p>${renderTags(analysis.visualStyle)}` : ''}
      </section>
      <section><h2>判断依据</h2>
        ${analysis.editReview.topIssues.length ? `<p><b>优先问题：</b></p>${analysis.editReview.topIssues.map((item) => `<p>• ${escapeHtml(item)}</p>`).join('')}` : '<p>未发现影响交付的核心问题。</p>'}
        ${analysis.editReview.strengths.length ? `<p><b>保留项：</b></p>${analysis.editReview.strengths.map((item) => `<p>✓ ${escapeHtml(item)}</p>`).join('')}` : '<p>暂无明确保留项。</p>'}
      </section>
      <section><h2>优先修改</h2>
        ${
          videoRecommendations.length > 0
            ? videoRecommendations
                .map(
                  (item) => `
          <article class="row">
            <code>${escapeHtml(item.startSeconds.toFixed(1))}–${escapeHtml(item.endSeconds.toFixed(1))}s</code>
            <div>
              <strong>${escapeHtml(editPriorityLabels[item.priority])} · ${escapeHtml(editCategoryLabels[item.category])}${item.decision ? ` · ${escapeHtml(editDecisionLabels[item.decision])}` : ''}</strong>
              <p><b>依据：</b>${escapeHtml(item.evidence)}</p>
              <p><b>动作：</b>${escapeHtml(item.action)}</p>
              <p><b>预期：</b>${escapeHtml(item.expectedImpact)}</p>
            </div>
          </article>`,
                )
                .join('')
            : analysis.editReview.verdict?.status === 'ready'
              ? '<p>没有必须修改项</p>'
              : '<p>未返回修改建议，需人工复核</p>'
        }
      </section>
      <section><h2>节奏诊断</h2>
        <p>${escapeHtml(analysis.editReview.rhythmSummary)}</p>
        ${analysis.editReview.rhythm
          .map(
            (point) => `
          <article class="row">
            <code>${escapeHtml(point.startSeconds.toFixed(1))}–${escapeHtml(point.endSeconds.toFixed(1))}s</code>
            <div><strong>${escapeHtml(point.label)} · ${escapeHtml(point.intensity)}/5</strong><p>${escapeHtml(point.description)}</p></div>
          </article>`,
          )
          .join('')}
      </section>
      <section><h2>画面与包装完成度</h2>
        <article class="row"><code>构图 / 连续性</code><div><p>${escapeHtml(analysis.editReview.visualFinish.compositionAndContinuity)}</p></div></article>
        <article class="row"><code>色彩 / 曝光</code><div><p>${escapeHtml(analysis.editReview.visualFinish.colorAndExposure)}</p></div></article>
        <article class="row"><code>VFX / 动效</code><div><p>${escapeHtml(analysis.editReview.visualFinish.vfxAndMotion)}</p></div></article>
        <article class="row"><code>字体 / 品牌</code><div><p>${escapeHtml(analysis.editReview.visualFinish.typographyAndBranding)}</p></div></article>
      </section>
      <section><h2>分析依据与可信度</h2>
        ${
          analysis.quality
            ? `<p><b>${analysis.quality.status === 'pass' ? '证据密度检查通过' : analysis.quality.status === 'enriched' ? '已自动深化' : '信息仍有限'}</b> · ${escapeHtml(analysis.quality.score)}/100 · ${analysis.quality.detailLevel === 'full' ? '完整结构' : '紧凑恢复'} · 深化尝试 ${escapeHtml(analysis.quality.automaticRepairs)}/1</p>
        <p>本地启发式分数不代表事实识别准确率。</p>
        <p><b>模型：</b>${escapeHtml(analysis.quality.model)}</p>
        ${analysis.quality.recoveryReasons.map((reason) => `<p>• ${escapeHtml(qualityRecoveryReasonLabels[reason])}</p>`).join('')}
        ${analysis.quality.issues.map((issue) => `<p>• 仍建议人工复核：${escapeHtml(issue)}</p>`).join('')}`
            : ''
        }
        <p><b>${analysis.segmentation.detection ? '两阶段时间线' : analysis.segmentation.mode === 'shot' ? '时间线识别说明' : '镜头总数未可靠确认'}</b></p>
        <p>${escapeHtml(analysis.segmentation.note)}</p>
        ${
          analysis.segmentation.detection
            ? `<p>切点采样 ${escapeHtml(analysis.segmentation.detection.sampleRateFps)} FPS · 检测切点 ${escapeHtml(analysis.segmentation.detection.detectedCuts)} · 覆盖置信 ${escapeHtml(analysis.segmentation.detection.confidence === 'high' ? '高' : analysis.segmentation.detection.confidence === 'medium' ? '中' : '低')}</p>`
            : ''
        }
        ${analysis.keywords.length ? `<p><b>搜索关键词：</b></p>${renderTags(analysis.keywords)}` : ''}
      </section>
      <section><h2>${analysis.segmentation.mode === 'shot' ? '逐镜证据' : '段落证据'}</h2>
        ${analysis.shots
          .map(
            (shot) => `
          <article class="row">
            <code>${escapeHtml(shot.startSeconds.toFixed(1))}–${escapeHtml(shot.endSeconds.toFixed(1))}s</code>
            <div>
              <strong>${escapeHtml(shot.shotType)} · ${escapeHtml(shot.cameraAngle)}</strong>
              <small>${escapeHtml(shot.cameraMovement)} · ${escapeHtml(shot.transition)}</small>
              <p>${escapeHtml(shot.visualDescription)}</p>
              <p><b>动作：</b>${escapeHtml(shot.visibleAction)}</p>
              ${shot.onScreenText ? `<p><b>画面文字：</b>${escapeHtml(shot.onScreenText)}</p>` : ''}
              ${shot.dialogue ? `<p><b>对白：</b>${escapeHtml(shot.dialogue)}</p>` : ''}
              <p><b>已有原声：</b>${escapeHtml(shot.existingSound)}</p>
              <p><b>声音建议：</b>${escapeHtml(shot.soundCue.cue)}</p>
              <small>${escapeHtml(soundPriorityLabels[shot.soundCue.priority])} · ${escapeHtml(diegeticStatusLabels[shot.soundCue.diegeticStatus])} · ${escapeHtml(soundRouteLabels[shot.soundCue.route])}</small>
              <p><b>声音作用：</b>${escapeHtml(shot.soundCue.function)}</p>
              <p><b>声音质感：</b>${escapeHtml(shot.soundCue.character)}</p>
              <p><b>混音风险：</b>${escapeHtml(shot.soundCue.mixRisk)}</p>
            </div>
          </article>`,
          )
          .join('')}
      </section>
      ${analysis.risks.length ? `<section><h2>制作提醒</h2>${analysis.risks.map((risk) => `<p>• ${escapeHtml(risk)}</p>`).join('')}</section>` : ''}
      ${
        analysis.seedAudio
          ? `<section><h2>SeedAudio Brief</h2>
        <p><b>Delivery：</b>${escapeHtml(analysis.seedAudio.recommendedMode)} · <b>content_mode：</b>${escapeHtml(analysis.seedAudio.contentMode)}</p>
        <p>${escapeHtml(analysis.seedAudio.projectContext)}</p>
        <p><b>Speaker / VO：</b>${escapeHtml(analysis.seedAudio.speakerVo)}</p>
        <p><b>Music：</b>${escapeHtml(analysis.seedAudio.music)}</p>
        <p><b>SFX / Ambience：</b>${escapeHtml(analysis.seedAudio.sfxAmbience)}</p>
        <p><b>Mix：</b>${escapeHtml(analysis.seedAudio.mix)}</p>
        ${analysis.seedAudio.avoid.length ? `<p><b>Avoid：</b>${escapeHtml(analysis.seedAudio.avoid.join('、'))}</p>` : ''}
        <pre>${escapeHtml(analysis.seedAudio.textPrompt)}</pre>
      </section>`
          : ''
      }
    `
        : `
      <section class="metrics">
        <div><small>UCS ID</small><strong>${escapeHtml(analysis.sfx.ucsCatId)}</strong></div>
        <div><small>Category</small><strong>${escapeHtml(analysis.sfx.ucsCategory)}</strong></div>
        <div><small>Subcategory</small><strong>${escapeHtml(analysis.sfx.ucsSubCategory)}</strong></div>
      </section>
      <section><h2>声音原理</h2><p>${escapeHtml(analysis.educationalContext)}</p></section>
      <section><h2>拟音方案</h2><p>${escapeHtml(analysis.sfx.foleyInstructions)}</p></section>
      <section><h2>可用替代物</h2><p>${escapeHtml(analysis.sfx.accessibleAlternatives)}</p></section>
      <section><h2>音画同步建议</h2><p>${escapeHtml(analysis.sfx.visualSyncTips)}</p></section>
    `;

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
  <title>SonicLens — ${escapeHtml(title)}</title>
  <style>
    :root{color-scheme:light;font-family:ui-sans-serif,system-ui,sans-serif;background:#eeede7;color:#151b17}body{max-width:860px;margin:auto;padding:64px 28px 96px;line-height:1.75}header{padding-bottom:36px;border-bottom:1px solid #c5c8c3}small{display:block;color:#59695f;font:11px ui-monospace,monospace;letter-spacing:.08em}h1{max-width:700px;margin:18px 0 12px;font-size:48px;line-height:1.05;letter-spacing:-.045em}h2{margin:0 0 18px;font-size:22px;letter-spacing:-.02em}section{margin-top:42px}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.metrics div{padding:18px;border:1px solid #c5c8c3;border-radius:10px;background:#f8f7f2}.metrics strong{display:block;margin-top:8px;font:18px ui-monospace,monospace;color:#176b45}.tag{display:inline-block;margin:0 7px 7px 0;padding:5px 9px;border:1px solid #c5c8c3;border-radius:6px;color:#39483f;font-size:12px}.row{display:grid;grid-template-columns:110px 1fr;gap:20px;padding:20px 0;border-top:1px solid #d4d6d1}.row code{color:#176b45}.row small{margin-top:5px}.row p{margin:8px 0 0;color:#39483f;font-size:13px}pre{white-space:pre-wrap;border-radius:10px;background:#18201a;color:#eef3ef;padding:18px;font:12px/1.7 ui-monospace,monospace}footer{margin-top:64px;padding-top:20px;border-top:1px solid #c5c8c3;color:#59695f;font-size:11px}@media(max-width:600px){h1{font-size:36px}.metrics{grid-template-columns:1fr}.row{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <header><small>${analysis.type === 'music' ? 'MUSIC ANALYSIS' : analysis.type === 'video' ? 'VIDEO ANALYSIS' : 'SFX ANALYSIS'} · SONICLENS</small><h1>${escapeHtml(title)}</h1><p>${escapeHtml(fileName)}</p></header>
  ${detail}
  ${analysis.type === 'video' ? '' : `<section><h2>搜索关键词</h2>${renderTags(analysis.keywords)}</section>`}
  <footer>Generated locally by SonicLens</footer>
</body>
</html>`;
};

const triggerDownload = (href: string, download: string) => {
  const link = document.createElement('a');
  link.href = href;
  link.download = download;
  link.click();
};

export default function ExportMenu({ analysis, contentRef, fileName }: ExportMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const safeFileName = fileName.replace(/\.[^/.]+$/, '').replace(/[\\/:*?"<>|]/g, '-');

  useEffect(() => {
    if (!isOpen) return;
    const closeMenu = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || !menuRef.current?.contains(target)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', closeMenu);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeMenu);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  const captureReport = async (format: 'jpeg' | 'png'): Promise<string> => {
    if (!contentRef.current) throw new Error('报告内容尚未准备好。');
    const { toJpeg, toPng } = await import('html-to-image');
    const collapsedDetails = Array.from(
      contentRef.current.querySelectorAll<HTMLDetailsElement>('details:not([open])'),
    );
    const options = {
      backgroundColor: '#eeede7',
      cacheBust: true,
      pixelRatio: 2,
      skipFonts: true,
      filter: (node: HTMLElement) =>
        !(node instanceof HTMLElement && node.dataset.exportIgnore === 'true'),
    };

    collapsedDetails.forEach((details) => {
      details.open = true;
    });
    try {
      return format === 'jpeg'
        ? await toJpeg(contentRef.current, { ...options, quality: 0.88 })
        : await toPng(contentRef.current, options);
    } finally {
      collapsedDetails.forEach((details) => {
        details.open = false;
      });
    }
  };

  const runExport = async (action: () => Promise<void>) => {
    setError(null);
    setIsExporting(true);
    try {
      await action();
      setIsOpen(false);
    } catch (exportError: unknown) {
      setError(exportError instanceof Error ? exportError.message : '导出失败，请重试。');
    } finally {
      setIsExporting(false);
    }
  };

  const exportPng = () =>
    runExport(async () => {
      triggerDownload(await captureReport('png'), `SonicLens_${safeFileName}.png`);
    });

  const exportPdf = () =>
    runExport(async () => {
      const { jsPDF } = await import('jspdf');
      const dataUrl = await captureReport('jpeg');
      const image = new Image();
      image.src = dataUrl;
      await image.decode();
      const pdf = new jsPDF({
        orientation: image.width > image.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [image.width, image.height],
      });
      pdf.addImage(dataUrl, 'JPEG', 0, 0, image.width, image.height, undefined, 'FAST');
      pdf.save(`SonicLens_${safeFileName}.pdf`);
    });

  const exportHtml = () =>
    runExport(async () => {
      const blob = new Blob([createHtmlReport(analysis, fileName)], {
        type: 'text/html;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      triggerDownload(url, `SonicLens_${safeFileName}.html`);
      URL.revokeObjectURL(url);
    });

  return (
    <div ref={menuRef} className="relative shrink-0" data-export-ignore="true">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        disabled={isExporting}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="inline-flex h-10 items-center gap-2 rounded-lg border hairline px-3.5 text-xs font-semibold hover:border-[var(--line-strong)] hover:bg-black/[0.035] disabled:opacity-50"
      >
        {isExporting ? <LoaderCircle size={15} className="animate-spin" /> : <Download size={15} />}
        {isExporting ? '正在导出' : '导出报告'}
        <ChevronDown size={13} className={isOpen ? 'rotate-180' : ''} />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute top-full right-0 z-50 mt-2 w-52 overflow-hidden rounded-lg border hairline bg-[var(--surface-raised)] p-1.5"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => void exportPng()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs text-[var(--text-muted)] hover:bg-black/[0.045] hover:text-[var(--text)]"
          >
            <FileImage size={15} className="accent-text" /> 图片 · PNG
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => void exportPdf()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs text-[var(--text-muted)] hover:bg-black/[0.045] hover:text-[var(--text)]"
          >
            <FileText size={15} className="accent-text" /> 文档 · PDF
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => void exportHtml()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs text-[var(--text-muted)] hover:bg-black/[0.045] hover:text-[var(--text)]"
          >
            <FileCode2 size={15} className="accent-text" /> 网页 · HTML
          </button>
        </div>
      )}
      {error && (
        <p
          className="absolute top-full right-0 mt-2 w-64 text-right text-xs text-[var(--danger)]"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { Download, FileImage, FileText, FileCode, ChevronDown, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { MusicAnalysisResult } from '../types';

interface ExportMenuProps {
  analysis: MusicAnalysisResult;
  fileName: string;
  contentRef: React.RefObject<HTMLDivElement | null>;
}

const ExportMenu: React.FC<ExportMenuProps> = ({ analysis, fileName, contentRef }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const safeFileName = fileName.replace(/\.[^/.]+$/, "");

  const handleExportImage = async () => {
    if (!contentRef.current) return;
    setIsExporting(true);
    
    try {
      const dataUrl = await toPng(contentRef.current, {
        backgroundColor: '#0f172a',
        quality: 1,
        pixelRatio: 2,
        width: 1200,
        filter: (node: HTMLElement) => {
           // Ignore players and the export menu itself
           if (node.getAttribute && node.getAttribute('data-html2canvas-ignore')) return false;
           // Hide normal buttons (like play/reset) but keep functional glass-panels if needed
           if (node.tagName === 'BUTTON' && node.innerText && !node.classList?.contains('glass-panel')) return false;
           return true;
        },
        style: {
          width: '1200px',
          display: 'block', // Ensure block context
          transform: 'none',
          animation: 'none',
          margin: '0',
          borderRadius: '0'
        }
      });

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `SonicLens_Analysis_${safeFileName}.png`;
      link.click();
    } catch (err) {
      console.error("Image export failed", err);
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  const handleExportPDF = async () => {
    if (!contentRef.current) return;
    setIsExporting(true);
    
    try {
      const dataUrl = await toPng(contentRef.current, {
        backgroundColor: '#0f172a',
        quality: 1,
        pixelRatio: 2,
        width: 1200,
        filter: (node: HTMLElement) => {
           if (node.getAttribute && node.getAttribute('data-html2canvas-ignore')) return false;
           return true;
        },
        style: {
          width: '1200px',
          display: 'block',
          transform: 'none',
          animation: 'none',
          margin: '0',
          borderRadius: '0'
        }
      });

      // Create temporary image to get dimensions
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => { img.onload = resolve; });

      const pdf = new jsPDF({
        orientation: img.width > img.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [img.width, img.height]
      });

      pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height);
      pdf.save(`SonicLens_Report_${safeFileName}.pdf`);
    } catch (err) {
      console.error("PDF export failed", err);
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  const handleExportHTML = () => {
    setIsExporting(true);
    try {
      const isSFX = analysis.type === 'sfx';
      const mainTitle = isSFX && analysis.sfx ? analysis.sfx.name : (analysis.mainGenre || 'Unknown');
      
      const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SonicLens Report - ${safeFileName}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; background: #050505; color: #f8fafc; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
  h1 { color: #ff4e00; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 10px; }
  h2 { color: #e2e8f0; margin-top: 30px; }
  .tag { display: inline-block; background: rgba(255, 255, 255, 0.05); padding: 4px 10px; border-radius: 4px; margin-right: 8px; margin-bottom: 8px; font-size: 0.9em; border: 1px solid rgba(255, 255, 255, 0.1); }
  .highlight { color: #ff4e00; font-weight: bold; }
  .ucs-badge { background: #064e3b; color: #34d399; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 0.9em; }
  .card { background: rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 1px solid rgba(255, 255, 255, 0.1); }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
  .stat-label { font-size: 0.8em; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; display: block; margin-bottom: 5px; }
  .stat-value { font-size: 1.5em; font-weight: bold; }
  .timeline-item { padding: 15px; border-left: 3px solid #ff4e00; background: rgba(255, 255, 255, 0.05); margin-bottom: 10px; }
  .time-badge { background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.1); padding: 2px 8px; border-radius: 4px; font-family: monospace; color: #ff4e00; font-size: 0.8em; }
  a { color: #ff4e00; text-decoration: none; }
  .footer { margin-top: 50px; font-size: 0.8em; color: #64748b; text-align: center; }
</style>
</head>
<body>
  <h1>SonicLens 分析报告 (${analysis.type === 'sfx' ? 'SFX' : 'Music'})</h1>
  <p><strong>文件:</strong> ${fileName}</p>
  <p><strong>识别结果:</strong> <span class="highlight">${mainTitle}</span></p>

  ${isSFX && analysis.sfx ? `
      <div class="card">
        <span class="ucs-badge">UCS: ${analysis.sfx.ucsCatId} / ${analysis.sfx.ucsCategory} / ${analysis.sfx.ucsSubCategory}</span>
      </div>
      <h2>拟音指南 (Foley)</h2>
      <div class="card">
         <p>${analysis.sfx.foleyInstructions}</p>
      </div>
      <h2>替代方案</h2>
      <div class="card">
         <p>${analysis.sfx.accessibleAlternatives}</p>
      </div>
  ` : `
      <div class="grid">
        <div class="card">
            <span class="stat-label">BPM</span>
            <span class="stat-value">${analysis.bpm}</span>
        </div>
        <div class="card">
            <span class="stat-label">调式 Key</span>
            <span class="stat-value">${analysis.key}</span>
        </div>
        <div class="card">
            <span class="stat-label">拍号 Time Sig</span>
            <span class="stat-value">${analysis.timeSignature}</span>
        </div>
    </div>
    
    ${analysis.segments && analysis.segments.length > 0 ? `
      <h2>时间轴分析 (Timeline)</h2>
      <div>
         ${analysis.segments.map(s => `
            <div class="timeline-item">
               <span class="time-badge">${s.timestamp}</span>
               <strong style="margin-left: 10px; color: #e2e8f0;">${s.genre}</strong>
               <span style="color: #94a3b8; font-size: 0.9em; margin-left: 5px;">#${s.mood}</span>
               <p style="margin-top: 5px; color: #cbd5e1;">${s.description}</p>
            </div>
         `).join('')}
      </div>
    ` : ''}

    <h2>风格分析</h2>
    <div class="card">
        <p>${analysis.educationalContext}</p>
    </div>
  `}

  ${!isSFX ? `
      <h2>检测到的乐器</h2>
      <div>
        ${analysis.instruments?.map(i => `<span class="tag">${i}</span>`).join('')}
      </div>

      <h2>情绪 Mood</h2>
      <div>
        ${analysis.mood?.map(m => `<span class="tag">#${m}</span>`).join('')}
      </div>

      <h2>参考曲目 Reference Tracks</h2>
      <div class="card">
        <ul style="list-style: none; padding: 0;">
        ${analysis.similarTracks?.map(t => `
            <li style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #334155;">
                <strong>${t.title}</strong> - ${t.artist}
            </li>
        `).join('')}
        </ul>
      </div>
  ` : ''}

  <h2>搜索关键词 (English)</h2>
  <div>
      ${analysis.keywords.map(k => `<span class="tag">${k}</span>`).join('')}
  </div>

  <div class="footer">
      Generated by SonicLens AI
  </div>
</body>
</html>
      `;
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SonicLens_Report_${safeFileName}.html`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("HTML export failed", err);
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="flex items-center gap-2 bg-[var(--color-accent)] hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-[var(--color-accent)]/20 disabled:opacity-70"
      >
        {isExporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
        导出结果
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
          <button onClick={handleExportImage} className="w-full text-left px-4 py-3 hover:bg-white/10 flex items-center gap-3 text-slate-200 text-sm transition-colors">
            <FileImage size={16} className="text-purple-400" /> 导出图片 (PNG)
          </button>
          <button onClick={handleExportPDF} className="w-full text-left px-4 py-3 hover:bg-white/10 flex items-center gap-3 text-slate-200 text-sm border-t border-white/5 transition-colors">
            <FileText size={16} className="text-red-400" /> 导出文档 (PDF)
          </button>
          <button onClick={handleExportHTML} className="w-full text-left px-4 py-3 hover:bg-white/10 flex items-center gap-3 text-slate-200 text-sm border-t border-white/5 transition-colors">
            <FileCode size={16} className="text-emerald-400" /> 导出网页 (HTML)
          </button>
        </div>
      )}

      {/* Backdrop to close */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
};

export default ExportMenu;
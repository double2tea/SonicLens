import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Music, Activity, Clock, Disc, FileAudio, Info, Mic2, AlertTriangle, Loader2, ListMusic, ExternalLink, Sparkles, Hammer, Tag, Volume2, Layers, PlayCircle, RotateCcw as RotateCcwIcon, Search, Settings } from 'lucide-react';
import FileUpload from './components/FileUpload';
import AnalysisVisualizer from './components/AnalysisVisualizer';
import StockLinks from './components/StockLinks';
import WaveformPlayer, { WaveformPlayerRef } from './components/WaveformPlayer';
import ExportMenu from './components/ExportMenu';
import PromptGenerator from './components/PromptGenerator';
import SettingsModal from './components/SettingsModal';
import { analyzeMusicMedia } from './services/geminiService';
import { convertToWav } from './services/audioUtils';
import { MusicAnalysisResult, AnalysisState } from './types';

// Stat Card Component Helper
const StatCard = ({ icon, label, value, isLongText = false }: { icon: React.ReactNode, label: string, value: string | number, isLongText?: boolean }) => (
  <div className="glass-panel p-4 flex flex-col justify-between h-full">
    <div className="flex items-center gap-2 mb-2 text-slate-400">
      <div className="text-[var(--color-accent)]">{icon}</div>
      <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
    </div>
    <div className={`${isLongText ? 'text-sm font-medium leading-tight' : 'text-2xl font-mono font-bold'} text-slate-100`}>
      {value}
    </div>
  </div>
);

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<MusicAnalysisResult | null>(null);
  const [status, setStatus] = useState<AnalysisState>(AnalysisState.IDLE);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [analysisMode, setAnalysisMode] = useState<'music' | 'sfx'>('music');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Ref for the content we want to export
  const resultsRef = useRef<HTMLDivElement>(null);
  // Ref for the audio player to control seeking
  const playerRef = useRef<WaveformPlayerRef>(null);

  const handleFileSelect = async (selectedFile: File) => {
    let fileToAnalyze = selectedFile;
    setFile(selectedFile);
    setAnalysis(null);
    setErrorMsg(null);
    
    // If it's MP4 video, we extract audio first
    if (selectedFile.type === 'video/mp4') {
      setStatus(AnalysisState.CONVERTING);
      try {
        fileToAnalyze = await convertToWav(selectedFile);
        // We set the "file" state to the converted audio if we want to preview it as audio
        // But for video preview, we might want to keep the original. 
        // However, WaveformPlayer is designed for audio, and the user wants "mp3 analysis".
        setFile(fileToAnalyze);
      } catch (err: any) {
        console.error("Audio extraction failed", err);
        setStatus(AnalysisState.ERROR);
        setErrorMsg("视频音频提取失败，请确保文件未损坏。");
        return;
      }
    }
    
    setStatus(AnalysisState.ANALYZING);

    try {
      const customApiKey = localStorage.getItem('CUSTOM_GEMINI_API_KEY') || undefined;
      const result = await analyzeMusicMedia(fileToAnalyze, analysisMode, customApiKey);
      setAnalysis(result);
      setStatus(AnalysisState.COMPLETE);
    } catch (err: any) {
      console.error(err);
      setStatus(AnalysisState.ERROR);
      setErrorMsg(err.message || "分析文件失败。");
    }
  };

  const handleReset = () => {
    setFile(null);
    setAnalysis(null);
    setStatus(AnalysisState.IDLE);
  };

  // Parses "MM:SS" string to seconds
  const parseTimestamp = (timeStr: string): number => {
    try {
        // Extracts the first "MM:SS" if it's a range like "00:00 - 01:20"
        const match = timeStr.match(/(\d+):(\d+)/);
        if (match) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            return minutes * 60 + seconds;
        }
        return 0;
    } catch (e) {
        return 0;
    }
  };

  const handleJumpToSegment = (timestamp: string) => {
    if (playerRef.current) {
        const seconds = parseTimestamp(timestamp);
        playerRef.current.seekTo(seconds);
    }
  };

  return (
    <div className="min-h-screen font-sans selection:bg-[var(--color-accent)]/30 relative z-0">
      <div className="atmosphere"></div>
      
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--color-accent)] rounded-lg flex items-center justify-center shadow-lg shadow-[var(--color-accent)]/20">
              <Activity className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">SonicLens <span className="text-xs font-normal text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-1.5 py-0.5 rounded border border-[var(--color-accent)]/20">Gemini 3.5 Flash</span></h1>
              <p className="text-xs text-slate-400">AI 声音监管助手</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             {status === AnalysisState.COMPLETE && analysis && file && (
               <ExportMenu analysis={analysis} fileName={file.name} contentRef={resultsRef} />
             )}
             
             <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="设置"
              >
                <Settings size={20} />
              </button>

             <button 
                onClick={handleReset}
                className="text-sm font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-2"
              >
                <RotateCcwIcon size={16} /> <span className="hidden sm:inline">新分析</span>
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        
        {/* API Key Check */}
        {!process.env.API_KEY && (
           <div className="bg-red-500/10 border border-red-500 text-red-400 p-4 rounded-xl mb-8 flex items-center gap-3">
             <AlertTriangle />
             <p>API Key 未配置。请在环境中设置 REACT_APP_API_KEY。</p>
           </div>
        )}

        {/* State: IDLE / UPLOAD */}
        {status === AnalysisState.IDLE && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.5 }}
            className="max-w-2xl mx-auto mt-12"
          >
            <div className="text-center mb-8">
              <h2 className="text-4xl font-extrabold mb-4 text-white">
                听见每一个细节。
              </h2>
              <p className="text-lg text-slate-400">
                请选择分析模式，AI 将为您分析曲风、乐器、节奏、曲调及节拍。
              </p>
            </div>

            {/* Mode Selector */}
            <div className="flex justify-center mb-8">
              <div className="glass-panel p-1.5 flex">
                <button 
                  onClick={() => setAnalysisMode('music')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${analysisMode === 'music' ? 'bg-[var(--color-accent)] text-white shadow-lg shadow-[var(--color-accent)]/30' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  <Music size={18} /> 音乐分析 (Music)
                </button>
                <button 
                  onClick={() => setAnalysisMode('sfx')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${analysisMode === 'sfx' ? 'bg-[#00f0ff] text-black shadow-lg shadow-[#00f0ff]/30' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  <Volume2 size={18} /> 音效分析 (SFX)
                </button>
              </div>
            </div>

            <FileUpload onFileSelect={handleFileSelect} disabled={false} mode={analysisMode} />
          </motion.div>
        )}

        {/* State: CONVERTING */}
        {status === AnalysisState.CONVERTING && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="max-w-2xl mx-auto mt-20 text-center"
          >
            <div className="inline-block relative mb-8">
              <div className={`w-32 h-32 rounded-full border-4 border-white/20 border-t-white animate-pulse`}></div>
               <div className="absolute inset-0 flex items-center justify-center">
                 <Loader2 className={`w-10 h-10 text-white animate-spin`} />
               </div>
            </div>
            <h3 className="text-2xl font-semibold mb-2">正在提取视频音频...</h3>
            <p className="text-slate-400">
              正在从 MP4 视频中提取高质量音频流以进行深度 AI 分析。
            </p>
          </motion.div>
        )}

        {/* State: ANALYZING */}
        {status === AnalysisState.ANALYZING && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="max-w-2xl mx-auto mt-20 text-center"
          >
            <div className="inline-block relative mb-8">
              <div className={`w-32 h-32 rounded-full border-4 ${analysisMode === 'music' ? 'border-[var(--color-accent)]/20 border-t-[var(--color-accent)]' : 'border-[#00f0ff]/20 border-t-[#00f0ff]'} animate-spin`}></div>
               <div className="absolute inset-0 flex items-center justify-center">
                 <Sparkles className={`w-10 h-10 ${analysisMode === 'music' ? 'text-[var(--color-accent)]' : 'text-[#00f0ff]'} animate-pulse`} />
               </div>
            </div>
            <h3 className="text-2xl font-semibold mb-2">正在分析 {analysisMode === 'music' ? '音乐' : '音效'}...</h3>
            <p className="text-slate-400">
              {analysisMode === 'music' 
                ? '正在深入分析波形、流派、分段节奏及乐器构成...' 
                : '识别 UCS 分类、Foley 拟音方案及材质分析。'}
            </p>
            {file && (
                <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 glass-panel text-sm text-slate-400">
                    <FileAudio size={14} />
                    <span className="truncate max-w-[200px]">{file.name}</span>
                </div>
            )}
          </motion.div>
        )}

        {/* State: ERROR */}
        {status === AnalysisState.ERROR && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="max-w-2xl mx-auto mt-12 text-center"
          >
             <div className="bg-red-500/10 border border-red-500/50 p-8 rounded-3xl">
               <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
               <h3 className="text-xl font-bold text-red-400">分析失败</h3>
               <p className="text-slate-400 mt-2 mb-6">{errorMsg}</p>
               <button 
                  onClick={handleReset}
                  className="glass-panel hover:bg-white/10 text-white px-8 py-3 rounded-full font-medium transition-colors shadow-lg"
               >
                 重试
               </button>
             </div>
          </motion.div>
        )}

        {/* State: COMPLETE */}
        {status === AnalysisState.COMPLETE && analysis && (
          <motion.div 
            initial={{ opacity: 0, y: 40 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.7 }}
            ref={resultsRef}
          >
            
            {/* Top Bar: Player & Primary Info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* Left: Player & Basic Meta */}
              <div className="lg:col-span-2 glass-panel p-8 relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-80 h-80 ${analysis.type === 'music' ? 'bg-[var(--color-accent)]/10' : 'bg-[#00f0ff]/10'} blur-[100px] rounded-full pointer-events-none`}></div>
                
                <div className="flex flex-col md:flex-row items-start justify-between mb-8 gap-4">
                   <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        {analysis.type === 'music' ? (
                            <>
                                <span className="bg-[var(--color-accent)] text-white text-xs font-bold px-3 py-1 rounded-md uppercase tracking-wider shadow-lg shadow-[var(--color-accent)]/30">
                                {analysis.mainGenre || "Music"}
                                </span>
                                {analysis.subGenres?.map(sub => (
                                <span key={sub} className="glass-panel text-slate-300 text-xs font-medium px-2 py-1 rounded">
                                    {sub}
                                </span>
                                ))}
                            </>
                        ) : (
                            <span className="bg-[#00f0ff] text-black text-xs font-bold px-3 py-1 rounded-md uppercase tracking-wider shadow-lg shadow-[#00f0ff]/30 flex items-center gap-1">
                                <Sparkles size={12} /> Sound Effect (SFX)
                            </span>
                        )}
                      </div>
                      
                      {/* SFX Specific Heading */}
                      {analysis.type === 'sfx' && analysis.sfx ? (
                          <>
                            <h2 className="text-3xl font-bold text-white mb-2">{analysis.sfx.name}</h2>
                            <div className="flex items-center gap-2 text-[#00f0ff] font-mono text-sm bg-[#00f0ff]/10 px-3 py-1.5 rounded-lg border border-[#00f0ff]/20 w-fit">
                                <Tag size={14} />
                                <span>UCS: {analysis.sfx.ucsCatId} / {analysis.sfx.ucsCategory} / {analysis.sfx.ucsSubCategory}</span>
                            </div>
                          </>
                      ) : (
                          <h2 className="text-3xl font-bold text-white mb-1">音乐分析报告</h2>
                      )}

                      <p className="text-slate-400 text-sm font-mono truncate max-w-md mt-2">{file?.name}</p>
                   </div>
                </div>

                {/* Waveform Player */}
                {file && (
                    <div className="mb-8" data-html2canvas-ignore="true">
                        <WaveformPlayer ref={playerRef} file={file} autoPlay={false} />
                    </div>
                )}

                {/* Conditional Stats */}
                {analysis.type === 'music' ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard icon={<Activity size={18} />} label="AVG BPM" value={analysis.bpm || '-'} />
                        <StatCard icon={<Clock size={18} />} label="拍号" value={analysis.timeSignature || '-'} />
                        <StatCard icon={<Music size={18} />} label="主调式" value={analysis.key || '-'} />
                        <StatCard icon={<Disc size={18} />} label="律动" value={analysis.rhythmDescription || '-'} isLongText />
                    </div>
                ) : (
                    <div className="glass-panel p-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                             <Mic2 size={14} /> 声音来源 / 描述
                        </h4>
                        <p className="text-slate-200 text-sm leading-relaxed">{analysis.educationalContext}</p>
                    </div>
                )}
                
                {analysis.type === 'music' && (
                    <div className="mt-8">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Mic2 size={14} /> 包含的所有乐器
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {analysis.instruments?.map(inst => (
                            <div key={inst} className="flex items-center gap-2 glass-panel px-3 py-1.5 rounded-full text-sm text-slate-300">
                                {inst}
                            </div>
                            ))}
                        </div>
                    </div>
                )}
              </div>

              {/* Right: Visualization & Mood (Only for Music) */}
              {analysis.type === 'music' && analysis.sonicProfile && (
                <div className="glass-panel p-6 flex flex-col">
                    <AnalysisVisualizer profile={analysis.sonicProfile} />
                    
                    <div className="mt-6">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">情绪基调</h4>
                        <div className="flex flex-wrap gap-2">
                            {analysis.mood?.map((m, idx) => (
                            <span key={idx} className="text-sm font-medium text-white bg-gradient-to-r from-[var(--color-accent)] to-orange-500 px-3 py-1 rounded-md shadow-sm">
                                #{m}
                            </span>
                            ))}
                        </div>
                    </div>

                    <div className="mt-8 border-t border-white/10 pt-6">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">风格科普</h4>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            {analysis.educationalContext}
                        </p>
                    </div>
                </div>
              )}

              {/* Right: Foley & Tips (Only for SFX) */}
              {analysis.type === 'sfx' && analysis.sfx && (
                <div className="glass-panel p-6 flex flex-col gap-6">
                     <div>
                        <h4 className="text-xs font-bold text-[#00f0ff] uppercase tracking-wider mb-3 flex items-center gap-2">
                             <Hammer size={16} /> Foley 拟音指南
                        </h4>
                        <div className="bg-black/20 p-4 rounded-xl text-sm text-slate-200 leading-relaxed border-l-4 border-[#00f0ff]">
                             {analysis.sfx.foleyInstructions}
                        </div>
                     </div>
                     
                     <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                             生活中的替代音源
                        </h4>
                        <p className="text-sm text-slate-300">{analysis.sfx.accessibleAlternatives}</p>
                     </div>
                </div>
              )}
            </div>

            {/* Video Editor Cue Points (New - Gemini 3.5 Feature) */}
            {analysis.type === 'music' && analysis.editorCuePoints && analysis.editorCuePoints.length > 0 && (
                <div className="glass-panel p-8 mb-8 relative border border-white/5 overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-slate-500/5 blur-[80px] rounded-full pointer-events-none"></div>
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Sparkles className="text-[var(--color-accent)] animate-pulse" size={20} /> 
                    影视剪辑画面卡点卡槽指南 (点击跳转卡点)
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {analysis.editorCuePoints.map((cue, idx) => (
                       <button
                         key={idx}
                         onClick={() => handleJumpToSegment(cue.timestamp)}
                         className="text-left bg-white/5 border border-white/5 hover:border-[var(--color-accent)]/30 p-4 rounded-xl transition-all hover:bg-white/10 flex gap-4 group"
                       >
                         {/* Timing Badge */}
                         <div className="flex-shrink-0">
                           <span className="font-mono text-sm bg-[var(--color-accent)]/10 text-[var(--color-accent)] px-2 py-1 rounded border border-[var(--color-accent)]/20 font-bold group-hover:bg-[var(--color-accent)] group-hover:text-white transition-all">
                             {cue.timestamp}
                           </span>
                         </div>
                         {/* Content */}
                         <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-2 mb-1">
                             <span className="font-semibold text-slate-100 truncate text-[15px]">{cue.eventName}</span>
                           </div>
                           <p className="text-xs text-slate-400 mb-2 truncate" title={cue.vibeChange}>
                             听感: {cue.vibeChange}
                           </p>
                           <p className="text-[13px] text-slate-300 font-medium leading-relaxed bg-black/20 p-2.5 rounded border border-white/5">
                             {cue.visualAdvice}
                           </p>
                         </div>
                       </button>
                     ))}
                  </div>
                </div>
            )}

            {/* Timeline / Segments Section (New - Enhanced) */}
            {analysis.type === 'music' && analysis.segments && analysis.segments.length > 0 && (
                <div className="glass-panel p-8 mb-8">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Layers className="text-[var(--color-accent)]" /> 
                    时间轴详情 (点击时间跳转)
                  </h3>
                  <div className="space-y-4">
                    {analysis.segments.map((seg, i) => (
                      <button 
                        key={i} 
                        onClick={() => handleJumpToSegment(seg.timestamp)}
                        className="w-full text-left glass-panel p-5 flex flex-col lg:flex-row gap-5 items-start hover:bg-white/10 transition-all group relative overflow-hidden"
                      >
                         {/* Hover Highlight */}
                        <div className="absolute inset-0 bg-[var(--color-accent)]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                        {/* Timestamp & Play Icon */}
                        <div className="flex-shrink-0 flex flex-col items-center gap-2 min-w-[100px]">
                            <div className="bg-black/40 text-[var(--color-accent)] font-mono text-sm px-3 py-1.5 rounded-lg border border-[var(--color-accent)]/20 whitespace-nowrap shadow-sm font-bold flex items-center gap-2">
                                {seg.timestamp}
                            </div>
                            <div className="text-[var(--color-accent)] opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 text-xs font-medium flex items-center gap-1">
                                <PlayCircle size={14} /> 点击播放
                            </div>
                        </div>

                        <div className="flex-1 w-full">
                            {/* Header: Genre & Mood */}
                            <div className="flex flex-wrap items-center gap-3 mb-3">
                              <span className="font-bold text-slate-100 text-lg">{seg.genre}</span>
                              <span className="text-xs text-orange-200 bg-[var(--color-accent)]/20 px-2 py-0.5 rounded border border-[var(--color-accent)]/20">
                                {seg.mood}
                              </span>
                            </div>

                            {/* Detailed Stats Grid (BPM/Key/Instruments) */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                                {seg.bpm && (
                                    <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-black/20 px-2 py-1 rounded">
                                        <Activity size={12} className="text-[var(--color-accent)]"/> 
                                        <span>BPM: <span className="text-slate-200 font-mono">{seg.bpm}</span></span>
                                    </div>
                                )}
                                {seg.key && (
                                    <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-black/20 px-2 py-1 rounded">
                                        <Music size={12} className="text-[var(--color-accent)]"/> 
                                        <span>Key: <span className="text-slate-200 font-mono">{seg.key}</span></span>
                                    </div>
                                )}
                            </div>
                            
                             {/* Segment Instruments */}
                             {seg.instruments && seg.instruments.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                    {seg.instruments.map((inst, idx) => (
                                        <span key={idx} className="text-[10px] uppercase font-bold text-slate-500 bg-black/40 border border-white/10 px-2 py-0.5 rounded">
                                            {inst}
                                        </span>
                                    ))}
                                </div>
                             )}

                            <p className="text-slate-300 text-sm leading-relaxed">{seg.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
            )}

            {/* Prompt Generator Section */}
            {analysis.optimizedPrompt && (
                <PromptGenerator prompt={analysis.optimizedPrompt} type={analysis.type} />
            )}

            {/* Similar Tracks */}
            {analysis.similarTracks && analysis.similarTracks.length > 0 && (
                <div className="glass-panel p-8 mt-8">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <ListMusic className="text-[var(--color-accent)]" /> 
                        相似曲目
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {analysis.similarTracks.map((track, i) => (
                            <div key={i} className="glass-panel p-5 flex flex-col gap-3 group hover:border-[var(--color-accent)]/50 transition-colors">
                                <div className="flex items-start justify-between">
                                  <div>
                                      <div className="font-bold text-white text-lg group-hover:text-[var(--color-accent)] transition-colors">{track.title}</div>
                                      <div className="text-sm text-slate-400">{track.artist}</div>
                                  </div>
                                  <Disc className="text-slate-600 group-hover:text-[var(--color-accent)] transition-colors opacity-50 group-hover:opacity-100" />
                                </div>
                                {/* Per-track stock links */}
                                <div className="border-t border-white/10 pt-2">
                                  <StockLinks 
                                    variant="compact" 
                                    customQuery={`${track.title} ${track.artist} style`} 
                                  />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Stock Links */}
            <div className="glass-panel p-8 mt-8">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Search className={analysis.type === 'music' ? 'text-[var(--color-accent)]' : 'text-[#00f0ff]'} /> 
                    素材库搜索资源
                </h3>
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
                    基于整体分析的素材库搜索
                </h4>
                <StockLinks keywords={analysis.keywords} genre={analysis.mainGenre} variant="grid" type={analysis.type} />
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

export default App;
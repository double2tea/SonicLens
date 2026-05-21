import React, { useState, useEffect } from 'react';
import { Sparkles, Copy, Check, ExternalLink, Wand2, RefreshCw, AudioLines, Minimize, HelpCircle } from 'lucide-react';

interface PromptGeneratorProps {
  prompt: string;
  type: 'music' | 'sfx';
}

const PromptGenerator: React.FC<PromptGeneratorProps> = ({ prompt: originalPrompt, type }) => {
  const [copied, setCopied] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);
  const [customPrompt, setCustomPrompt] = useState(originalPrompt);

  // Custom Options States
  const [targetEngine, setTargetEngine] = useState<'default' | 'suno' | 'udio' | 'stable'>('default');
  const [musicVibe, setMusicVibe] = useState<'none' | 'cinematic' | 'vintage' | 'cyber' | 'haunting'>('none');
  const [vocalMode, setVocalMode] = useState<'none' | 'instrumental' | 'female' | 'male' | 'acoustic'>('none');
  
  const [sfxSpace, setSfxSpace] = useState<'none' | 'dry' | 'cathedral' | 'chiptune'>('none');
  const [sfxKinetic, setSfxKinetic] = useState<'none' | 'impact' | 'loop'>('none');

  // Multi-option prompt generation logic
  useEffect(() => {
    let p = originalPrompt.trim();
    if (p.endsWith('.')) {
      p = p.slice(0, -1);
    }

    if (type === 'music') {
      // 1. Apply Music Vibe enhancements
      const vibeAdditions = {
        none: '',
        cinematic: 'epic cinematic orchestral arrangement, dramatic dynamic build-up, sweeping brass swells, massive staccato string stabs, masterly theatrical crescendo, cinematic tension',
        vintage: 'lo-fi vintage tape warmth, warm analog saturation, retro wow and flutter, nostalgic 1970s tape machine saturation, vinyl record crackle, dusty room ambiance',
        cyber: 'cybernetic synthwave club beat, heavy modular synthesizer filter sweep, future electronic sub-bass, pulsing neon arpeggio, industrial glitch textures',
        haunting: 'haunting dark soundscape, suspenseful drone orchestration, melancholic atmospheric pads, ominous background tension, hollow desolate reverb'
      };

      // 2. Apply Vocal mode enhancements
      const vocalAdditions = {
        none: '',
        instrumental: 'pure high-definition instrumental solo, absolute zero vocals, tight focus on instrumental layering, clean mix',
        female: 'featuring expressive soulful female lead vocals, soaring emotional soprano voice, melodic sung narrative, high-fidelity vocal clarity',
        male: 'featuring intimate raw baritone male lead vocals, raspy acoustic singer-songwriter delivery, genuine storytelling style, close-up warm microphone tracking',
        acoustic: 'fully unplugged acoustic arrangement, organic stripped-back instrumentation, raw nylon guitar, warm upright acoustic piano, cozy room acoustics'
      };

      const vibeStr = vibeAdditions[musicVibe];
      const vocalStr = vocalAdditions[vocalMode];

      let combinedDesc = p;
      if (vibeStr) combinedDesc += `, ${vibeStr}`;
      if (vocalStr) combinedDesc += `, ${vocalStr}`;

      // 3. Adapt formatting according to the Selected target engine
      if (targetEngine === 'suno') {
        // Extract basic stylistic tags for Suno brackets [Style, Vibe]
        setCustomPrompt(`[Style: ${combinedDesc.replace(/An? |The? /gi, '')}] [Structure: verse chorus, dynamic transition, high-definition audio] [Tempo: driving key]`);
      } else if (targetEngine === 'udio') {
        setCustomPrompt(`A pristine studio recording of: ${combinedDesc}. Rich harmonic frequencies, depth and detail, analog mastering master tape.`);
      } else if (targetEngine === 'stable') {
        const keywords = combinedDesc
          .split(',')
          .map(kw => kw.trim().toLowerCase())
          .filter((v, i, a) => a.indexOf(v) === i && v.length > 0)
          .join(', ');
        setCustomPrompt(`High fidelity audio, ${keywords}, 44.1kHz, professional studio grade.`);
      } else {
        setCustomPrompt(`${combinedDesc}.`);
      }

    } else {
      // SFX Customizations
      const spaceAdditions = {
        none: '',
        dry: 'ultra close-up condenser recording, raw micro-detail, dry studio acoustics, zero room reflection, high isolation',
        cathedral: 'massive stone hall reverberation, long natural echo tail, spacious field recording, wet stereophonic spacing',
        chiptune: 'retro 8-bit sound design, digital synthesizer arcade chip, synthetic classic chiptune waveform'
      };

      const kineticAdditions = {
        none: '',
        impact: 'explosive fast-attack transient startup, crushing peak impact velocity, rapid decay, single shot hit power',
        loop: 'seamlessly looping continuous ambiance, steady background flow, dynamic droning loop, consistent texture'
      };

      const spaceStr = spaceAdditions[sfxSpace];
      const kineticStr = kineticAdditions[sfxKinetic];

      let combinedSFX = p;
      if (spaceStr) combinedSFX += `, ${spaceStr}`;
      if (kineticStr) combinedSFX += `, ${kineticStr}`;

      if (targetEngine === 'stable') {
        setCustomPrompt(`Pro sound effect, ${combinedSFX}, highly detailed Foley, 96kHz.`);
      } else if (targetEngine === 'suno' || targetEngine === 'udio') {
        setCustomPrompt(`[Sound Effect: ${combinedSFX}] [Action trigger, ultra-realistic digital Foley, cinematic dynamic]`);
      } else {
        setCustomPrompt(`${combinedSFX}.`);
      }
    }
  }, [originalPrompt, type, targetEngine, musicVibe, vocalMode, sfxSpace, sfxKinetic]);

  const handleCopy = () => {
    navigator.clipboard.writeText(customPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerate = () => {
    navigator.clipboard.writeText(customPrompt);
    setGenerationComplete(true);
    
    let targetUrl = 'https://suno.com';
    if (type === 'music') {
      if (targetEngine === 'udio') targetUrl = 'https://www.udio.com';
      else if (targetEngine === 'stable') targetUrl = 'https://www.stableaudio.com';
    } else {
      targetUrl = 'https://elevenlabs.io/sound-effects';
      if (targetEngine === 'stable') targetUrl = 'https://www.stableaudio.com';
    }
    
    window.open(targetUrl, '_blank');
  };

  const accentColor = type === 'music' ? 'text-[var(--color-accent)]' : 'text-[#00f0ff]';
  const borderAccent = type === 'music' ? 'border-[var(--color-accent)]/30' : 'border-[#00f0ff]/30';
  const hoverAccent = type === 'music' ? 'hover:bg-[var(--color-accent)] hover:text-white' : 'hover:bg-[#00f0ff] hover:text-black';

  return (
    <div className="glass-panel p-8 mt-8 relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-80 h-80 ${type === 'music' ? 'bg-[var(--color-accent)]/5' : 'bg-[#00f0ff]/5'} blur-[100px] rounded-full pointer-events-none`}></div>
      
      {/* Heading */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 pb-6 border-b border-white/5 relative z-10 gap-4">
        <div>
          <h3 className={`text-xl font-bold flex items-center gap-2.5 ${accentColor}`}>
            <Wand2 size={22} className="animate-pulse" />
            AI 生成闭环 & 深度提示词定制 (Prompt Workshop)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            通过高精密度的音视频工程选项微调此提示词，可直接用于主流 AI 音频模型合成特定变体
          </p>
        </div>
        <div className="flex gap-2">
          {type === 'music' ? (
            <span className="text-xs font-mono text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-2.5 py-1 rounded-md border border-[var(--color-accent)]/20 font-semibold shadow-sm">Music Generator</span>
          ) : (
            <span className="text-xs font-mono text-[#00f0ff] bg-[#00f0ff]/10 px-2.5 py-1 rounded-md border border-[#00f0ff]/20 font-semibold shadow-sm">SFX Generator</span>
          )}
        </div>
      </div>

      {/* Control Station Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 relative z-10">
        
        {/* Row 1: Target Engine */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            1. 适配特定生成大模型格式
          </label>
          <div className="grid grid-cols-2 gap-1.5 bg-black/30 p-1.5 rounded-xl border border-white/5">
            <button
              onClick={() => setTargetEngine('default')}
              className={`text-xs py-2 px-2.5 rounded-lg font-medium transition-all ${targetEngine === 'default' ? 'bg-white/10 text-white shadow-sm font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
            >
              通用叙述 (Prose)
            </button>
            <button
              onClick={() => setTargetEngine('suno')}
              className={`text-xs py-2 px-2.5 rounded-lg font-medium transition-all ${targetEngine === 'suno' ? 'bg-[var(--color-accent)]/25 text-white border border-[var(--color-accent)]/30 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
            >
              Suno v4 标签组
            </button>
            <button
              onClick={() => setTargetEngine('udio')}
              className={`text-xs py-2 px-2.5 rounded-lg font-medium transition-all ${targetEngine === 'udio' ? 'bg-amber-500/25 text-amber-200 border border-amber-500/30 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
            >
              Udio 纯色模式
            </button>
            <button
              onClick={() => setTargetEngine('stable')}
              className={`text-xs py-2 px-2.5 rounded-lg font-medium transition-all ${targetEngine === 'stable' ? 'bg-blue-500/25 text-blue-200 border border-blue-500/30 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
            >
              Stable Audio 标签
            </button>
          </div>
        </div>

        {/* Row 2 & 3: Custom Vibe or Space */}
        {type === 'music' ? (
          <>
            {/* Music option A: Vibe Booster */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                2. 情绪氛围强化 (Themes)
              </label>
              <div className="grid grid-cols-2 gap-1.5 bg-black/30 p-1.5 rounded-xl border border-white/5">
                {[
                  { id: 'none', label: '原汁原味 (Default)' },
                  { id: 'cinematic', label: '影视交响 (Epic)' },
                  { id: 'vintage', label: '复古微黄 (Lofi)' },
                  { id: 'cyber', label: '赛博未来 (Cyber)' },
                  { id: 'haunting', label: '悬疑幽暗 (Dark)' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setMusicVibe(item.id as any)}
                    className={`text-xs py-2 px-2.5 rounded-lg font-medium transition-all text-left truncate ${musicVibe === item.id ? 'bg-white/10 text-white font-semibold border-l-2 border-orange-500 pl-2' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Music option B: Vocals / Instrument structure */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                3. 声部配器形态 (Structure)
              </label>
              <div className="grid grid-cols-2 gap-1.5 bg-black/30 p-1.5 rounded-xl border border-white/5">
                {[
                  { id: 'none', label: '原样配比 (Keep)' },
                  { id: 'instrumental', label: '纯器乐演奏 (Pure)' },
                  { id: 'female', label: '空灵女声领唱' },
                  { id: 'male', label: '烟熏男声领唱' },
                  { id: 'acoustic', label: '不插电原声 (Acoustic)' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setVocalMode(item.id as any)}
                    className={`text-xs py-2 px-2.5 rounded-lg font-medium transition-all text-left truncate ${vocalMode === item.id ? 'bg-white/10 text-white font-semibold border-l-2 border-orange-500 pl-2' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* SFX Option A: Spatial Reverb */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                2. 空间混响特征 (Acoustic Space)
              </label>
              <div className="grid grid-cols-2 gap-1.5 bg-black/30 p-1.5 rounded-xl border border-white/5">
                {[
                  { id: 'none', label: '默认空间 (Default)' },
                  { id: 'dry', label: '近场干硬录音 (Dry)' },
                  { id: 'cathedral', label: '大教堂大厅 (Cathedral)' },
                  { id: 'chiptune', label: '8-bit 复古电子' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setSfxSpace(item.id as any)}
                    className={`text-xs py-2 px-2.5 rounded-lg font-medium transition-all text-left truncate ${sfxSpace === item.id ? 'bg-white/10 text-white font-semibold border-l-2 border-cyan-500 pl-2' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* SFX Option B: Kinetic Dynamics */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                3. 声音瞬态冲能 (Dynamics)
              </label>
              <div className="grid grid-cols-2 gap-1.5 bg-black/30 p-1.5 rounded-xl border border-white/5">
                {[
                  { id: 'none', label: '默认动力 (Default)' },
                  { id: 'impact', label: '强瞬态锤击 (Impact)' },
                  { id: 'loop', label: '连绵平缓背景 (Loop)' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setSfxKinetic(item.id as any)}
                    className={`text-xs py-2 px-2.5 rounded-lg font-medium transition-all text-left truncate ${sfxKinetic === item.id ? 'bg-white/10 text-white font-semibold border-l-2 border-cyan-500 pl-2' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Live Text Field */}
      <div className="relative group z-10">
        <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-[#090a0f] border border-white/5 rounded text-[10px] text-slate-500 font-mono flex items-center gap-1 z-20">
          <AudioLines size={10} className={accentColor} /> 
          实时生成的提示词 (Interactive Prompt Out)
        </div>
        <div className="bg-black/40 border border-white/10 rounded-2xl p-5 pr-14 font-mono text-sm text-slate-300 leading-relaxed min-h-[96px] shadow-inner font-light">
          {customPrompt}
        </div>
        
        {/* Actions inside text field */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <button 
            onClick={handleCopy}
            className="p-2.5 bg-white/5 hover:bg-white/10 hover:text-white rounded-xl transition-all text-slate-400 border border-white/5 shadow"
            title="一键复制"
          >
            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      {/* Copy & Go Button */}
      <div className="mt-6 flex flex-col sm:flex-row items-center gap-4 relative z-10">
        <button
          onClick={handleGenerate}
          className={`flex-1 w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold transition-all duration-300 border bg-white text-black hover:bg-white/95 cursor-pointer shadow-lg`}
        >
          <Sparkles size={18} className="text-orange-500 animate-spin-slow" />
          <span>前往 AI 生成平台测试</span>
        </button>

        {copied && (
          <div className="flex-1 w-full sm:w-auto bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3.5 rounded-xl text-sm flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
            <Check size={18} className="shrink-0 animate-bounce" />
            <div>
              <p className="font-bold text-xs">生成就绪！最新微调提示词已存入剪贴板</p>
              <p className="text-slate-400 text-[10px] mt-0.5">可以直接粘贴进 Suno, Udio 或 ElevenLabs</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptGenerator;

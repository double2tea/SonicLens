import { useMemo, useState } from 'react';
import { ArrowUpRight, Check, Copy, WandSparkles } from 'lucide-react';
import type { AnalysisMode, SeedAudioContentMode } from '../types';

interface PromptGeneratorProps {
  embedded?: boolean;
  prompt: string;
  seedAudioContentMode?: SeedAudioContentMode;
  type: AnalysisMode;
}

type TargetEngine = 'default' | 'seedaudio' | 'suno' | 'udio' | 'stable';
type MusicVibe = 'none' | 'cinematic' | 'vintage' | 'cyber' | 'haunting';
type VocalMode = 'none' | 'instrumental' | 'female' | 'male' | 'acoustic';
type SfxSpace = 'none' | 'dry' | 'cathedral' | 'chiptune';
type SfxKinetic = 'none' | 'impact' | 'loop';

const engines: Array<{ id: TargetEngine; label: string }> = [
  { id: 'default', label: '通用' },
  { id: 'seedaudio', label: 'SeedAudio' },
  { id: 'suno', label: 'Suno' },
  { id: 'udio', label: 'Udio' },
  { id: 'stable', label: 'Stable Audio' },
];

const musicVibes: Array<{ id: MusicVibe; label: string }> = [
  { id: 'none', label: '原始气质' },
  { id: 'cinematic', label: '影视交响' },
  { id: 'vintage', label: '复古磁带' },
  { id: 'cyber', label: '赛博电子' },
  { id: 'haunting', label: '悬疑幽暗' },
];

const vocalModes: Array<{ id: VocalMode; label: string }> = [
  { id: 'none', label: '保持声部' },
  { id: 'instrumental', label: '纯器乐' },
  { id: 'female', label: '女声领唱' },
  { id: 'male', label: '男声领唱' },
  { id: 'acoustic', label: '不插电' },
];

const sfxSpaces: Array<{ id: SfxSpace; label: string }> = [
  { id: 'none', label: '原始空间' },
  { id: 'dry', label: '近场干声' },
  { id: 'cathedral', label: '大厅混响' },
  { id: 'chiptune', label: '8-bit 电子' },
];

const sfxKinetics: Array<{ id: SfxKinetic; label: string }> = [
  { id: 'none', label: '保持动态' },
  { id: 'impact', label: '强化瞬态' },
  { id: 'loop', label: '无缝循环' },
];

const musicVibeText: Record<MusicVibe, string> = {
  none: '',
  cinematic:
    'epic cinematic orchestral arrangement, dramatic dynamic build-up, sweeping brass, staccato strings, theatrical crescendo',
  vintage:
    'lo-fi vintage tape warmth, analog saturation, wow and flutter, vinyl texture, intimate room ambience',
  cyber:
    'cybernetic synthwave pulse, modular filter sweep, electronic sub-bass, neon arpeggio, industrial glitch texture',
  haunting:
    'haunting dark soundscape, suspenseful drones, melancholic atmospheric pads, hollow desolate reverb',
};

const vocalModeText: Record<VocalMode, string> = {
  none: '',
  instrumental:
    'pure instrumental arrangement, no vocals, precise instrumental layering, clean mix',
  female:
    'expressive female lead vocals, emotional soprano, melodic narrative, detailed vocal presence',
  male: 'intimate baritone male lead vocals, raw singer-songwriter delivery, warm close microphone',
  acoustic:
    'fully unplugged acoustic arrangement, organic instrumentation, nylon guitar, upright piano, natural room acoustics',
};

const sfxSpaceText: Record<SfxSpace, string> = {
  none: '',
  dry: 'ultra close-up condenser recording, dry studio acoustics, no room reflection, isolated micro-detail',
  cathedral: 'large stone hall reverberation, long natural echo tail, spacious stereophonic field',
  chiptune: 'retro 8-bit sound design, arcade chip synthesis, classic digital waveform',
};

const sfxKineticText: Record<SfxKinetic, string> = {
  none: '',
  impact: 'explosive fast-attack transient, strong peak impact, rapid decay, single-shot power',
  loop: 'seamless continuous loop, steady background flow, consistent evolving texture',
};

const normalizePrompt = (value: string): string => value.trim().replace(/\.$/, '');

const formatForEngine = (
  description: string,
  engine: TargetEngine,
  type: Exclude<AnalysisMode, 'video'>,
): string => {
  if (engine === 'seedaudio') return `${description}.`;
  if (type === 'sfx') {
    if (engine === 'stable')
      return `Professional sound effect, ${description}, detailed Foley, 96kHz.`;
    if (engine === 'suno' || engine === 'udio')
      return `[Sound effect: ${description}] [Precise action trigger, cinematic dynamics]`;
    return `${description}.`;
  }

  if (engine === 'suno')
    return `[Style: ${description}] [Structure: verse, chorus, dynamic transition]`;
  if (engine === 'udio')
    return `A detailed studio recording of ${description}. Natural depth, harmonic detail, analog mastering.`;
  if (engine === 'stable') {
    const tags = Array.from(
      new Set(
        description
          .split(',')
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean),
      ),
    );
    return `High fidelity audio, ${tags.join(', ')}, professional studio grade.`;
  }
  return `${description}.`;
};

interface OptionGroupProps<T extends string> {
  label: string;
  onChange: (value: T) => void;
  options: Array<{ id: T; label: string }>;
  value: T;
}

function OptionGroup<T extends string>({ label, onChange, options, value }: OptionGroupProps<T>) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-medium text-[var(--text-muted)]">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            aria-pressed={value === option.id}
            className={`rounded-md border px-2.5 py-1.5 text-[0.7rem] font-medium ${
              value === option.id
                ? 'accent-surface accent-text'
                : 'hairline text-[var(--text-muted)] hover:border-[var(--line-strong)] hover:text-[var(--text)]'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default function PromptGenerator({
  embedded = false,
  prompt,
  seedAudioContentMode,
  type,
}: PromptGeneratorProps) {
  const [targetEngine, setTargetEngine] = useState<TargetEngine>(
    type === 'video' ? 'seedaudio' : 'default',
  );
  const [musicVibe, setMusicVibe] = useState<MusicVibe>('none');
  const [vocalMode, setVocalMode] = useState<VocalMode>('none');
  const [sfxSpace, setSfxSpace] = useState<SfxSpace>('none');
  const [sfxKinetic, setSfxKinetic] = useState<SfxKinetic>('none');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error' | 'limit'>('idle');
  const engineOptions = type === 'video' ? engines.filter(({ id }) => id === 'seedaudio') : engines;

  const customPrompt = useMemo(() => {
    if (type === 'video') return prompt.trim();
    const additions =
      type === 'music'
        ? [musicVibeText[musicVibe], vocalModeText[vocalMode]]
        : [sfxSpaceText[sfxSpace], sfxKineticText[sfxKinetic]];
    const description = [normalizePrompt(prompt), ...additions].filter(Boolean).join(', ');
    return formatForEngine(description, targetEngine, type);
  }, [musicVibe, prompt, sfxKinetic, sfxSpace, targetEngine, type, vocalMode]);
  const isSeedAudio = targetEngine === 'seedaudio';
  const isOverLimit = isSeedAudio && customPrompt.length > 2048;

  const copyPrompt = async (): Promise<boolean> => {
    if (isOverLimit) {
      setCopyState('limit');
      return false;
    }
    try {
      await navigator.clipboard.writeText(customPrompt);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 2200);
      return true;
    } catch {
      setCopyState('error');
      return false;
    }
  };

  const openGenerator = async () => {
    if (isSeedAudio) {
      await copyPrompt();
      return;
    }
    const url =
      type === 'sfx'
        ? targetEngine === 'stable'
          ? 'https://www.stableaudio.com'
          : 'https://elevenlabs.io/sound-effects'
        : targetEngine === 'udio'
          ? 'https://www.udio.com'
          : targetEngine === 'stable'
            ? 'https://www.stableaudio.com'
            : 'https://suno.com';
    const targetWindow = window.open('about:blank', '_blank');
    if (!targetWindow) {
      setCopyState('error');
      return;
    }
    targetWindow.opener = null;

    const copied = await copyPrompt();
    if (!copied) {
      targetWindow.close();
      return;
    }
    targetWindow.location.replace(url);
  };

  return (
    <section
      className={embedded ? 'overflow-hidden' : 'surface mt-6 overflow-hidden'}
      aria-labelledby="prompt-workshop-title"
    >
      <div className="grid lg:grid-cols-[0.82fr_1.18fr]">
        <div className="border-b hairline p-6 sm:p-8 lg:border-r lg:border-b-0">
          <p className="eyebrow">Prompt workshop</p>
          <h2 id="prompt-workshop-title" className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
            {type === 'video' ? 'SeedAudio 声音方案' : '生成声音变体'}
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--text-muted)]">
            {type === 'video'
              ? '结构化声音设计稿与可执行 text_prompt 分开呈现，避免把作者标题带入生成请求。'
              : '调整生成平台与声音方向，提示词会即时重组。复制后可直接进入对应平台。'}
          </p>

          <div className="mt-7 space-y-5">
            <OptionGroup
              label="目标平台"
              options={engineOptions}
              value={targetEngine}
              onChange={setTargetEngine}
            />
            {type === 'music' ? (
              <>
                <OptionGroup
                  label="气质"
                  options={musicVibes}
                  value={musicVibe}
                  onChange={setMusicVibe}
                />
                <OptionGroup
                  label="声部"
                  options={vocalModes}
                  value={vocalMode}
                  onChange={setVocalMode}
                />
              </>
            ) : type === 'sfx' ? (
              <>
                <OptionGroup
                  label="空间"
                  options={sfxSpaces}
                  value={sfxSpace}
                  onChange={setSfxSpace}
                />
                <OptionGroup
                  label="动态"
                  options={sfxKinetics}
                  value={sfxKinetic}
                  onChange={setSfxKinetic}
                />
              </>
            ) : null}
            {isSeedAudio && (
              <div className="border-t hairline pt-4 text-xs leading-5 text-[var(--text-muted)]">
                <p>
                  content_mode ·{' '}
                  <span className="font-mono accent-text">
                    {seedAudioContentMode ?? (type === 'sfx' ? 'nonverbal' : 'mixed')}
                  </span>
                </p>
                <p className="mt-2">
                  整合样音适合快速听氛围；需要精确卡画面时，应使用定时素材与后期混音。
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
              <WandSparkles size={14} className="accent-text" />
              实时提示词
            </span>
            <button
              type="button"
              onClick={() => void copyPrompt()}
              disabled={isOverLimit}
              className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[var(--text-muted)] hover:bg-black/[0.04] hover:text-[var(--text)]"
            >
              {copyState === 'copied' ? (
                <Check size={14} className="accent-text" />
              ) : (
                <Copy size={14} />
              )}
              {copyState === 'copied' ? '已复制' : '复制'}
            </button>
          </div>
          <div className="mt-4 min-h-40 flex-1 rounded-xl bg-[#1c221e] p-5 font-mono text-[0.78rem] leading-6 text-[#eff5f0]">
            {customPrompt}
          </div>
          {isSeedAudio && (
            <p
              className={`mt-2 text-right font-mono text-[0.64rem] ${isOverLimit ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'}`}
            >
              {customPrompt.length} / 2048 characters
            </p>
          )}
          {copyState === 'error' && (
            <p className="mt-3 text-xs text-[var(--danger)]" role="alert">
              无法写入剪贴板，请检查浏览器权限。
            </p>
          )}
          {copyState === 'limit' && (
            <p className="mt-3 text-xs text-[var(--danger)]" role="alert">
              SeedAudio text_prompt 超过 2048 字符，请先压缩内容。
            </p>
          )}
          <button
            type="button"
            onClick={() => void openGenerator()}
            disabled={isOverLimit}
            className="accent-bg mt-5 inline-flex items-center justify-center gap-2 self-start rounded-lg px-4 py-2.5 text-xs font-bold"
          >
            {isSeedAudio ? '复制 SeedAudio Prompt' : '复制并打开生成平台'}
            {isSeedAudio ? <Copy size={15} /> : <ArrowUpRight size={15} />}
          </button>
        </div>
      </div>
    </section>
  );
}

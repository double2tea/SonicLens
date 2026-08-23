export type SunoTempoMode = 'source' | 'half_time' | 'double_time';
export type SunoGrooveMode = 'source' | 'straight' | 'syncopated' | 'swung';
export type SunoEnergyMode = 'source' | 'steady' | 'build' | 'breakdown';

export interface SunoPromptOptions {
  basePrompt: string;
  bpm?: number;
  energyMode: SunoEnergyMode;
  excludeStyles?: string[];
  grooveMode: SunoGrooveMode;
  instrumental: boolean;
  key?: string;
  styleAddition?: string;
  tempoMode: SunoTempoMode;
  timeSignature?: string;
  vocalDescription?: string;
}

export interface SunoPromptPackage {
  clipboardText: string;
  excludeStyles: string[];
  rhythmControl: string;
  structureTags: string;
  stylePrompt: string;
  styleWithExclusions: string;
}

const STYLE_LIMIT = 1000;

const grooveInstructions: Record<SunoGrooveMode, string> = {
  source: 'Preserve the source groove and accent pattern.',
  straight: 'Use a straight, tightly quantized pulse with clean downbeats.',
  syncopated: 'Use controlled off-beat syncopation with a clear rhythmic pocket.',
  swung: 'Use a light swung subdivision with a relaxed pocket.',
};

const grooveStyleText: Record<SunoGrooveMode, string> = {
  source: '',
  straight: 'straight tight groove',
  syncopated: 'controlled syncopated groove',
  swung: 'light swung pocket',
};

const energyInstructions: Record<SunoEnergyMode, string> = {
  source: 'Follow the source section dynamics.',
  steady: 'Hold a stable energy floor across sections.',
  build: 'Build intensity every 8 bars toward the final section.',
  breakdown: 'Use a 4-bar breakdown before a high-impact return.',
};

const energyStyleText: Record<SunoEnergyMode, string> = {
  source: '',
  steady: 'stable section energy',
  build: '8-bar progressive energy build',
  breakdown: '4-bar breakdown before a high-impact return',
};

const cleanPrompt = (value: string): string =>
  value
    .trim()
    .replace(/^\[Style:\s*/i, '')
    .replace(/\]\s*$/, '')
    .replace(/[.\s]+$/, '');

const uniqueValues = (values: string[]): string[] =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const truncateStyle = (value: string, limit = STYLE_LIMIT): string => {
  if (value.length <= limit) return value;
  const truncated = value.slice(0, limit - 1);
  const boundary = Math.max(truncated.lastIndexOf(','), truncated.lastIndexOf(' '));
  return `${truncated.slice(0, boundary > 0 ? boundary : limit - 1).trim()}.`;
};

const resolveTempo = (bpm: number | undefined, mode: SunoTempoMode): number | undefined => {
  if (bpm === undefined || !Number.isFinite(bpm) || bpm <= 0) return undefined;
  const multiplier = mode === 'half_time' ? 0.5 : mode === 'double_time' ? 2 : 1;
  return Number((bpm * multiplier).toFixed(1));
};

const grooveCue: Record<SunoGrooveMode, string> = {
  source: '',
  straight: 'tight, straight',
  syncopated: 'tight, syncopated',
  swung: 'relaxed, swung',
};

const withCue = (tag: string, ...cues: string[]): string => {
  const activeCues = uniqueValues(cues).slice(0, 3);
  return activeCues.length ? `[${tag} - ${activeCues.join(', ')}]` : `[${tag}]`;
};

const buildStructureTags = (
  instrumental: boolean,
  grooveMode: SunoGrooveMode,
  energyMode: SunoEnergyMode,
): string => {
  const groove = grooveCue[grooveMode];
  const developmentCue =
    energyMode === 'build' ? 'building' : energyMode === 'steady' ? 'steady' : '';
  const breakdownCue = energyMode === 'breakdown' ? 'stripped' : '';
  const finalCue =
    energyMode === 'build'
      ? 'maximum energy'
      : energyMode === 'breakdown'
        ? 'high-impact return'
        : energyMode === 'steady'
          ? 'steady'
          : '';

  return instrumental
    ? [
        '[SHORT INSTRUMENTAL INTRO 4]',
        withCue('MAIN THEME 8', groove),
        withCue('DEVELOPMENT 8', groove, developmentCue),
        withCue('BREAKDOWN 4', breakdownCue),
        withCue('FINAL THEME 8', groove, finalCue),
        '[OUTRO 4]',
        '[END]',
      ].join('\n')
    : [
        '[SHORT INSTRUMENTAL INTRO 4]',
        withCue('VERSE 1 8', groove),
        withCue('PRE-CHORUS 4', developmentCue),
        withCue('CHORUS 8', groove),
        withCue('VERSE 2 8', groove),
        withCue('BRIDGE 8', breakdownCue),
        withCue('FINAL CHORUS 8', groove, finalCue),
        '[OUTRO 4]',
        '[END]',
      ].join('\n');
};

export const buildSunoPromptPackage = ({
  basePrompt,
  bpm,
  energyMode,
  excludeStyles = [],
  grooveMode,
  instrumental,
  key,
  styleAddition,
  tempoMode,
  timeSignature,
  vocalDescription,
}: SunoPromptOptions): SunoPromptPackage => {
  const effectiveBpm = resolveTempo(bpm, tempoMode);
  const tempoStyle = effectiveBpm === undefined ? '' : `${effectiveBpm} BPM`;
  const meterStyle = timeSignature?.trim() ?? '';
  const keyStyle = key?.trim() ?? '';
  const styleParts = uniqueValues([
    vocalDescription ?? '',
    cleanPrompt(basePrompt),
    styleAddition ?? '',
    tempoStyle,
    meterStyle,
    keyStyle,
    grooveStyleText[grooveMode],
    energyStyleText[energyMode],
  ]);
  const normalizedExclusions = uniqueValues([
    ...(instrumental ? ['no vocals'] : []),
    ...excludeStyles,
  ]).slice(0, 4);
  const exclusionSuffix = normalizedExclusions.length
    ? `, ${normalizedExclusions.join(', ')}.`
    : '';
  const stylePrompt = truncateStyle(
    `${styleParts.join(', ')}.`,
    STYLE_LIMIT - exclusionSuffix.length,
  );
  const styleWithExclusions = exclusionSuffix
    ? `${stylePrompt.replace(/\.$/, '')}${exclusionSuffix}`
    : stylePrompt;
  const rhythmControl = [
    `Tempo: ${effectiveBpm === undefined ? 'follow source tempo' : `${effectiveBpm} BPM`}`,
    `Meter: ${meterStyle || 'follow source meter'}`,
    `Groove: ${grooveInstructions[grooveMode]}`,
    `Energy arc: ${energyInstructions[energyMode]}`,
    'Timing: keep fills at section boundaries and preserve clear downbeats for edit points.',
  ].join('\n');
  const structureTags = buildStructureTags(instrumental, grooveMode, energyMode);
  const excludeText = normalizedExclusions.length ? normalizedExclusions.join(', ') : '(none)';
  const clipboardText = [
    'STYLE OF MUSIC',
    styleWithExclusions,
    '',
    'RHYTHM CONTROL',
    rhythmControl,
    '',
    'LYRICS / STRUCTURE',
    structureTags,
    '',
    'EXCLUDE STYLES',
    excludeText,
  ].join('\n');

  return {
    clipboardText,
    excludeStyles: normalizedExclusions,
    rhythmControl,
    structureTags,
    stylePrompt,
    styleWithExclusions,
  };
};

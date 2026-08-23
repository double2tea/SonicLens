import { describe, expect, it } from 'vitest';
import { buildSunoPromptPackage } from '../services/sunoPrompt';

describe('buildSunoPromptPackage', () => {
  it('puts tempo and meter in Style while encoding bar-level rhythm control in Lyrics tags', () => {
    const result = buildSunoPromptPackage({
      basePrompt: 'Cinematic electronic, analog synth pulse, tense and focused, clean mastering.',
      bpm: 118,
      energyMode: 'build',
      grooveMode: 'syncopated',
      instrumental: true,
      key: 'D minor',
      tempoMode: 'half_time',
      timeSignature: '4/4',
    });

    expect(result.styleWithExclusions).toContain('59 BPM');
    expect(result.styleWithExclusions).toContain('4/4');
    expect(result.styleWithExclusions).toContain('D minor');
    expect(result.styleWithExclusions).toContain('no vocals');
    expect(result.rhythmControl).toContain('controlled off-beat syncopation');
    expect(result.structureTags).toContain('[MAIN THEME 8 - tight, syncopated]');
    expect(result.structureTags).toContain('[FINAL THEME 8 - tight, syncopated, maximum energy]');
    expect(result.structureTags.endsWith('[END]')).toBe(true);
  });

  it('creates a vocal Lyrics skeleton and preserves a breakdown return', () => {
    const result = buildSunoPromptPackage({
      basePrompt: 'Alternative pop, crisp drums, bright guitars.',
      bpm: 126,
      energyMode: 'breakdown',
      grooveMode: 'straight',
      instrumental: false,
      tempoMode: 'source',
      timeSignature: '4/4',
      vocalDescription: 'Expressive female lead vocal',
    });

    expect(result.stylePrompt.startsWith('Expressive female lead vocal')).toBe(true);
    expect(result.structureTags).toContain('[VERSE 1 8 - tight, straight]');
    expect(result.structureTags).toContain('[BRIDGE 8 - stripped]');
    expect(result.structureTags).toContain(
      '[FINAL CHORUS 8 - tight, straight, high-impact return]',
    );
    expect(result.excludeStyles).toEqual([]);
  });

  it('keeps the Style field within Suno limits without dropping exclusions', () => {
    const result = buildSunoPromptPackage({
      basePrompt: `ambient ${'texture '.repeat(180)}`,
      energyMode: 'source',
      excludeStyles: ['no aggressive drums'],
      grooveMode: 'source',
      instrumental: true,
      tempoMode: 'source',
    });

    expect(result.styleWithExclusions.length).toBeLessThanOrEqual(1000);
    expect(result.styleWithExclusions).toContain('no vocals');
    expect(result.styleWithExclusions).toContain('no aggressive drums');
    expect(result.rhythmControl).toContain('follow source tempo');
  });
});

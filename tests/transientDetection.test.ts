import { describe, expect, it } from 'vitest';
import { detectTransientTimes, snapTimeToTransient } from '../services/transientDetection';

describe('detectTransientTimes', () => {
  it('detects synthetic impulses at their sample positions', () => {
    const sampleRate = 1_000;
    const samples = new Float32Array(sampleRate);
    samples[200] = 1;
    samples[610] = -0.8;

    expect(detectTransientTimes(samples, sampleRate)).toEqual([0.2, 0.61]);
  });

  it('returns no transients for silence', () => {
    expect(detectTransientTimes(new Float32Array(2_000), 1_000)).toEqual([]);
  });

  it('rejects invalid samples and sample rates', () => {
    expect(() => detectTransientTimes(new Float32Array([0]), 0)).toThrow(
      'sampleRate must be a positive finite number',
    );
    expect(() => detectTransientTimes(new Float32Array([Number.NaN]), 48_000)).toThrow(
      'samples must contain only finite values',
    );
  });
});

describe('snapTimeToTransient', () => {
  it('snaps to the nearest candidate and keeps zero at zero', () => {
    expect(snapTimeToTransient(1.04, [0.92, 1.08], 0.2)).toBe(1.08);
    expect(snapTimeToTransient(0, [0.03], 0.2)).toBe(0);
  });

  it('uses a half-second window for model timecodes rounded to whole seconds', () => {
    expect(snapTimeToTransient(10, [10.48])).toBe(10.48);
    expect(snapTimeToTransient(10, [10.51])).toBe(10);
  });

  it('does not move a time when the nearest candidate is outside the window', () => {
    expect(snapTimeToTransient(1, [1.21], 0.2)).toBe(1);
  });

  it('rejects non-finite and negative inputs', () => {
    expect(() => snapTimeToTransient(Number.NaN, [1])).toThrow('time must be finite');
    expect(() => snapTimeToTransient(1, [Number.POSITIVE_INFINITY])).toThrow(
      'candidate must be finite',
    );
    expect(() => snapTimeToTransient(1, [1], -0.1)).toThrow(
      'maxDistanceSeconds must not be negative',
    );
  });
});

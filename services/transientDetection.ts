const FRAME_DURATION_SECONDS = 0.02;
const THRESHOLD_HISTORY_SECONDS = 0.5;
const MIN_TRANSIENT_INTERVAL_SECONDS = 0.08;
const MIN_ENERGY_RISE = 1e-10;
const DEFAULT_SNAP_DISTANCE_SECONDS = 0.5;

interface TransientCandidate {
  readonly time: number;
  readonly strength: number;
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function dynamicThreshold(rises: readonly number[]): number {
  const baseline = median(rises);
  const deviation = median(rises.map((rise) => Math.abs(rise - baseline)));
  return Math.max(MIN_ENERGY_RISE, baseline + deviation * 3);
}

function assertFiniteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new TypeError(`${label} must be finite`);
  if (value < 0) throw new RangeError(`${label} must not be negative`);
}

export function detectTransientTimes(samples: Float32Array, sampleRate: number): number[] {
  if (!(samples instanceof Float32Array)) {
    throw new TypeError('samples must be a Float32Array');
  }
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    throw new RangeError('sampleRate must be a positive finite number');
  }
  if (samples.length === 0) return [];

  const frameSize = Math.max(1, Math.round(sampleRate * FRAME_DURATION_SECONDS));
  const frameCount = Math.ceil(samples.length / frameSize);
  const energies = new Array<number>(frameCount);
  const peakSampleIndices = new Array<number>(frameCount);

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const start = frameIndex * frameSize;
    const end = Math.min(start + frameSize, samples.length);
    let energy = 0;
    let peakMagnitude = -1;
    let peakSampleIndex = start;

    for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
      const sample = samples[sampleIndex];
      if (!Number.isFinite(sample)) {
        throw new TypeError('samples must contain only finite values');
      }
      energy += sample * sample;
      const magnitude = Math.abs(sample);
      if (magnitude > peakMagnitude) {
        peakMagnitude = magnitude;
        peakSampleIndex = sampleIndex;
      }
    }

    energies[frameIndex] = energy / (end - start);
    peakSampleIndices[frameIndex] = peakSampleIndex;
  }

  const rises = energies.map((energy, frameIndex) =>
    Math.max(0, energy - (frameIndex === 0 ? 0 : energies[frameIndex - 1])),
  );
  const historyFrames = Math.max(1, Math.round(THRESHOLD_HISTORY_SECONDS / FRAME_DURATION_SECONDS));
  const candidates: TransientCandidate[] = [];

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const rise = rises[frameIndex];
    const previousRise = frameIndex === 0 ? 0 : rises[frameIndex - 1];
    const nextRise = frameIndex === frameCount - 1 ? 0 : rises[frameIndex + 1];
    const history = rises.slice(Math.max(0, frameIndex - historyFrames), frameIndex);

    if (rise <= dynamicThreshold(history) || rise < previousRise || rise < nextRise) continue;

    const candidate: TransientCandidate = {
      time: peakSampleIndices[frameIndex] / sampleRate,
      strength: rise,
    };
    const previousCandidate = candidates.at(-1);
    if (
      previousCandidate === undefined ||
      candidate.time - previousCandidate.time >= MIN_TRANSIENT_INTERVAL_SECONDS
    ) {
      candidates.push(candidate);
    } else if (candidate.strength > previousCandidate.strength) {
      candidates[candidates.length - 1] = candidate;
    }
  }

  return candidates.map(({ time }) => time);
}

export function snapTimeToTransient(
  time: number,
  candidates: number[],
  maxDistanceSeconds = DEFAULT_SNAP_DISTANCE_SECONDS,
): number {
  assertFiniteNonNegative(time, 'time');
  assertFiniteNonNegative(maxDistanceSeconds, 'maxDistanceSeconds');
  for (const candidate of candidates) assertFiniteNonNegative(candidate, 'candidate');
  if (time === 0 || candidates.length === 0) return time;

  let nearest = candidates[0];
  let nearestDistance = Math.abs(nearest - time);
  for (let index = 1; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    const distance = Math.abs(candidate - time);
    if (distance < nearestDistance || (distance === nearestDistance && candidate < nearest)) {
      nearest = candidate;
      nearestDistance = distance;
    }
  }

  return nearestDistance <= maxDistanceSeconds ? nearest : time;
}

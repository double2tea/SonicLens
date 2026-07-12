/**
 * Utilities for client-side audio processing.
 */

type WebKitAudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

export interface AudioProcessingProgress {
  title: string;
  detail: string;
}

export interface AudioPreparationResult {
  file: File;
  originalBytes: number;
  processedBytes: number;
  sampleRate: number;
  wasTranscoded: boolean;
}

export interface NormalizedAudioRange {
  start: number;
  end: number;
  duration: number;
}

interface AudioPreparationOptions {
  maxBytes: number;
  onProgress: (progress: AudioProcessingProgress) => void;
  signal?: AbortSignal;
}

const TARGET_SAMPLE_RATES = [24000, 22050, 16000, 12000, 8000];

const createAudioContext = (): AudioContext => {
  const AudioContextConstructor =
    window.AudioContext ?? (window as WebKitAudioWindow).webkitAudioContext;

  if (!AudioContextConstructor) {
    throw new Error('当前浏览器不支持音频解码。');
  }

  return new AudioContextConstructor();
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
};

const isVideoFile = (file: File): boolean => file.type.startsWith('video/');

const shouldTranscode = (file: File, maxBytes: number): boolean =>
  isVideoFile(file) ||
  (file.type === 'audio/wav' && !file.name.endsWith('.analysis.wav')) ||
  file.size > maxBytes;

const replaceExtension = (fileName: string, extension: string): string =>
  `${fileName.replace(/\.[^/.]+$/, '')}${extension}`;

export function normalizeAudioRange(
  start: number,
  end: number,
  duration: number,
): NormalizedAudioRange {
  if (![start, end, duration].every(Number.isFinite)) {
    throw new Error('音频选区时间无效。');
  }
  if (duration <= 0) {
    throw new Error('音频时长必须大于 0。');
  }
  if (start < 0) {
    throw new Error('音频选区起点不能小于 0。');
  }
  if (start >= duration) {
    throw new Error('音频选区起点必须早于音频结束时间。');
  }

  const normalizedEnd = Math.min(end, duration);
  const rangeDuration = normalizedEnd - start;
  if (rangeDuration < 1) {
    throw new Error('音频选区至少需要 1 秒。');
  }

  return { start, end: normalizedEnd, duration: rangeDuration };
}

export async function extractAudioRange(
  file: File,
  start: number,
  end: number,
  signal?: AbortSignal,
): Promise<File> {
  signal?.throwIfAborted();

  const arrayBuffer = await file.arrayBuffer();
  signal?.throwIfAborted();

  const audioContext = createAudioContext();
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    signal?.throwIfAborted();

    const range = normalizeAudioRange(start, end, audioBuffer.duration);
    const sampleRate = Math.min(24000, audioBuffer.sampleRate);
    const blob = await encodeMonoWav(audioBuffer, sampleRate, range.start, range.duration);
    signal?.throwIfAborted();

    const rangeLabel = `${formatRangeTime(range.start)}-${formatRangeTime(range.end)}`;
    return new File([blob], replaceExtension(file.name, `.${rangeLabel}.analysis.wav`), {
      type: 'audio/wav',
    });
  } finally {
    await audioContext.close();
  }
}

const formatRangeTime = (seconds: number): string =>
  Number.isInteger(seconds) ? seconds.toString() : seconds.toFixed(1);

export async function prepareAudioForAnalysis(
  file: File,
  options: AudioPreparationOptions,
): Promise<AudioPreparationResult> {
  options.signal?.throwIfAborted();

  if (!shouldTranscode(file, options.maxBytes)) {
    options.onProgress({
      title: '音频无需压缩',
      detail: `当前文件 ${formatBytes(file.size)}，低于上传目标 ${formatBytes(options.maxBytes)}。`,
    });

    return {
      file,
      originalBytes: file.size,
      processedBytes: file.size,
      sampleRate: 0,
      wasTranscoded: false,
    };
  }

  options.onProgress({
    title: isVideoFile(file) ? '正在提取视频音频' : '正在解码音频',
    detail: '在浏览器本地解码媒体，不会上传原始视频文件。',
  });

  const audioContext = createAudioContext();
  const arrayBuffer = await file.arrayBuffer();
  options.signal?.throwIfAborted();

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    options.signal?.throwIfAborted();

    for (const sampleRate of TARGET_SAMPLE_RATES) {
      options.signal?.throwIfAborted();
      options.onProgress({
        title: '正在压缩分析音频',
        detail: `转为单声道 ${sampleRate / 1000}kHz WAV，目标小于 ${formatBytes(options.maxBytes)}。`,
      });

      const compressedBlob = await encodeMonoWav(audioBuffer, sampleRate);
      options.signal?.throwIfAborted();
      if (compressedBlob.size <= options.maxBytes || sampleRate === TARGET_SAMPLE_RATES.at(-1)) {
        if (compressedBlob.size > options.maxBytes) {
          throw new Error(
            `压缩后仍有 ${formatBytes(compressedBlob.size)}，超过上传目标 ${formatBytes(options.maxBytes)}。请裁剪更短片段后重试。`,
          );
        }

        const compressedFile = new File(
          [compressedBlob],
          replaceExtension(file.name, '.analysis.wav'),
          {
            type: 'audio/wav',
          },
        );

        options.onProgress({
          title: '压缩完成',
          detail: `${formatBytes(file.size)} -> ${formatBytes(compressedFile.size)}，即将上传分析音频。`,
        });

        return {
          file: compressedFile,
          originalBytes: file.size,
          processedBytes: compressedFile.size,
          sampleRate,
          wasTranscoded: true,
        };
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    if (error instanceof Error) {
      throw new Error(error.message, { cause: error });
    }
    throw new Error('文件解码失败，请确保文件格式正确且未加密。', { cause: error });
  } finally {
    await audioContext.close();
  }

  throw new Error('音频压缩失败。');
}

async function encodeMonoWav(
  buffer: AudioBuffer,
  sampleRate: number,
  offsetSeconds = 0,
  durationSeconds = buffer.duration,
): Promise<Blob> {
  const frameCount = Math.max(1, Math.ceil(durationSeconds * sampleRate));
  const offlineContext = new OfflineAudioContext(1, frameCount, sampleRate);
  const source = offlineContext.createBufferSource();

  source.buffer = buffer;
  source.connect(offlineContext.destination);
  source.start(0, offsetSeconds, durationSeconds);

  const renderedBuffer = await offlineContext.startRendering();
  return audioBufferToWav(renderedBuffer);
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const channelData = buffer.getChannelData(0);
  const dataLength = channelData.length * 2;
  const bufferArray = new ArrayBuffer(dataLength + 44);
  const view = new DataView(bufferArray);
  let pos = 0;

  setUint32(0x46464952);
  setUint32(dataLength + 36);
  setUint32(0x45564157);
  setUint32(0x20746d66);
  setUint32(16);
  setUint16(1);
  setUint16(1);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2);
  setUint16(2);
  setUint16(16);
  setUint32(0x61746164);
  setUint32(dataLength);

  for (const value of channelData) {
    const sample = Math.max(-1, Math.min(1, value));
    view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    pos += 2;
  }

  return new Blob([bufferArray], { type: 'audio/wav' });

  function setUint16(data: number): void {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number): void {
    view.setUint32(pos, data, true);
    pos += 4;
  }
}

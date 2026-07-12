import type { Conversion } from 'mediabunny';

export interface VideoCompressionProgress {
  title: string;
  detail: string;
}

export interface VideoPreparationResult {
  file: File;
  originalBytes: number;
  processedBytes: number;
  profile: string;
  wasTranscoded: boolean;
}

interface VideoPreparationOptions {
  durationSeconds: number;
  maxBytes: number;
  onProgress: (progress: VideoCompressionProgress) => void;
  signal?: AbortSignal;
}

export interface VideoProxyProfile {
  audioBitrate: number;
  maxLongSide: number;
  targetBytes: number;
  videoBitrate: number;
}

const TARGET_SIZE_RATIO = 0.72;
const AUDIO_BITRATE_RESERVE = 192_000;
const MIN_VIDEO_BITRATE = 180_000;
const MAX_VIDEO_BITRATE = 4_000_000;

const formatBytes = (bytes: number): string =>
  `${(bytes / 1024 / 1024).toFixed(bytes >= 10 * 1024 * 1024 ? 1 : 2)} MB`;

const replaceExtension = (fileName: string, extension: string): string =>
  `${fileName.replace(/\.[^/.]+$/, '')}${extension}`;

export const getVideoProxyProfile = (
  durationSeconds: number,
  maxBytes: number,
): VideoProxyProfile => {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error('视频时长必须大于 0。');
  }
  if (!Number.isFinite(maxBytes) || maxBytes <= 0) {
    throw new Error('视频上传目标必须大于 0。');
  }

  const targetBytes = Math.floor(maxBytes * TARGET_SIZE_RATIO);
  const targetBitsPerSecond = (targetBytes * 8) / durationSeconds;
  const videoBitrate = Math.max(
    MIN_VIDEO_BITRATE,
    Math.min(MAX_VIDEO_BITRATE, Math.floor(targetBitsPerSecond * 0.9 - AUDIO_BITRATE_RESERVE)),
  );

  return {
    audioBitrate: AUDIO_BITRATE_RESERVE,
    maxLongSide: videoBitrate < 700_000 ? 854 : 1280,
    targetBytes,
    videoBitrate,
  };
};

export async function prepareVideoForAnalysis(
  file: File,
  options: VideoPreparationOptions,
): Promise<VideoPreparationResult> {
  options.signal?.throwIfAborted();
  const profile = getVideoProxyProfile(options.durationSeconds, options.maxBytes);
  if (file.size <= profile.targetBytes) {
    return {
      file,
      originalBytes: file.size,
      processedBytes: file.size,
      profile: '原始 MP4',
      wasTranscoded: false,
    };
  }

  const resolutionLabel = profile.maxLongSide === 1280 ? '720p' : '480p';
  options.onProgress({
    title: '正在生成分析代理',
    detail: `${formatBytes(file.size)} 接近上传上限，正在本地转为 ${resolutionLabel} H.264。`,
  });

  const {
    ALL_FORMATS,
    BlobSource,
    BufferTarget,
    Conversion,
    ConversionCanceledError,
    Input,
    Mp4OutputFormat,
    Output,
  } = await import('mediabunny');
  options.signal?.throwIfAborted();

  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat(), target });
  let conversion: Conversion | null = null;
  const cancelConversion = () => {
    if (conversion) void conversion.cancel();
  };
  options.signal?.addEventListener('abort', cancelConversion, { once: true });

  try {
    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack) throw new Error('文件中没有可用于分析的视频轨道。');
    const audioTrack = await input.getPrimaryAudioTrack();

    conversion = await Conversion.init({
      input,
      output,
      tracks: 'primary',
      tags: {},
      showWarnings: false,
      video: async (track) => {
        const width = await track.getDisplayWidth();
        const height = await track.getDisplayHeight();
        const longSide = Math.min(Math.max(width, height), profile.maxLongSide);
        return {
          ...(width >= height ? { width: longSide } : { height: longSide }),
          codec: 'avc',
          bitrate: profile.videoBitrate,
          forceTranscode: true,
          hardwareAcceleration: 'prefer-hardware',
        };
      },
      audio: {
        codec: 'aac',
      },
    });
    options.signal?.throwIfAborted();

    const keepsVideo = conversion.utilizedTracks.some((track) => track.isVideoTrack());
    const keepsAudio = conversion.utilizedTracks.some((track) => track.isAudioTrack());
    if (!conversion.isValid || !keepsVideo || (audioTrack !== null && !keepsAudio)) {
      throw new Error('当前浏览器无法解码或编码这个视频，请改用 H.264/AAC MP4。');
    }

    conversion.onProgress = (progress) => {
      options.onProgress({
        title: '正在生成分析代理',
        detail: `${resolutionLabel} H.264 · ${Math.round(progress * 100)}% · 全程仅在当前浏览器处理。`,
      });
    };

    await conversion.execute();
    options.signal?.throwIfAborted();

    if (!target.buffer) throw new Error('分析代理生成失败。');
    if (target.buffer.byteLength > profile.targetBytes) {
      throw new Error(
        `分析代理仍有 ${formatBytes(target.buffer.byteLength)}，超过 ${formatBytes(profile.targetBytes)} 安全上传目标。`,
      );
    }

    const proxyFile = new File([target.buffer], replaceExtension(file.name, '.analysis.mp4'), {
      type: 'video/mp4',
    });
    options.onProgress({
      title: '分析代理已完成',
      detail: `${formatBytes(file.size)} → ${formatBytes(proxyFile.size)} · ${resolutionLabel} H.264。`,
    });

    return {
      file: proxyFile,
      originalBytes: file.size,
      processedBytes: proxyFile.size,
      profile: `${resolutionLabel} H.264`,
      wasTranscoded: true,
    };
  } catch (error) {
    if (options.signal?.aborted || error instanceof ConversionCanceledError) {
      throw new DOMException('视频压缩已取消。', 'AbortError');
    }
    throw error;
  } finally {
    options.signal?.removeEventListener('abort', cancelConversion);
    input.dispose();
  }
}

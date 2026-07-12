import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getVideoProxyProfile, prepareVideoForAnalysis } from '../services/videoCompression';

const mediaMock = vi.hoisted(() => ({
  bufferBytes: 512,
  hasAudio: true,
  isValid: true,
  keepsAudio: true,
  keepsVideo: true,
}));

vi.mock('mediabunny', () => {
  class MockBufferTarget {
    buffer: ArrayBuffer | null = null;
  }

  class MockInput {
    async getPrimaryVideoTrack() {
      return {
        getDisplayWidth: async () => 1920,
        getDisplayHeight: async () => 1080,
      };
    }

    async getPrimaryAudioTrack() {
      return mediaMock.hasAudio ? {} : null;
    }

    dispose() {}
  }

  class MockOutput {
    constructor(public readonly options: { target: MockBufferTarget }) {}
  }

  class MockConversion {
    static async init(options: {
      output: MockOutput;
      video: (track: {
        getDisplayWidth: () => Promise<number>;
        getDisplayHeight: () => Promise<number>;
      }) => Promise<unknown>;
    }) {
      await options.video({
        getDisplayWidth: async () => 1920,
        getDisplayHeight: async () => 1080,
      });
      return new MockConversion(options.output.options.target);
    }

    readonly isValid = mediaMock.isValid;
    readonly utilizedTracks = [
      { isVideoTrack: () => mediaMock.keepsVideo, isAudioTrack: () => false },
      { isVideoTrack: () => false, isAudioTrack: () => mediaMock.keepsAudio },
    ];
    onProgress?: (progress: number, processedTime: number) => unknown;

    constructor(private readonly target: MockBufferTarget) {}

    async execute() {
      this.onProgress?.(0.5, 1);
      this.target.buffer = new ArrayBuffer(mediaMock.bufferBytes);
    }

    async cancel() {}
  }

  class MockConversionCanceledError extends Error {}

  return {
    ALL_FORMATS: [],
    BlobSource: class {},
    BufferTarget: MockBufferTarget,
    Conversion: MockConversion,
    ConversionCanceledError: MockConversionCanceledError,
    Input: MockInput,
    Mp4OutputFormat: class {},
    Output: MockOutput,
  };
});

describe('video analysis proxy', () => {
  beforeEach(() => {
    mediaMock.bufferBytes = 512;
    mediaMock.hasAudio = true;
    mediaMock.isValid = true;
    mediaMock.keepsAudio = true;
    mediaMock.keepsVideo = true;
  });

  it('calculates a bounded 720p profile for a short video', () => {
    const profile = getVideoProxyProfile(30, 30 * 1024 * 1024);

    expect(profile.targetBytes).toBe(Math.floor(30 * 1024 * 1024 * 0.72));
    expect(profile.videoBitrate).toBe(4_000_000);
    expect(profile.maxLongSide).toBe(1280);
  });

  it('uses 480p for long videos with a constrained bitrate', () => {
    expect(getVideoProxyProfile(600, 30 * 1024 * 1024).maxLongSide).toBe(854);
  });

  it('rejects invalid duration and upload targets', () => {
    expect(() => getVideoProxyProfile(0, 1024)).toThrow('视频时长必须大于 0');
    expect(() => getVideoProxyProfile(10, 0)).toThrow('视频上传目标必须大于 0');
  });

  it('keeps an MP4 that is already within the upload limit', async () => {
    const file = new File(['video'], 'small.mp4', { type: 'video/mp4' });

    const result = await prepareVideoForAnalysis(file, {
      durationSeconds: 10,
      maxBytes: 1024,
      onProgress: vi.fn(),
    });

    expect(result.file).toBe(file);
    expect(result.wasTranscoded).toBe(false);
  });

  it('compresses before the hard limit to reserve base64 request overhead', async () => {
    const file = new File([new Uint8Array(800)], 'near-limit.mp4', { type: 'video/mp4' });

    const result = await prepareVideoForAnalysis(file, {
      durationSeconds: 10,
      maxBytes: 1024,
      onProgress: vi.fn(),
    });

    expect(result.wasTranscoded).toBe(true);
    expect(result.processedBytes).toBe(512);
  });

  it('creates a bounded analysis proxy and reports progress', async () => {
    const file = new File([new Uint8Array(2048)], 'large.mp4', { type: 'video/mp4' });
    const onProgress = vi.fn();

    const result = await prepareVideoForAnalysis(file, {
      durationSeconds: 10,
      maxBytes: 1024,
      onProgress,
    });

    expect(result.file.name).toBe('large.analysis.mp4');
    expect(result.file.type).toBe('video/mp4');
    expect(result.processedBytes).toBe(512);
    expect(result.wasTranscoded).toBe(true);
    expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({ title: '分析代理已完成' }));
  });

  it('fails when the generated proxy still exceeds the upload limit', async () => {
    mediaMock.bufferBytes = 1200;
    const file = new File([new Uint8Array(2048)], 'large.mp4', { type: 'video/mp4' });

    await expect(
      prepareVideoForAnalysis(file, {
        durationSeconds: 10,
        maxBytes: 1024,
        onProgress: vi.fn(),
      }),
    ).rejects.toThrow('超过 0.00 MB 安全上传目标');
  });

  it('fails explicitly when the browser cannot retain a video track', async () => {
    mediaMock.keepsVideo = false;
    const file = new File([new Uint8Array(2048)], 'large.mp4', { type: 'video/mp4' });

    await expect(
      prepareVideoForAnalysis(file, {
        durationSeconds: 10,
        maxBytes: 1024,
        onProgress: vi.fn(),
      }),
    ).rejects.toThrow('当前浏览器无法解码或编码这个视频');
  });

  it('fails explicitly when the input audio track cannot be retained', async () => {
    mediaMock.keepsAudio = false;
    const file = new File([new Uint8Array(2048)], 'large.mp4', { type: 'video/mp4' });

    await expect(
      prepareVideoForAnalysis(file, {
        durationSeconds: 10,
        maxBytes: 1024,
        onProgress: vi.fn(),
      }),
    ).rejects.toThrow('当前浏览器无法解码或编码这个视频');
  });

  it('allows a silent video proxy without an audio track', async () => {
    mediaMock.hasAudio = false;
    mediaMock.keepsAudio = false;
    const file = new File([new Uint8Array(2048)], 'silent.mp4', { type: 'video/mp4' });

    await expect(
      prepareVideoForAnalysis(file, {
        durationSeconds: 10,
        maxBytes: 1024,
        onProgress: vi.fn(),
      }),
    ).resolves.toMatchObject({ wasTranscoded: true });
  });

  it('honors an already aborted analysis job', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      prepareVideoForAnalysis(
        new File([new Uint8Array(2048)], 'large.mp4', { type: 'video/mp4' }),
        {
          durationSeconds: 10,
          maxBytes: 1024,
          onProgress: vi.fn(),
          signal: controller.signal,
        },
      ),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});

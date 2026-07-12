import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  analyzeMusicMedia,
  analyzeVideoMedia,
  generateSeedAudioBrief,
  streamAnalysisAgent,
} from '../services/geminiService';
import { GEMINI_API_KEY_STORAGE_KEY } from '../services/geminiConfig';
import type { SfxAnalysisResult, VideoAnalysisResult } from '../types';

const sfxResult: SfxAnalysisResult = {
  type: 'sfx',
  keywords: ['metal', 'impact'],
  educationalContext: 'A short metallic impact.',
  instruments: ['steel plate'],
  optimizedPrompt: 'Dry close-up metallic impact with a sharp transient.',
  sfx: {
    name: 'Metal impact',
    ucsCatId: 'METLHit',
    ucsCategory: 'Metal',
    ucsSubCategory: 'Impact',
    foleyInstructions: 'Strike a suspended steel plate.',
    accessibleAlternatives: 'Use a baking tray.',
    visualSyncTips: 'Place the transient on the contact frame.',
  },
};

const videoResult: VideoAnalysisResult = {
  type: 'video',
  title: '雨夜归家',
  summary: '骑行者穿过雨夜街道并抵达门廊。',
  durationSeconds: 8,
  narrativeArc: '从冷雨通勤转向温暖抵达。',
  visualStyle: ['写实', '冷暖对比'],
  keywords: ['rainy night', 'homecoming'],
  segmentation: {
    mode: 'shot',
    note: '已逐个确认并保留真实编辑边界。',
  },
  shots: [
    {
      startSeconds: 0,
      endSeconds: 8,
      shotType: '中景',
      cameraAngle: '平视',
      cameraMovement: '跟拍',
      transition: '硬切',
      visualDescription: '骑行者穿过湿润街道后停在门廊。',
      visibleAction: '车轮压过积水并停下。',
      onScreenText: '',
      dialogue: '',
      existingSound: '细雨与远处车流。',
      soundCue: {
        cue: '轮胎溅水衔接钥匙转动。',
        priority: 'must',
        diegeticStatus: 'diegetic',
        function: '连接动作与抵达。',
        character: '近场湿润瞬态后接清脆金属声。',
        route: 'timed_clip',
        mixRisk: '避免雨声遮挡钥匙瞬态。',
      },
    },
  ],
  editReview: {
    strengths: ['冷暖转折明确'],
    topIssues: ['开场铺垫略长'],
    rhythmSummary: '前段铺垫后在抵达动作形成落点。',
    rhythm: [
      {
        startSeconds: 0,
        endSeconds: 8,
        intensity: 3,
        label: '抵达',
        description: '由骑行动作推进到门廊落点。',
      },
    ],
    visualFinish: {
      compositionAndContinuity: '运动方向连续。',
      colorAndExposure: '冷暖对比清楚。',
      vfxAndMotion: '无需额外特效。',
      typographyAndBranding: '没有文字包装。',
    },
    recommendations: [
      {
        startSeconds: 0,
        endSeconds: 4,
        category: 'pacing',
        priority: 'high',
        evidence: '前半段动作变化较少。',
        action: '缩短开场跟拍。',
        expectedImpact: '更快进入抵达动作。',
      },
    ],
  },
  seedAudio: {
    recommendedMode: 'assembled_mix',
    contentMode: 'nonverbal',
    projectContext: '8 秒雨夜归家短片。',
    speakerVo: '无旁白。',
    music: '克制的低频氛围。',
    sfxAmbience: '细雨、轮胎溅水、钥匙与木门。',
    mix: '雨声退后，动作瞬态居前。',
    avoid: ['夸张雷声'],
    textPrompt:
      'Create restrained cinematic sound for an eight-second rainy-night homecoming, with fine rain behind a close tire splash and a crisp key turn, no voice or exaggerated thunder.',
  },
  risks: ['雨声可能遮挡钥匙瞬态。'],
};

const geminiResponse = (value: unknown): Response =>
  new Response(
    JSON.stringify({
      candidates: [
        {
          finishReason: 'STOP',
          content: { parts: [{ text: JSON.stringify(value) }] },
        },
      ],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );

const cutDetection = (cuts: number[] = []) => ({
  cuts,
  coverage: 'complete' as const,
  confidence: 'high' as const,
  note: '未见明显漏检风险',
});

const withTwoStageDetection = <T extends Omit<VideoAnalysisResult, 'seedAudio'>>(
  result: T,
  cuts: number[] = [],
): T => ({
  ...result,
  segmentation: {
    mode: 'shot',
    note: `第一阶段以 10 FPS 独立检测出 ${cuts.length} 个切点。未见明显漏检风险`,
    detection: {
      method: 'two_stage',
      sampleRateFps: 10,
      detectedCuts: cuts.length,
      confidence: 'high',
    },
  },
});

describe('analyzeMusicMedia', () => {
  beforeEach(() => {
    window.localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, 'test-key');
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('joins JSON split across multiple Gemini text parts', async () => {
    const json = JSON.stringify(sfxResult);
    const splitAt = Math.floor(json.length / 2);
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            candidates: [
              {
                finishReason: 'STOP',
                content: {
                  parts: [{ text: json.slice(0, splitAt) }, { text: json.slice(splitAt) }],
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await analyzeMusicMedia(
      new File(['audio'], 'impact.mp3', { type: 'audio/mpeg' }),
      'sfx',
    );

    expect(result).toEqual(sfxResult);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [requestUrl, requestInit] = fetchMock.mock.calls[0];
    expect(String(requestUrl)).not.toContain('key=');
    expect(new Headers(requestInit?.headers).get('x-goog-api-key')).toBe('test-key');
  });

  it('retries with the compact schema after a truncated response', async () => {
    const truncatedResponse = new Response(
      JSON.stringify({
        candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{' }] } }],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(truncatedResponse)
      .mockResolvedValueOnce(geminiResponse(sfxResult));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      analyzeMusicMedia(new File(['audio'], 'impact.mp3', { type: 'audio/mpeg' }), 'sfx'),
    ).resolves.toEqual(sfxResult);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('reports a clear error when the model connection is reset', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValueOnce(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      analyzeMusicMedia(new File(['audio'], 'impact.mp3', { type: 'audio/mpeg' }), 'sfx'),
    ).rejects.toThrow('模型服务连接被中断，请检查 Base URL 或网络后重试');
  });

  it('sends the original MP4 and returns the video diagnosis before generation', async () => {
    const { seedAudio, ...sourceDraft } = videoResult;
    const onProgress = vi.fn();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(geminiResponse(cutDetection()))
      .mockResolvedValueOnce(geminiResponse(sourceDraft));
    vi.stubGlobal('fetch', fetchMock);

    const result = await analyzeVideoMedia(
      new File(['video'], 'homecoming.mp4', { type: 'video/mp4' }),
      videoResult.durationSeconds,
      undefined,
      onProgress,
    );

    expect(result).toEqual(withTwoStageDetection(sourceDraft));
    expect(seedAudio).toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as {
      contents: Array<{
        parts: Array<{
          inlineData?: { mimeType: string };
          text?: string;
          videoMetadata?: { fps: number };
        }>;
      }>;
    };
    expect(firstBody.contents[0].parts[0].inlineData?.mimeType).toBe('video/mp4');
    expect(firstBody.contents[0].parts[0].videoMetadata?.fps).toBe(10);
    expect(firstBody.contents[0].parts[0].text).toBeUndefined();
    expect(firstBody.contents[0].parts[1].text).toContain('8.000 秒');
    const secondBody = JSON.parse(String(fetchMock.mock.calls[1][1]?.body)) as {
      contents: Array<{ parts: Array<{ text?: string; videoMetadata?: { fps: number } }> }>;
    };
    expect(secondBody.contents[0].parts[0].videoMetadata?.fps).toBe(5);
    expect(secondBody.contents[0].parts[1].text).toContain('固定时间线');
    expect(onProgress.mock.calls.map(([update]) => update.stage)).toEqual(['detect', 'analyze']);
  });

  it('marks partial cut coverage as sequence analysis', async () => {
    const partialDraft: VideoAnalysisResult = {
      ...videoResult,
      seedAudio: undefined,
      segmentation: { mode: 'sequence', note: '快速叠化区域无法逐镜确认。' },
      shots: [
        { ...videoResult.shots[0], startSeconds: 0, endSeconds: 4 },
        { ...videoResult.shots[0], startSeconds: 4, endSeconds: 8 },
      ],
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        geminiResponse({
          cuts: [4],
          coverage: 'partial',
          confidence: 'low',
          note: '快速叠化区域仍需人工复核',
        }),
      )
      .mockResolvedValueOnce(geminiResponse(partialDraft));
    vi.stubGlobal('fetch', fetchMock);

    const result = await analyzeVideoMedia(
      new File(['video'], 'partial.mp4', { type: 'video/mp4' }),
      8,
    );

    expect(result.segmentation.mode).toBe('sequence');
    expect(result.segmentation.detection).toMatchObject({
      detectedCuts: 1,
      confidence: 'low',
    });
    expect(result.shots).toHaveLength(2);
  });

  it('fails fast when cut points are not strictly ordered', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(geminiResponse(cutDetection([4, 2])));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      analyzeVideoMedia(
        new File(['video'], 'unordered.mp4', { type: 'video/mp4' }),
        videoResult.durationSeconds,
      ),
    ).rejects.toThrow('切点检测没有返回完整有效的时间线');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('rejects cut points closer than half a sampled frame to the video edge', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(geminiResponse(cutDetection([0.01])));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      analyzeVideoMedia(
        new File(['video'], 'edge-cut.mp4', { type: 'video/mp4' }),
        videoResult.durationSeconds,
      ),
    ).rejects.toThrow('切点检测没有返回完整有效的时间线');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('preserves nineteen continuous shot units returned by the model', async () => {
    const boundary = (index: number): number =>
      Number(((videoResult.durationSeconds * index) / 19).toFixed(6));
    const sourceDraft: VideoAnalysisResult = {
      ...videoResult,
      seedAudio: undefined,
      shots: Array.from({ length: 19 }, (_, index) => ({
        ...videoResult.shots[0],
        startSeconds: boundary(index),
        endSeconds: index === 18 ? videoResult.durationSeconds : boundary(index + 1),
        visualDescription: `镜头 ${index + 1}`,
      })),
    };
    const cuts = Array.from({ length: 18 }, (_, index) => boundary(index + 1));
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(geminiResponse(cutDetection(cuts)))
      .mockResolvedValueOnce(geminiResponse(sourceDraft));
    vi.stubGlobal('fetch', fetchMock);

    const result = await analyzeVideoMedia(
      new File(['video'], 'nineteen-cuts.mp4', { type: 'video/mp4' }),
      videoResult.durationSeconds,
    );

    expect(result.segmentation.mode).toBe('shot');
    expect(result.segmentation.detection?.detectedCuts).toBe(18);
    expect(result.shots).toHaveLength(19);
    const detectedBoundaries = [0, ...cuts.map((cut) => Number(cut.toFixed(3))), 8];
    expect(result.shots.map(({ startSeconds, endSeconds }) => [startSeconds, endSeconds])).toEqual(
      detectedBoundaries
        .slice(0, -1)
        .map((startSeconds, index) => [startSeconds, detectedBoundaries[index + 1]]),
    );
  });

  it('keeps the detected timeline in the compact video retry', async () => {
    const { seedAudio, ...sourceDraft } = videoResult;
    const truncatedResponse = new Response(
      JSON.stringify({
        candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{' }] } }],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(geminiResponse(cutDetection()))
      .mockResolvedValueOnce(truncatedResponse)
      .mockResolvedValueOnce(geminiResponse(sourceDraft));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      analyzeVideoMedia(
        new File(['video'], 'compact-retry.mp4', { type: 'video/mp4' }),
        videoResult.durationSeconds,
      ),
    ).resolves.toEqual(withTwoStageDetection(sourceDraft));
    expect(seedAudio).toBeDefined();

    const prompts = fetchMock.mock.calls.slice(1).map(([, init]) => {
      const body = JSON.parse(String(init?.body)) as {
        contents: Array<{ parts: Array<{ text?: string }> }>;
      };
      return body.contents[0].parts[1].text;
    });
    expect(prompts).toHaveLength(2);
    expect(prompts.every((prompt) => prompt?.includes('恰好返回 1 项'))).toBe(true);
    expect(prompts.every((prompt) => prompt?.includes('最多 64 个时间单元'))).toBe(true);
  });

  it('rejects video analysis with an invalid segmentation contract', async () => {
    const invalidDraft = { ...videoResult, segmentation: { mode: 'shot', note: '' } };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(geminiResponse(cutDetection()))
      .mockImplementation(async () => Promise.resolve(geminiResponse(invalidDraft)));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      analyzeVideoMedia(
        new File(['video'], 'invalid-segmentation.mp4', { type: 'video/mp4' }),
        videoResult.durationSeconds,
      ),
    ).rejects.toThrow('视频时间线连续返回不完整 JSON');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('uses one three-decimal duration for upward-rounded video ranges', async () => {
    const actualDuration = 8.1236;
    const canonicalDuration = 8.124;
    const roundedDraft: VideoAnalysisResult = {
      ...videoResult,
      durationSeconds: canonicalDuration,
      shots: videoResult.shots.map((shot) => ({
        ...shot,
        endSeconds: canonicalDuration,
      })),
      editReview: {
        ...videoResult.editReview,
        rhythm: videoResult.editReview.rhythm.map((point) => ({
          ...point,
          endSeconds: canonicalDuration,
        })),
        recommendations: videoResult.editReview.recommendations.map((recommendation) => ({
          ...recommendation,
          endSeconds: canonicalDuration,
        })),
      },
      seedAudio: undefined,
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(geminiResponse(cutDetection()))
      .mockResolvedValueOnce(geminiResponse(roundedDraft));
    vi.stubGlobal('fetch', fetchMock);

    const result = await analyzeVideoMedia(
      new File(['video'], 'fractional.mp4', { type: 'video/mp4' }),
      actualDuration,
    );

    expect(result.durationSeconds).toBe(canonicalDuration);
    expect(result.shots.at(-1)?.endSeconds).toBe(canonicalDuration);
    expect(result.editReview.rhythm.at(-1)?.endSeconds).toBe(canonicalDuration);
    expect(result.editReview.recommendations.at(-1)?.endSeconds).toBe(canonicalDuration);
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as {
      contents: Array<{ parts: Array<{ text?: string }> }>;
    };
    expect(body.contents[0].parts[1].text).toContain('8.124 秒');
  });

  it('compiles SeedAudio only when requested and does not resend the video', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(geminiResponse(videoResult.seedAudio));
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateSeedAudioBrief(videoResult);

    expect(result).toEqual(videoResult.seedAudio);
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as {
      contents: Array<{ parts: Array<{ inlineData?: unknown; text?: string }> }>;
    };
    expect(body.contents[0].parts.every((part) => part.inlineData === undefined)).toBe(true);
    expect(body.contents[0].parts[0].text).toContain('SeedAudio');
  });

  it('streams final report-grounded Agent text and omits thought parts', async () => {
    const firstChunk = {
      candidates: [
        {
          content: {
            parts: [{ thought: true, text: '先在内部推理节奏问题。' }, { text: '先缩短开场，' }],
          },
        },
      ],
    };
    const secondChunk = {
      candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '再检查转场。' }] } }],
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          `data: ${JSON.stringify(firstChunk)}\n\ndata: ${JSON.stringify(secondChunk)}\n\n`,
          { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);
    const onDelta = vi.fn();

    const result = await streamAnalysisAgent(
      {
        analysis: videoResult,
        messages: [
          { role: 'user', text: '先看节奏。' },
          { role: 'model', text: '开场信息密度偏低。' },
        ],
        userMessage: '给出两个剪辑动作。',
      },
      onDelta,
    );

    expect(result).toBe('先缩短开场，再检查转场。');
    expect(onDelta.mock.calls.flat()).toEqual(['先缩短开场，', '再检查转场。']);
    expect(String(fetchMock.mock.calls[0][0])).toContain(':streamGenerateContent');
    expect(String(fetchMock.mock.calls[0][0])).toContain('alt=sse');
    expect(String(fetchMock.mock.calls[0][0])).not.toContain('key=');
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get('x-goog-api-key')).toBe('test-key');
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as {
      contents: Array<{ role: string; parts: Array<{ inlineData?: unknown; text?: string }> }>;
      systemInstruction: { parts: Array<{ text: string }> };
    };
    expect(body.contents.map(({ role }) => role)).toEqual(['user', 'model', 'user']);
    expect(body.contents.at(-1)?.parts.every((part) => part.inlineData === undefined)).toBe(true);
    expect(body.systemInstruction.parts[0].text).toContain(videoResult.title);
    expect(body.systemInstruction.parts[0].text).toContain('视频分析顾问');
    expect(body.systemInstruction.parts[0].text).toContain('只输出简体中文最终答复');
    expect(body.systemInstruction.parts[0].text).toContain('不要输出思考过程');
  });

  it('reviews an attached original video at five FPS before the user prompt', async () => {
    const chunk = {
      candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '逐镜复核完成。' }] } }],
    };
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(`data: ${JSON.stringify(chunk)}\n\n`, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await streamAnalysisAgent(
      {
        analysis: videoResult,
        messages: [],
        userMessage: '重新确认切点。',
        media: new File(['video'], 'review.mp4', { type: 'video/mp4' }),
      },
      vi.fn(),
    );

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as {
      contents: Array<{
        parts: Array<{
          inlineData?: { mimeType: string };
          text?: string;
          videoMetadata?: { fps: number };
        }>;
      }>;
    };
    const parts = body.contents.at(-1)?.parts ?? [];
    expect(parts[0].inlineData?.mimeType).toBe('video/mp4');
    expect(parts[0].videoMetadata?.fps).toBe(5);
    expect(parts[1].text).toBe('重新确认切点。');
  });
});

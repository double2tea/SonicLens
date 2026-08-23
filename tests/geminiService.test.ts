import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  analyzeMusicMedia,
  analyzeVideoMedia,
  generateSeedAudioBrief,
  streamAnalysisAgent,
} from '../services/geminiService';
import { GEMINI_API_KEY_STORAGE_KEY } from '../services/geminiConfig';
import { assessVideoAnalysisQuality } from '../services/videoAnalysisQuality';
import type {
  SfxAnalysisResult,
  VideoAnalysisDetailLevel,
  VideoAnalysisRecoveryReason,
  VideoAnalysisResult,
} from '../types';

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
  summary: '骑行者沿湿润街道穿过冷色雨幕，最终停在暖色门廊前，完成从通勤压力到安全抵达的情绪转换。',
  durationSeconds: 8,
  narrativeArc:
    '开场以冷雨中的连续骑行建立压力，中段用溅水动作推进，结尾以停车和门廊暖光完成释放。',
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
      visualDescription:
        '中景跟拍骑行者从冷蓝街道左侧驶向暖色门廊，前景积水反射车灯，人物由运动状态逐渐停稳。',
      visibleAction: '骑行者加速压过积水，车轮溅起水花后减速，并在门廊台阶前完整停下。',
      onScreenText: '',
      dialogue: '',
      existingSound: '近景细雨和轮胎压水声位于前景，远处车流与低频城市底噪留在背景。',
      soundCue: {
        cue: '轮胎溅水衔接钥匙转动。',
        priority: 'must',
        diegeticStatus: 'diegetic',
        function: '用溅水瞬态强调运动峰值，再以钥匙声把注意力从街道转移到抵达动作。',
        character: '近距离湿润水花具有快速 attack 和短尾音，随后接干燥清脆的金属钥匙高频瞬态。',
        route: 'timed_clip',
        mixRisk: '持续雨声会占据钥匙高频细节，需要在钥匙出现前短暂压低环境声并保留瞬态空间。',
      },
    },
  ],
  editReview: {
    verdict: {
      status: 'major_revision',
      rationale: '当前叙事方向成立，但开场跟拍拖慢目标建立，需先收紧节奏再继续交付。',
    },
    strengths: ['冷蓝街道与暖色门廊形成明确视觉转折，停车动作也提供了同步落点。'],
    topIssues: ['前四秒持续跟拍缺少新的构图或信息变化，抵达动作出现得略晚。'],
    rhythmSummary:
      '前四秒以稳定跟拍建立通勤压力，后四秒通过溅水、减速和停车连续提高动作信息密度并形成收束。',
    rhythm: [
      {
        startSeconds: 0,
        endSeconds: 8,
        intensity: 3,
        label: '抵达',
        description: '骑行速度与水花瞬态推动前半段，减速和停车让注意力在门廊前形成清晰落点。',
      },
    ],
    visualFinish: {
      compositionAndContinuity:
        '骑行者始终由左向右移动，跟拍轴线稳定，停车前后的运动方向保持连续。',
      colorAndExposure: '街道冷蓝高光与门廊暖色形成层次，但积水反射可略压高光以保留纹理。',
      vfxAndMotion: '现有水花与镜头运动已经提供动势，无需额外特效，只需稳定停车段的轻微抖动。',
      typographyAndBranding: '当前没有文字包装；若用于品牌短片，可把尾板放在门廊右侧稳定负空间。',
    },
    recommendations: [
      {
        startSeconds: 0,
        endSeconds: 4,
        category: 'pacing',
        priority: 'high',
        decision: 'trim',
        evidence: '前四秒保持相同跟拍距离和运动方向，画面没有新增主体或构图变化。',
        action: '从开场稳定骑行段收紧约一秒，并保留车轮第一次压过积水的完整动作。',
        expectedImpact: '更快到达水花视觉峰值，同时保留从街道进入门廊的空间连续性。',
      },
      {
        startSeconds: 4,
        endSeconds: 8,
        category: 'color',
        priority: 'medium',
        decision: 'polish',
        evidence: '抵达门廊后暖色高光集中在右侧，积水反射仍保留较亮的冷色峰值。',
        action: '局部压低积水反射约半档，并轻微提升门廊暖色主体的中间调层次。',
        expectedImpact: '让视线更稳定地落到抵达位置，并强化冷雨到暖光的情绪收束。',
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

const withTwoStageDetection = (
  result: Omit<VideoAnalysisResult, 'seedAudio'>,
  cuts: number[] = [],
  detailLevel: VideoAnalysisDetailLevel = 'full',
  recoveryReasons: VideoAnalysisRecoveryReason[] = [],
): VideoAnalysisResult => {
  const detected: VideoAnalysisResult = {
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
  };
  const assessment = assessVideoAnalysisQuality(detected);
  return {
    ...detected,
    quality: {
      status: 'pass',
      detailLevel,
      score: assessment.score,
      passThreshold: 78,
      issues: assessment.issues.map(({ message }) => message).slice(0, 6),
      weakestShotIndexes: assessment.weakestShotIndexes,
      automaticRepairs: 0,
      recoveryReasons,
      model: 'gemini-3.7-flash',
    },
  };
};

const makeMinimalVideoDraft = (): Omit<VideoAnalysisResult, 'seedAudio' | 'quality'> => {
  const { seedAudio, quality, ...draft } = videoResult;
  void seedAudio;
  void quality;
  return {
    ...draft,
    summary: '双人广告',
    narrativeArc: '展示产品',
    shots: draft.shots.map((shot) => ({
      ...shot,
      visualDescription: '男女面对镜头微笑。',
      visibleAction: '微笑',
      existingSound: '背景音乐',
      soundCue: {
        ...shot.soundCue,
        function: '结束',
        character: '轻柔',
        mixRisk: '低',
      },
    })),
    editReview: {
      ...draft.editReview,
      strengths: ['好看'],
      topIssues: ['无'],
      rhythmSummary: '正常',
      visualFinish: {
        compositionAndContinuity: '正常',
        colorAndExposure: '正常',
        vfxAndMotion: '无',
        typographyAndBranding: '简单',
      },
      recommendations: draft.editReview.recommendations.map((recommendation) => ({
        ...recommendation,
        evidence: '一般',
        action: '优化',
        expectedImpact: '更好',
      })),
    },
  };
};

const makeDetailedQualityRepair = () => ({
  title: videoResult.title,
  summary: videoResult.summary,
  narrativeArc: videoResult.narrativeArc,
  verdict: videoResult.editReview.verdict,
  strengths: videoResult.editReview.strengths,
  topIssues: videoResult.editReview.topIssues,
  rhythmSummary: videoResult.editReview.rhythmSummary,
  visualFinish: videoResult.editReview.visualFinish,
  shots: videoResult.shots.map((shot, sourceIndex) => ({
    sourceIndex,
    visualDescription: shot.visualDescription,
    visibleAction: shot.visibleAction,
    existingSound: shot.existingSound,
    soundCue: shot.soundCue.cue,
    soundFunction: shot.soundCue.function,
    soundCharacter: shot.soundCue.character,
    mixRisk: shot.soundCue.mixRisk,
  })),
  recommendationRepairs: videoResult.editReview.recommendations.map(
    ({ evidence, action, expectedImpact }, sourceIndex) => ({
      sourceIndex,
      evidence,
      action,
      expectedImpact,
    }),
  ),
  additionalRecommendations: [],
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

  it('preserves the HTTP status when an upstream error is not JSON', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('<html>Bad gateway</html>', { status: 502 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      analyzeMusicMedia(new File(['audio'], 'impact.mp3', { type: 'audio/mpeg' }), 'sfx'),
    ).rejects.toThrow('Gemini API 请求失败：HTTP 502');
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
    expect(secondBody.contents[0].parts[1].text).toContain('homecoming.mp4');
    expect(secondBody.contents[0].parts[1].text).toContain('ready');
    expect(secondBody.contents[0].parts[1].text).toContain('decision');
    expect(secondBody.contents[0].parts[1].text).toContain('不得把柔顺剂写成洗衣液');
    expect(onProgress.mock.calls.map(([update]) => update.stage)).toEqual(['detect', 'analyze']);
  });

  it('enriches a low-detail video result exactly once and records the quality provenance', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(geminiResponse(cutDetection()))
      .mockResolvedValueOnce(geminiResponse(makeMinimalVideoDraft()))
      .mockResolvedValueOnce(geminiResponse(makeDetailedQualityRepair()));
    vi.stubGlobal('fetch', fetchMock);
    const onProgress = vi.fn();

    const result = await analyzeVideoMedia(
      new File(['video'], 'minimal.mp4', { type: 'video/mp4' }),
      videoResult.durationSeconds,
      undefined,
      onProgress,
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.quality).toMatchObject({
      status: 'enriched',
      detailLevel: 'full',
      automaticRepairs: 1,
      recoveryReasons: ['low_detail'],
      score: 100,
    });
    expect(result.summary).toBe(videoResult.summary);
    expect(onProgress.mock.calls.map(([update]) => update.title)).toContain('正在深化分析证据');
    const repairBody = JSON.parse(String(fetchMock.mock.calls[2][1]?.body)) as {
      contents: Array<{ parts: Array<{ text?: string }> }>;
    };
    expect(repairBody.contents[0].parts[1].text).toContain('本轮最多补强一次');
  });

  it('repairs a product category contradicted by dialogue and screen text', async () => {
    const { seedAudio, quality, ...baseDraft } = videoResult;
    void seedAudio;
    void quality;
    const conflictedDraft = {
      ...baseDraft,
      title: 'Airis 洗衣液广告',
      summary: '这支广告展示 Airis 洗衣液带来的清新洗衣体验。',
      shots: baseDraft.shots.map((shot) => ({
        ...shot,
        visualDescription: `${shot.visualDescription}，人物手持 Airis 洗衣液。`,
        onScreenText: 'LION ソフラン Airis 柔軟剤',
        dialogue: 'きっと初めての柔軟剤',
        soundCue: { ...shot.soundCue, cue: '倒洗衣液的水流声' },
      })),
      editReview: {
        ...baseDraft.editReview,
        verdict: {
          status: 'major_revision' as const,
          rationale: '洗衣液卖点已经成立，但开场节奏仍需要明显收紧后再交付。',
        },
        strengths: ['清新光线准确传达洗衣液的使用体验。'],
        visualFinish: {
          ...baseDraft.editReview.visualFinish,
          typographyAndBranding: '洗衣液包装、Logo 与品牌尾板均保持清晰可读。',
        },
        recommendations: baseDraft.editReview.recommendations.map((recommendation, index) =>
          index === 0
            ? { ...recommendation, evidence: '洗衣液产品出现前的跟拍持续时间偏长。' }
            : recommendation,
        ),
      },
    };
    const correctedTitle = 'Airis 柔顺剂广告';
    const correctedSummary = '这支广告通过清新空气感展示 Airis 柔顺剂带来的衣物护理体验。';
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(geminiResponse(cutDetection()))
      .mockResolvedValueOnce(geminiResponse(conflictedDraft))
      .mockResolvedValueOnce(
        geminiResponse({
          title: correctedTitle,
          summary: correctedSummary,
          narrativeArc: conflictedDraft.narrativeArc,
          verdict: videoResult.editReview.verdict,
          strengths: videoResult.editReview.strengths,
          topIssues: conflictedDraft.editReview.topIssues,
          rhythmSummary: conflictedDraft.editReview.rhythmSummary,
          visualFinish: videoResult.editReview.visualFinish,
          shots: [
            {
              sourceIndex: 0,
              visualDescription: videoResult.shots[0].visualDescription,
              visibleAction: videoResult.shots[0].visibleAction,
              existingSound: videoResult.shots[0].existingSound,
              soundCue: videoResult.shots[0].soundCue.cue,
              soundFunction: videoResult.shots[0].soundCue.function,
              soundCharacter: videoResult.shots[0].soundCue.character,
              mixRisk: videoResult.shots[0].soundCue.mixRisk,
            },
          ],
          recommendationRepairs: [
            {
              sourceIndex: 0,
              evidence: videoResult.editReview.recommendations[0].evidence,
              action: videoResult.editReview.recommendations[0].action,
              expectedImpact: videoResult.editReview.recommendations[0].expectedImpact,
            },
          ],
          additionalRecommendations: [],
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await analyzeVideoMedia(
      new File(['video'], '狮王柔顺剂Airis广告.mp4', { type: 'video/mp4' }),
      videoResult.durationSeconds,
    );

    expect(result.title).toBe(correctedTitle);
    expect(result.summary).toBe(correctedSummary);
    expect(result.shots[0].dialogue).toBe('きっと初めての柔軟剤');
    expect(JSON.stringify(result)).not.toContain('洗衣液');
    expect(result.quality?.status).toBe('enriched');
    const repairBody = JSON.parse(String(fetchMock.mock.calls[2][1]?.body)) as {
      contents: Array<{ parts: Array<{ text?: string }> }>;
    };
    expect(repairBody.contents[0].parts[1].text).toContain('狮王柔顺剂Airis广告.mp4');
  });

  it('merges out-of-order repairs by source index without replacing OCR or shot metadata', async () => {
    const minimal = makeMinimalVideoDraft();
    const ranges = [
      [0, 2],
      [2, 5],
      [5, 8],
    ] as const;
    const sourceDraft = {
      ...minimal,
      shots: ranges.map(([startSeconds, endSeconds], index) => ({
        ...minimal.shots[0],
        startSeconds,
        endSeconds,
        shotType: `保留景别 ${index + 1}`,
        onScreenText: `保留文字 ${index + 1}`,
        dialogue: `保留对白 ${index + 1}`,
      })),
    };
    const repairedShots = [
      {
        sourceIndex: 2,
        visualDescription: '门廊中景里骑行者进入暖光，右侧木门由关闭变为开启并露出室内空间。',
        visibleAction: '骑行者停稳后抬手转动钥匙，木门从闭合状态向内打开。',
        existingSound: '前景钥匙金属转动与木门摩擦声清晰，背景雨声退到远处。',
        soundCue: '钥匙转动与木门开启声',
        soundFunction: '用钥匙瞬态确认抵达，并在开门动作结束时形成全片收束落点。',
        soundCharacter: '近距金属脆响快速起音并短促衰减，随后接室内木门的干声尾音。',
        mixRisk: '钥匙高频可能被前景雨声音效遮蔽，需要在转动瞬间压低环境声。',
      },
      {
        sourceIndex: 0,
        visualDescription: '冷蓝街道全景中骑行者由左向右进入，前景积水反射车灯并随车轮扫过。',
        visibleAction: '骑行者从画面左侧加速驶入，前轮压过积水并在中部溅起水花。',
        existingSound: '前景轮胎压水声覆盖短促瞬态，远处车流与细雨保持在背景。',
        soundCue: '轮胎压水与短促水花声',
        soundFunction: '以压水瞬态建立第一处动作峰值，并把注意力从环境引向骑行者。',
        soundCharacter: '近距液体撞击快速起音、主体饱满并短尾衰减，空间位于画面中央。',
        mixRisk: '轮胎低频可能与音乐鼓点重叠，需要错开两个瞬态并给动作声留出动态。',
      },
      {
        sourceIndex: 1,
        visualDescription: '骑行者中景沿冷色街道向右推进，暖色门廊从背景逐渐进入构图中央。',
        visibleAction: '骑行者持续踩踏后开始减速，身体重心抬起并转向门廊入口。',
        existingSound: '中景链条转动与轮胎摩擦保持前景，持续细雨和城市底噪位于背景。',
        soundCue: '链条减速与轮胎摩擦声',
        soundFunction: '用逐渐放缓的机械节奏连接骑行峰值与停车动作，提示即将抵达。',
        soundCharacter: '中距机械摩擦具有连续主体与渐弱尾音，声像随人物从左移向中央。',
        mixRisk: '链条中频会与音乐持续声部冲突，需要在减速段降低音乐密度。',
      },
    ];
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(geminiResponse(cutDetection([2, 5])))
      .mockResolvedValueOnce(geminiResponse(sourceDraft))
      .mockResolvedValueOnce(
        geminiResponse({
          ...makeDetailedQualityRepair(),
          shots: repairedShots,
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await analyzeVideoMedia(
      new File(['video'], 'indexed-repair.mp4', { type: 'video/mp4' }),
      8,
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.quality?.status).toBe('enriched');
    expect(result.shots.map(({ visualDescription }) => visualDescription)).toEqual([
      repairedShots[1].visualDescription,
      repairedShots[2].visualDescription,
      repairedShots[0].visualDescription,
    ]);
    expect(result.shots.map(({ onScreenText }) => onScreenText)).toEqual([
      '保留文字 1',
      '保留文字 2',
      '保留文字 3',
    ]);
    expect(result.shots.map(({ dialogue }) => dialogue)).toEqual([
      '保留对白 1',
      '保留对白 2',
      '保留对白 3',
    ]);
    expect(result.shots.map(({ shotType }) => shotType)).toEqual([
      '保留景别 1',
      '保留景别 2',
      '保留景别 3',
    ]);
  });

  it('repairs only weak visual-finish and recommendation fields', async () => {
    const { seedAudio, quality, ...baseDraft } = videoResult;
    void seedAudio;
    void quality;
    const originalComposition = baseDraft.editReview.visualFinish.compositionAndContinuity;
    const originalRecommendation = baseDraft.editReview.recommendations[0];
    const sourceDraft = {
      ...baseDraft,
      editReview: {
        ...baseDraft.editReview,
        visualFinish: {
          ...baseDraft.editReview.visualFinish,
          vfxAndMotion: '无',
        },
        recommendations: baseDraft.editReview.recommendations.map((recommendation, index) =>
          index === 0 ? { ...recommendation, evidence: '一般' } : recommendation,
        ),
      },
    };
    const repairedEvidence = '前四秒保持相同跟拍距离，画面没有新增主体或构图变化。';
    const repairedVfx = '水花与跟拍运动已经提供动势，只需稳定停车段末端的轻微抖动。';
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(geminiResponse(cutDetection()))
      .mockResolvedValueOnce(geminiResponse(sourceDraft))
      .mockResolvedValueOnce(
        geminiResponse({
          title: videoResult.title,
          summary: videoResult.summary,
          narrativeArc: videoResult.narrativeArc,
          verdict: videoResult.editReview.verdict,
          strengths: videoResult.editReview.strengths,
          topIssues: videoResult.editReview.topIssues,
          rhythmSummary: videoResult.editReview.rhythmSummary,
          visualFinish: {
            compositionAndContinuity: '不得覆盖原构图判断',
            colorAndExposure: '不得覆盖原调色判断',
            vfxAndMotion: repairedVfx,
            typographyAndBranding: '不得覆盖原品牌判断',
          },
          shots: [],
          recommendationRepairs: [
            {
              sourceIndex: 0,
              evidence: repairedEvidence,
              action: '不得覆盖原动作',
              expectedImpact: '不得覆盖原影响',
            },
          ],
          additionalRecommendations: [],
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await analyzeVideoMedia(
      new File(['video'], 'field-repair.mp4', { type: 'video/mp4' }),
      videoResult.durationSeconds,
    );

    expect(result.quality?.status).toBe('enriched');
    expect(result.editReview.visualFinish).toMatchObject({
      compositionAndContinuity: originalComposition,
      vfxAndMotion: repairedVfx,
    });
    expect(result.editReview.recommendations[0]).toEqual({
      ...originalRecommendation,
      evidence: repairedEvidence,
    });
    expect(result.editReview.recommendations[1]).toEqual(baseDraft.editReview.recommendations[1]);
  });

  it('repairs the verdict instead of inventing a missing recommendation', async () => {
    const { seedAudio, quality, ...baseDraft } = videoResult;
    void seedAudio;
    void quality;
    const existingRecommendation = baseDraft.editReview.recommendations[1];
    const sourceDraft = {
      ...baseDraft,
      editReview: {
        ...baseDraft.editReview,
        recommendations: [existingRecommendation],
      },
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(geminiResponse(cutDetection()))
      .mockResolvedValueOnce(geminiResponse(sourceDraft))
      .mockResolvedValueOnce(
        geminiResponse({
          title: videoResult.title,
          summary: videoResult.summary,
          narrativeArc: videoResult.narrativeArc,
          verdict: {
            status: 'minor_revision',
            rationale: '整体结构成立，仅需按现有建议微调高光层次即可交付。',
          },
          strengths: videoResult.editReview.strengths,
          topIssues: videoResult.editReview.topIssues,
          rhythmSummary: videoResult.editReview.rhythmSummary,
          visualFinish: videoResult.editReview.visualFinish,
          shots: [],
          recommendationRepairs: [],
          additionalRecommendations: [],
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await analyzeVideoMedia(
      new File(['video'], 'recommendation-count-repair.mp4', { type: 'video/mp4' }),
      videoResult.durationSeconds,
    );

    expect(result.quality?.status).toBe('enriched');
    expect(result.editReview.verdict?.status).toBe('minor_revision');
    expect(result.editReview.recommendations).toEqual([existingRecommendation]);
  });

  it('returns the best limited result without starting an unbounded repair loop', async () => {
    const minimalDraft = makeMinimalVideoDraft();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(geminiResponse(cutDetection()))
      .mockResolvedValueOnce(geminiResponse(minimalDraft))
      .mockResolvedValueOnce(
        geminiResponse({
          title: minimalDraft.title,
          summary: minimalDraft.summary,
          narrativeArc: minimalDraft.narrativeArc,
          verdict: minimalDraft.editReview.verdict,
          strengths: minimalDraft.editReview.strengths,
          topIssues: minimalDraft.editReview.topIssues,
          rhythmSummary: minimalDraft.editReview.rhythmSummary,
          visualFinish: minimalDraft.editReview.visualFinish,
          shots: minimalDraft.shots.map((shot, sourceIndex) => ({
            sourceIndex,
            visualDescription: shot.visualDescription,
            visibleAction: shot.visibleAction,
            existingSound: shot.existingSound,
            soundCue: shot.soundCue.cue,
            soundFunction: shot.soundCue.function,
            soundCharacter: shot.soundCue.character,
            mixRisk: shot.soundCue.mixRisk,
          })),
          recommendationRepairs: minimalDraft.editReview.recommendations.map(
            ({ evidence, action, expectedImpact }, sourceIndex) => ({
              sourceIndex,
              evidence,
              action,
              expectedImpact,
            }),
          ),
          additionalRecommendations: [],
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await analyzeVideoMedia(
      new File(['video'], 'still-minimal.mp4', { type: 'video/mp4' }),
      videoResult.durationSeconds,
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.summary).toBe(minimalDraft.summary);
    expect(result.quality).toMatchObject({
      status: 'limited',
      automaticRepairs: 1,
      recoveryReasons: ['low_detail'],
    });
    expect(result.quality?.score).toBeLessThan(78);
  });

  it('keeps the initial report and exposes a failed enrichment attempt', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(geminiResponse(cutDetection()))
      .mockResolvedValueOnce(geminiResponse(makeMinimalVideoDraft()))
      .mockResolvedValueOnce(new Response('upstream unavailable', { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await analyzeVideoMedia(
      new File(['video'], 'repair-failed.mp4', { type: 'video/mp4' }),
      videoResult.durationSeconds,
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.quality).toMatchObject({
      status: 'limited',
      automaticRepairs: 1,
      recoveryReasons: ['low_detail', 'repair_failed'],
    });
    expect(result.quality?.issues[0]).toContain('自动深化未完成');
  });

  it('propagates cancellation during quality repair without returning a limited report', async () => {
    const controller = new AbortController();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(geminiResponse(cutDetection()))
      .mockResolvedValueOnce(geminiResponse(makeMinimalVideoDraft()))
      .mockImplementationOnce(() => {
        controller.abort();
        return Promise.reject(controller.signal.reason);
      });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      analyzeVideoMedia(
        new File(['video'], 'repair-aborted.mp4', { type: 'video/mp4' }),
        videoResult.durationSeconds,
        controller.signal,
      ),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('caps the worst compact-recovery path at four model requests', async () => {
    const minimalDraft = makeMinimalVideoDraft();
    const truncatedResponse = new Response(
      JSON.stringify({
        candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{' }] } }],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
    const minimalRepair = {
      title: minimalDraft.title,
      summary: minimalDraft.summary,
      narrativeArc: minimalDraft.narrativeArc,
      verdict: minimalDraft.editReview.verdict,
      strengths: minimalDraft.editReview.strengths,
      topIssues: minimalDraft.editReview.topIssues,
      rhythmSummary: minimalDraft.editReview.rhythmSummary,
      visualFinish: minimalDraft.editReview.visualFinish,
      shots: minimalDraft.shots.map((shot, sourceIndex) => ({
        sourceIndex,
        visualDescription: shot.visualDescription,
        visibleAction: shot.visibleAction,
        existingSound: shot.existingSound,
        soundCue: shot.soundCue.cue,
        soundFunction: shot.soundCue.function,
        soundCharacter: shot.soundCue.character,
        mixRisk: shot.soundCue.mixRisk,
      })),
      recommendationRepairs: minimalDraft.editReview.recommendations.map(
        ({ evidence, action, expectedImpact }, sourceIndex) => ({
          sourceIndex,
          evidence,
          action,
          expectedImpact,
        }),
      ),
      additionalRecommendations: [],
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(geminiResponse(cutDetection()))
      .mockResolvedValueOnce(truncatedResponse)
      .mockResolvedValueOnce(geminiResponse(minimalDraft))
      .mockResolvedValueOnce(geminiResponse(minimalRepair));
    vi.stubGlobal('fetch', fetchMock);

    const result = await analyzeVideoMedia(
      new File(['video'], 'compact-limited.mp4', { type: 'video/mp4' }),
      videoResult.durationSeconds,
    );

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(result.quality).toMatchObject({
      status: 'limited',
      detailLevel: 'compact',
      recoveryReasons: ['max_tokens', 'low_detail'],
    });
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
    ).resolves.toEqual(withTwoStageDetection(sourceDraft, [], 'compact', ['max_tokens']));
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
    expect(body.systemInstruction.parts[0].text).toContain('审片与后期决策顾问');
    expect(body.systemInstruction.parts[0].text).toContain('没有必须修改项时明确说明');
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

  it('identifies a lightweight proxy without claiming it is the original video', async () => {
    const chunk = {
      candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '代理复核完成。' }] } }],
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
        media: new File(['proxy'], 'review.analysis.mp4', { type: 'video/mp4' }),
        mediaIsProxy: true,
      },
      vi.fn(),
    );

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as {
      contents: Array<{ parts: Array<{ inlineData?: unknown; text?: string }> }>;
    };
    const parts = body.contents.at(-1)?.parts ?? [];
    expect(parts[0].inlineData).toBeDefined();
    expect(parts[1].text).toContain('轻量分析代理');
    expect(parts[1].text).toContain('不要声称查看了原片');
    expect(parts[2].text).toBe('重新确认切点。');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ANALYSIS_HISTORY_LIMIT,
  cacheAnalysisHistoryItem,
  clearAnalysisHistory,
  deleteAnalysisHistoryItem,
  loadAnalysisHistory,
  toggleAnalysisHistoryFavorite,
  updateAnalysisHistoryItem,
} from '../services/analysisHistory';
import { isAnalysisResult } from '../types';
import type { MusicAnalysisResult, SfxAnalysisResult, VideoAnalysisResult } from '../types';
import {
  formatTimestamp,
  parseTimestampRange,
  parseTimestampToSeconds,
} from '../services/timecode';
import { normalizeAudioRange } from '../services/audioUtils';

const musicResult: MusicAnalysisResult = {
  type: 'music',
  keywords: ['cinematic', 'pulse'],
  educationalContext: 'Layered electronic score.',
  instruments: ['synth', 'drums'],
  mood: ['focused'],
  optimizedPrompt: 'Cinematic electronic pulse.',
  mainGenre: 'Cinematic electronic',
  subGenres: ['ambient'],
  bpm: 118,
  timeSignature: '4/4',
  key: 'D minor',
  rhythmDescription: 'Steady pulse',
  similarTracks: [{ artist: 'Artist', title: 'Track' }],
  sonicProfile: {
    energy: 72,
    happiness: 34,
    acousticness: 18,
    instrumental: 94,
    intensity: 68,
  },
  multipleSongsDetected: false,
  segments: [
    {
      timestamp: '00:00 - 00:20',
      genre: 'Ambient',
      mood: 'Tense',
      description: 'A restrained opening.',
      bpm: 118,
      key: 'D minor',
      instruments: ['synth'],
    },
  ],
  editorCuePoints: [
    {
      timestamp: '00:12',
      eventName: 'Pulse enters',
      vibeChange: 'Energy rises',
      visualAdvice: 'Cut on the transient.',
    },
  ],
};

const sfxResult: SfxAnalysisResult = {
  type: 'sfx',
  keywords: ['metal', 'impact'],
  educationalContext: 'A short metallic impact.',
  instruments: ['steel plate'],
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
  summary: '一名骑行者穿过雨夜街道并抵达家门。',
  durationSeconds: 12.5,
  segmentation: {
    mode: 'shot',
    note: '已按可辨认剪辑点逐镜拆分，切点仍建议人工复核。',
  },
  narrativeArc: '孤独骑行逐步转向温暖抵达。',
  visualStyle: ['低照度', '写实', '冷暖对比'],
  keywords: ['雨夜', '骑行', '归家'],
  shots: [
    {
      startSeconds: 0,
      endSeconds: 5.25,
      shotType: '远景',
      cameraAngle: '平视',
      cameraMovement: '缓慢跟拍',
      transition: '硬切',
      visualDescription: '骑行者从湿润街道远端进入画面。',
      visibleAction: '车轮掠过积水。',
      onScreenText: '',
      dialogue: '',
      existingSound: '细雨与远处车流。',
      soundCue: {
        cue: '近景轮胎压过积水的短促飞溅。',
        priority: 'must',
        diegeticStatus: 'diegetic',
        function: '强化动作同步。',
        character: '湿润、克制、近距离。',
        route: 'timed_clip',
        mixRisk: '不要盖住后续门锁声。',
      },
    },
    {
      startSeconds: 5.25,
      endSeconds: 12.5,
      shotType: '中近景',
      cameraAngle: '侧后方',
      cameraMovement: '固定',
      transition: '硬切',
      visualDescription: '骑行者停在暖色门廊并开门。',
      visibleAction: '手转动钥匙并推开木门。',
      onScreenText: '',
      dialogue: '',
      existingSound: '雨声减弱，门锁声清晰。',
      soundCue: {
        cue: '清脆钥匙转动后衔接低沉木门开启声。',
        priority: 'recommended',
        diegeticStatus: 'diegetic',
        function: '完成从室外到归家的情绪转折。',
        character: '近距离、干净、有温度。',
        route: 'library_foley',
        mixRisk: '门声尾部避免过长混响。',
      },
    },
  ],
  editReview: {
    strengths: ['冷暖色温转折明确', '动作线索完整'],
    topIssues: ['开场跟拍略长', '抵达镜头的信息密度偏低'],
    rhythmSummary: '前段克制，抵达动作形成清晰的节奏落点。',
    rhythm: [
      {
        startSeconds: 0,
        endSeconds: 5.25,
        intensity: 2,
        label: '雨夜铺垫',
        description: '稳定跟拍建立环境与人物状态。',
      },
      {
        startSeconds: 5.25,
        endSeconds: 12.5,
        intensity: 4,
        label: '抵达落点',
        description: '钥匙与推门动作提升信息密度并完成转折。',
      },
    ],
    visualFinish: {
      compositionAndContinuity: '人物运动方向连续，第二镜可适当收紧构图。',
      colorAndExposure: '冷雨夜与暖门廊对比有效，注意暗部细节一致。',
      vfxAndMotion: '无需复杂特效，可轻微增强积水反射。',
      typographyAndBranding: '当前无文字包装，如用于品牌短片需补充克制尾板。',
    },
    recommendations: [
      {
        startSeconds: 1.5,
        endSeconds: 5.25,
        category: 'pacing',
        priority: 'high',
        evidence: '骑行者进入画面后动作变化较少。',
        action: '将开场跟拍缩短约 0.8 秒，保留溅水动作。',
        expectedImpact: '更快建立人物目标，并让抵达动作更有力度。',
      },
      {
        startSeconds: 10,
        endSeconds: 12.5,
        category: 'branding',
        priority: 'low',
        evidence: '推门后留有稳定的暖色负空间。',
        action: '如用于品牌发布，在门开启后加入简洁尾板。',
        expectedImpact: '提供自然的品牌收束点。',
      },
    ],
  },
  seedAudio: {
    recommendedMode: 'assembled_mix',
    contentMode: 'nonverbal',
    projectContext: '12 秒写实短片，冷雨夜转向暖色门廊。',
    speakerVo: '无旁白。',
    music: '极简低频氛围，抵达时出现温暖和声。',
    sfxAmbience: '细雨、远处车流、轮胎溅水、钥匙与木门。',
    mix: '雨声保持背景，动作瞬态清晰居前，音乐不遮挡门锁声。',
    avoid: ['夸张雷声', '密集旋律', '长混响门声'],
    textPrompt:
      'Create restrained cinematic sound for a 12-second rainy-night homecoming. Keep fine rain and distant traffic behind close tire splashes, then make the key turn and wooden door opening crisp and intimate as a warm minimal harmony arrives. No voice, exaggerated thunder, dense melody, or long door reverb.',
  },
  risks: ['雨声与轮胎溅水可能占据相同高频空间。'],
};

describe('isAnalysisResult', () => {
  it('accepts complete music, SFX and video results', () => {
    expect(isAnalysisResult(musicResult, 'music')).toBe(true);
    expect(
      isAnalysisResult(
        {
          ...musicResult,
          bpm: 118.5,
          segments: musicResult.segments?.map((segment) => ({ ...segment, bpm: 118.5 })),
        },
        'music',
      ),
    ).toBe(true);
    expect(isAnalysisResult(sfxResult, 'sfx')).toBe(true);
    expect(isAnalysisResult(videoResult, 'video')).toBe(true);
  });

  it('accepts video analysis without SeedAudio and requires the edit review', () => {
    const withoutSeedAudio: Record<string, unknown> = { ...videoResult };
    delete withoutSeedAudio.seedAudio;
    expect(isAnalysisResult(withoutSeedAudio, 'video')).toBe(true);

    const legacyVideo: Record<string, unknown> = { ...videoResult };
    delete legacyVideo.editReview;
    expect(isAnalysisResult(legacyVideo, 'video')).toBe(false);
  });

  it('validates optional editorial decisions while preserving legacy video reports', () => {
    const withEditorialDecisions: VideoAnalysisResult = {
      ...videoResult,
      editReview: {
        ...videoResult.editReview,
        verdict: {
          status: 'minor_revision',
          rationale: '主体叙事成立，但开场节奏与品牌收束仍需局部调整。',
        },
        recommendations: videoResult.editReview.recommendations.map((recommendation, index) => ({
          ...recommendation,
          category: index === 1 ? 'sound' : recommendation.category,
          decision: index === 0 ? 'trim' : 'polish',
        })),
      },
    };

    expect(isAnalysisResult(withEditorialDecisions, 'video')).toBe(true);
    expect(
      isAnalysisResult({
        ...withEditorialDecisions,
        editReview: {
          ...withEditorialDecisions.editReview,
          verdict: { status: 'approved', rationale: '错误状态。' },
        },
      }),
    ).toBe(false);
    expect(
      isAnalysisResult({
        ...withEditorialDecisions,
        editReview: {
          ...withEditorialDecisions.editReview,
          recommendations: withEditorialDecisions.editReview.recommendations.map(
            (recommendation, index) =>
              index === 0 ? { ...recommendation, decision: 'shorten' } : recommendation,
          ),
        },
      }),
    ).toBe(false);

    expect(isAnalysisResult(videoResult, 'video')).toBe(true);
    expect(
      isAnalysisResult({
        ...videoResult,
        editReview: {
          ...videoResult.editReview,
          verdict: { status: 'ready', rationale: '当前版本没有阻塞交付的剪辑问题。' },
          recommendations: [],
        },
      }),
    ).toBe(true);
  });

  it('requires explicit valid video segmentation metadata', () => {
    const withoutSegmentation: Record<string, unknown> = { ...videoResult };
    delete withoutSegmentation.segmentation;

    expect(isAnalysisResult(withoutSegmentation, 'video')).toBe(false);
    expect(
      isAnalysisResult({
        ...videoResult,
        segmentation: { mode: 'montage', note: '错误模式' },
      }),
    ).toBe(false);
    expect(
      isAnalysisResult({
        ...videoResult,
        segmentation: { mode: 'sequence', note: '' },
      }),
    ).toBe(false);
  });

  it('validates two-stage cut detection metadata', () => {
    const detection = {
      method: 'two_stage',
      sampleRateFps: 10,
      detectedCuts: 18,
      confidence: 'high',
    };
    const withDetection = (value: unknown) => ({
      ...videoResult,
      segmentation: { ...videoResult.segmentation, detection: value },
    });

    expect(isAnalysisResult(withDetection(detection), 'video')).toBe(true);
    expect(isAnalysisResult(withDetection('invalid'))).toBe(false);
    expect(isAnalysisResult(withDetection({ ...detection, method: 'single_stage' }))).toBe(false);
    expect(isAnalysisResult(withDetection({ ...detection, sampleRateFps: 0 }))).toBe(false);
    expect(isAnalysisResult(withDetection({ ...detection, detectedCuts: '18' }))).toBe(false);
    expect(isAnalysisResult(withDetection({ ...detection, detectedCuts: 1.5 }))).toBe(false);
    expect(isAnalysisResult(withDetection({ ...detection, detectedCuts: -1 }))).toBe(false);
    expect(isAnalysisResult(withDetection({ ...detection, confidence: 'certain' }))).toBe(false);
  });

  it('accepts a complete 19-shot timeline without collapsing its cuts', () => {
    const shots = Array.from({ length: 19 }, (_, index) => ({
      ...videoResult.shots[index % videoResult.shots.length],
      startSeconds: index,
      endSeconds: index + 1,
      visualDescription: `候选镜头 ${index + 1}`,
    }));
    const analysis: VideoAnalysisResult = {
      ...videoResult,
      durationSeconds: 19,
      shots,
      editReview: {
        ...videoResult.editReview,
        rhythm: [
          {
            startSeconds: 0,
            endSeconds: 19,
            intensity: 3,
            label: '完整时间线',
            description: '十九个候选镜头连续覆盖全片。',
          },
        ],
        recommendations: [
          {
            ...videoResult.editReview.recommendations[0],
            startSeconds: 0,
            endSeconds: 19,
          },
        ],
      },
    };

    expect(isAnalysisResult(analysis, 'video')).toBe(true);
    expect(analysis.shots).toHaveLength(19);
  });

  it('rejects mode mismatches and non-object input', () => {
    expect(isAnalysisResult(musicResult, 'sfx')).toBe(false);
    expect(isAnalysisResult(null)).toBe(false);
    expect(isAnalysisResult([])).toBe(false);
  });

  it('rejects invalid nested fields', () => {
    expect(isAnalysisResult({ ...musicResult, keywords: [3] })).toBe(false);
    expect(isAnalysisResult({ ...musicResult, sonicProfile: { energy: 4.2 } })).toBe(false);
    expect(isAnalysisResult({ ...musicResult, similarTracks: [{ title: 'Missing artist' }] })).toBe(
      false,
    );
    expect(isAnalysisResult({ ...musicResult, segments: [{ timestamp: '00:00' }] })).toBe(false);
    expect(isAnalysisResult({ ...musicResult, editorCuePoints: [{ timestamp: '00:12' }] })).toBe(
      false,
    );
    expect(isAnalysisResult({ ...sfxResult, sfx: { ...sfxResult.sfx, visualSyncTips: 3 } })).toBe(
      false,
    );
  });

  it('rejects invalid video time ranges and non-finite timing values', () => {
    const [firstShot] = videoResult.shots;

    expect(
      isAnalysisResult({
        ...videoResult,
        shots: [{ ...firstShot, startSeconds: -0.1 }],
      }),
    ).toBe(false);
    expect(
      isAnalysisResult({
        ...videoResult,
        shots: [{ ...firstShot, startSeconds: firstShot.endSeconds }],
      }),
    ).toBe(false);
    expect(
      isAnalysisResult({
        ...videoResult,
        shots: [{ ...firstShot, endSeconds: videoResult.durationSeconds + 0.1 }],
      }),
    ).toBe(false);
    expect(
      isAnalysisResult({
        ...videoResult,
        shots: [{ ...firstShot, endSeconds: Number.POSITIVE_INFINITY }],
      }),
    ).toBe(false);
    expect(isAnalysisResult({ ...videoResult, durationSeconds: Number.NaN })).toBe(false);
  });

  it('requires a complete, ordered and continuous shot timeline', () => {
    const [firstShot, secondShot] = videoResult.shots;

    expect(isAnalysisResult({ ...videoResult, shots: [] })).toBe(false);
    expect(
      isAnalysisResult({
        ...videoResult,
        shots: [{ ...firstShot, endSeconds: 5 }, secondShot],
      }),
    ).toBe(false);
    expect(
      isAnalysisResult({
        ...videoResult,
        shots: [{ ...firstShot, endSeconds: 5.5 }, secondShot],
      }),
    ).toBe(false);
    expect(isAnalysisResult({ ...videoResult, shots: [secondShot, firstShot] })).toBe(false);
    expect(
      isAnalysisResult({
        ...videoResult,
        shots: [firstShot, { ...secondShot, endSeconds: 12.4 }],
      }),
    ).toBe(false);
    expect(
      isAnalysisResult({
        ...videoResult,
        shots: [firstShot, { ...secondShot, endSeconds: 12.4995 }],
      }),
    ).toBe(true);
  });

  it('requires a complete, ordered and continuous rhythm timeline', () => {
    const [firstPoint, secondPoint] = videoResult.editReview.rhythm;
    const withRhythm = (rhythm: VideoAnalysisResult['editReview']['rhythm']) => ({
      ...videoResult,
      editReview: { ...videoResult.editReview, rhythm },
    });

    expect(isAnalysisResult(withRhythm([]))).toBe(false);
    expect(isAnalysisResult(withRhythm([{ ...firstPoint, endSeconds: 5 }, secondPoint]))).toBe(
      false,
    );
    expect(isAnalysisResult(withRhythm([{ ...firstPoint, endSeconds: 5.5 }, secondPoint]))).toBe(
      false,
    );
    expect(isAnalysisResult(withRhythm([secondPoint, firstPoint]))).toBe(false);
    expect(isAnalysisResult(withRhythm([firstPoint, { ...secondPoint, endSeconds: 12.4 }]))).toBe(
      false,
    );
    expect(
      isAnalysisResult(withRhythm([firstPoint, { ...secondPoint, endSeconds: 12.4995 }])),
    ).toBe(true);
  });

  it('validates edit review ranges, intensity and recommendation fields', () => {
    const [rhythmPoint] = videoResult.editReview.rhythm;
    const [recommendation] = videoResult.editReview.recommendations;

    expect(
      isAnalysisResult({
        ...videoResult,
        editReview: {
          ...videoResult.editReview,
          rhythm: [{ ...rhythmPoint, intensity: 2.5 }],
        },
      }),
    ).toBe(false);
    expect(
      isAnalysisResult({
        ...videoResult,
        editReview: {
          ...videoResult.editReview,
          rhythm: [{ ...rhythmPoint, startSeconds: -0.1 }],
        },
      }),
    ).toBe(false);
    expect(
      isAnalysisResult({
        ...videoResult,
        editReview: { ...videoResult.editReview, recommendations: [] },
      }),
    ).toBe(true);
    expect(
      isAnalysisResult({
        ...videoResult,
        editReview: {
          ...videoResult.editReview,
          recommendations: [{ ...recommendation, endSeconds: videoResult.durationSeconds + 0.1 }],
        },
      }),
    ).toBe(false);
    expect(
      isAnalysisResult({
        ...videoResult,
        editReview: {
          ...videoResult.editReview,
          recommendations: [{ ...recommendation, category: 'performance' }],
        },
      }),
    ).toBe(false);
    expect(
      isAnalysisResult({
        ...videoResult,
        editReview: {
          ...videoResult.editReview,
          recommendations: [{ ...recommendation, priority: 'urgent' }],
        },
      }),
    ).toBe(false);
  });

  it('rejects invalid video enums and nested sound fields', () => {
    const [firstShot] = videoResult.shots;

    expect(
      isAnalysisResult({
        ...videoResult,
        seedAudio: { ...videoResult.seedAudio, contentMode: 'instrumental' },
      }),
    ).toBe(false);
    expect(
      isAnalysisResult({
        ...videoResult,
        seedAudio: { ...videoResult.seedAudio, recommendedMode: 'single_file' },
      }),
    ).toBe(false);
    expect(
      isAnalysisResult({
        ...videoResult,
        shots: [
          {
            ...firstShot,
            soundCue: { ...firstShot.soundCue, route: 'automatic' },
          },
        ],
      }),
    ).toBe(false);
    expect(
      isAnalysisResult({
        ...videoResult,
        shots: [
          {
            ...firstShot,
            soundCue: { ...firstShot.soundCue, priority: 'urgent' },
          },
        ],
      }),
    ).toBe(false);
    expect(
      isAnalysisResult({
        ...videoResult,
        shots: [
          {
            ...firstShot,
            soundCue: { ...firstShot.soundCue, diegeticStatus: 'unknown' },
          },
        ],
      }),
    ).toBe(false);
  });

  it('validates optional video quality metadata and its bounded repair state', () => {
    const passQuality = {
      status: 'pass',
      detailLevel: 'full',
      score: 84,
      passThreshold: 84,
      issues: [],
      weakestShotIndexes: [],
      automaticRepairs: 0,
      recoveryReasons: [],
      model: 'gemini-test',
    };
    expect(isAnalysisResult({ ...videoResult, quality: passQuality }, 'video')).toBe(true);
    expect(isAnalysisResult(videoResult, 'video')).toBe(true);
    expect(
      isAnalysisResult({
        ...videoResult,
        quality: { ...passQuality, status: 'limited', score: 100 },
      }),
    ).toBe(false);
    expect(
      isAnalysisResult({
        ...videoResult,
        quality: {
          ...passQuality,
          status: 'enriched',
          automaticRepairs: 0,
          recoveryReasons: ['low_detail'],
        },
      }),
    ).toBe(false);
    expect(
      isAnalysisResult({
        ...videoResult,
        quality: { ...passQuality, score: 101 },
      }),
    ).toBe(false);
    expect(
      isAnalysisResult({
        ...videoResult,
        quality: { ...passQuality, weakestShotIndexes: [0, 0] },
      }),
    ).toBe(false);
    expect(
      isAnalysisResult({
        ...videoResult,
        quality: { ...passQuality, recoveryReasons: ['low_detail', 'repair_failed'] },
      }),
    ).toBe(false);
    expect(
      isAnalysisResult({
        ...videoResult,
        quality: { ...passQuality, detailLevel: 'compact' },
      }),
    ).toBe(false);
    expect(
      isAnalysisResult({
        ...videoResult,
        quality: { ...passQuality, recoveryReasons: ['max_tokens'] },
      }),
    ).toBe(false);
    expect(
      isAnalysisResult({
        ...videoResult,
        quality: {
          ...passQuality,
          detailLevel: 'compact',
          recoveryReasons: ['max_tokens', 'invalid_response'],
        },
      }),
    ).toBe(false);
  });

  it('rejects SeedAudio prompts that exceed the limit or contain authoring headings', () => {
    expect(
      isAnalysisResult({
        ...videoResult,
        seedAudio: { ...videoResult.seedAudio, textPrompt: 'x'.repeat(2049) },
      }),
    ).toBe(false);

    for (const heading of [
      'Mode: assembled mix',
      'Speaker / VO: none',
      'Timeline: 0-12 seconds',
      'Music: minimal pulse',
      'SFX / Ambience: rain',
      'Mix: keep dialogue clear',
      'Avoid: thunder',
    ]) {
      expect(
        isAnalysisResult({
          ...videoResult,
          seedAudio: { ...videoResult.seedAudio, textPrompt: heading },
        }),
      ).toBe(false);
    }
  });
});

describe('analysis history', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('stores, loads, deletes and clears validated reports', () => {
    const first = cacheAnalysisHistoryItem({
      fileName: 'score.wav',
      fileSize: 1024,
      analysisMode: 'music',
      processingSummary: 'No transcode',
      analysis: musicResult,
    });
    expect(first).toHaveLength(1);
    expect(first[0].isFavorite).toBe(false);
    expect(loadAnalysisHistory()[0].fileName).toBe('score.wav');
    expect(deleteAnalysisHistoryItem(first[0].id)).toEqual([]);

    cacheAnalysisHistoryItem({
      fileName: 'impact.wav',
      fileSize: 2048,
      analysisMode: 'sfx',
      processingSummary: 'No transcode',
      analysis: sfxResult,
    });
    expect(clearAnalysisHistory()).toEqual([]);
    expect(loadAnalysisHistory()).toEqual([]);
  });

  it('drops malformed entries and removes invalid JSON', () => {
    const invalidObject = JSON.stringify({ id: 'invalid' });
    window.localStorage.setItem('soniclens.analysisHistory', invalidObject);
    expect(loadAnalysisHistory()).toEqual([]);
    expect(window.localStorage.getItem('soniclens.analysisHistory')).toBe(invalidObject);

    const invalidArray = JSON.stringify([{ id: 'invalid' }]);
    window.localStorage.setItem('soniclens.analysisHistory', invalidArray);
    expect(loadAnalysisHistory()).toEqual([]);
    expect(window.localStorage.getItem('soniclens.analysisHistory')).toBe(invalidArray);

    window.localStorage.setItem('soniclens.analysisHistory', '{broken');
    expect(loadAnalysisHistory()).toEqual([]);
    expect(window.localStorage.getItem('soniclens.analysisHistory')).toBeNull();
  });

  it('migrates legacy reports to an explicit unfavorited state', () => {
    const [storedItem] = cacheAnalysisHistoryItem({
      fileName: 'legacy.wav',
      fileSize: 1024,
      analysisMode: 'music',
      processingSummary: 'No transcode',
      analysis: musicResult,
    });
    const legacyItem: Record<string, unknown> = { ...storedItem };
    delete legacyItem.isFavorite;
    window.localStorage.setItem('soniclens.analysisHistory', JSON.stringify([legacyItem]));

    expect(loadAnalysisHistory()[0].isFavorite).toBe(false);
    expect(window.localStorage.getItem('soniclens.analysisHistory')).toContain(
      '"isFavorite":false',
    );
  });

  it('returns an in-memory migration when persistence exceeds the storage quota', () => {
    const [storedItem] = cacheAnalysisHistoryItem({
      fileName: 'quota-video.mp4',
      fileSize: 4096,
      analysisMode: 'video',
      processingSummary: 'Legacy video analysis',
      analysis: videoResult,
    });
    const legacyAnalysis: Record<string, unknown> = { ...videoResult };
    delete legacyAnalysis.editReview;
    delete legacyAnalysis.segmentation;
    const storedValue = JSON.stringify([{ ...storedItem, analysis: legacyAnalysis }]);
    window.localStorage.setItem('soniclens.analysisHistory', storedValue);
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage quota exceeded.', 'QuotaExceededError');
    });

    try {
      const [migratedItem] = loadAnalysisHistory();
      expect(migratedItem.analysis.type).toBe('video');
      if (migratedItem.analysis.type !== 'video') throw new Error('Expected a video report.');
      expect(migratedItem.analysis.editReview.recommendations).toHaveLength(1);
      expect(migratedItem.analysis.segmentation.mode).toBe('sequence');
      expect(window.localStorage.getItem('soniclens.analysisHistory')).toBe(storedValue);
    } finally {
      setItemSpy.mockRestore();
    }
  });

  it('reports a quota failure when a new analysis cannot be cached', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage quota exceeded.', 'QuotaExceededError');
    });

    try {
      expect(() =>
        cacheAnalysisHistoryItem({
          fileName: 'quota-video.mp4',
          fileSize: 4096,
          analysisMode: 'video',
          processingSummary: 'Video analysis',
          analysis: videoResult,
        }),
      ).toThrow('Storage quota exceeded.');
    } finally {
      setItemSpy.mockRestore();
    }
  });

  it('migrates legacy video reports missing edit review and preserves SeedAudio', () => {
    const [storedItem] = cacheAnalysisHistoryItem({
      fileName: 'legacy-video.mp4',
      fileSize: 4096,
      analysisMode: 'video',
      processingSummary: 'Legacy video analysis',
      analysis: videoResult,
    });
    const legacyAnalysis: Record<string, unknown> = { ...videoResult };
    delete legacyAnalysis.editReview;
    delete legacyAnalysis.segmentation;
    window.localStorage.setItem(
      'soniclens.analysisHistory',
      JSON.stringify([{ ...storedItem, analysis: legacyAnalysis }]),
    );

    const [migratedItem] = loadAnalysisHistory();
    expect(migratedItem.analysis.type).toBe('video');
    if (migratedItem.analysis.type !== 'video') throw new Error('Expected a video report.');
    expect(migratedItem.analysis.editReview.strengths).toHaveLength(2);
    expect(migratedItem.analysis.editReview.topIssues).toHaveLength(2);
    expect(migratedItem.analysis.editReview.rhythm).toHaveLength(videoResult.shots.length);
    expect(migratedItem.analysis.editReview.recommendations).toHaveLength(1);
    expect(migratedItem.analysis.segmentation).toEqual({
      mode: 'sequence',
      note: '旧报告未记录逐镜切点可信度；原有时间单元与相关“镜头”描述均按分析段落理解。',
    });
    expect(migratedItem.analysis.seedAudio).toEqual(videoResult.seedAudio);
    expect(isAnalysisResult(migratedItem.analysis, 'video')).toBe(true);
    expect(window.localStorage.getItem('soniclens.analysisHistory')).toContain('editReview');
    expect(migratedItem.analysis.editReview.strengths[0]).toContain('分析段落');
    expect(migratedItem.analysis.editReview.topIssues[0]).toContain('最长段落');
    expect(migratedItem.analysis.editReview.rhythmSummary).toContain('平均段长');
    expect(migratedItem.analysis.editReview.rhythmSummary).not.toContain('平均镜长');

    const alternateLegacyAnalysis: Record<string, unknown> = {
      ...videoResult,
      narrativeArc: '',
      visualStyle: [],
      shots: [
        { ...videoResult.shots[0], endSeconds: 7, onScreenText: '品牌标题' },
        { ...videoResult.shots[1], startSeconds: 7 },
      ],
    };
    delete alternateLegacyAnalysis.editReview;
    delete alternateLegacyAnalysis.segmentation;
    window.localStorage.setItem(
      'soniclens.analysisHistory',
      JSON.stringify([{ ...storedItem, analysis: alternateLegacyAnalysis }]),
    );
    const [alternateMigratedItem] = loadAnalysisHistory();
    expect(alternateMigratedItem.analysis.type).toBe('video');
    if (alternateMigratedItem.analysis.type !== 'video') {
      throw new Error('Expected a video report.');
    }
    expect(alternateMigratedItem.analysis.editReview.recommendations[0].startSeconds).toBe(0);
    expect(alternateMigratedItem.analysis.editReview.visualFinish.colorAndExposure).toContain(
      '未分项评价',
    );
    expect(alternateMigratedItem.analysis.editReview.visualFinish.typographyAndBranding).toContain(
      '品牌标题',
    );
  });

  it('migrates legacy video reports with edit review but without segmentation', () => {
    const [storedItem] = cacheAnalysisHistoryItem({
      fileName: 'legacy-reviewed-video.mp4',
      fileSize: 4096,
      analysisMode: 'video',
      processingSummary: 'Legacy reviewed video analysis',
      analysis: videoResult,
    });
    const legacyAnalysis: Record<string, unknown> = { ...videoResult };
    delete legacyAnalysis.segmentation;
    window.localStorage.setItem(
      'soniclens.analysisHistory',
      JSON.stringify([{ ...storedItem, analysis: legacyAnalysis }]),
    );

    const [migratedItem] = loadAnalysisHistory();
    expect(migratedItem.analysis.type).toBe('video');
    if (migratedItem.analysis.type !== 'video') throw new Error('Expected a video report.');
    expect(migratedItem.analysis.segmentation.mode).toBe('sequence');
    expect(migratedItem.analysis.editReview).toEqual(videoResult.editReview);
    expect(migratedItem.analysis.seedAudio).toEqual(videoResult.seedAudio);
    expect(window.localStorage.getItem('soniclens.analysisHistory')).toContain(
      '旧报告未记录逐镜切点可信度',
    );
  });

  it('upgrades the previous legacy sequence marker and synthesized shot wording', () => {
    const [storedItem] = cacheAnalysisHistoryItem({
      fileName: 'previous-legacy-video.mp4',
      fileSize: 4096,
      analysisMode: 'video',
      processingSummary: 'Previous legacy migration',
      analysis: videoResult,
    });
    const previouslyMigratedAnalysis: VideoAnalysisResult = {
      ...videoResult,
      segmentation: {
        mode: 'sequence',
        note: '旧报告未记录逐镜切点可信度，已按分析段落展示。',
      },
      editReview: {
        ...videoResult.editReview,
        strengths: ['已建立 2 个分镜，时间线覆盖 12.5 秒。'],
        rhythmSummary: '全片 2 个镜头，平均镜长 6.3 秒。',
      },
    };
    window.localStorage.setItem(
      'soniclens.analysisHistory',
      JSON.stringify([{ ...storedItem, analysis: previouslyMigratedAnalysis }]),
    );

    const [upgradedItem] = loadAnalysisHistory();
    expect(upgradedItem.analysis.type).toBe('video');
    if (upgradedItem.analysis.type !== 'video') throw new Error('Expected a video report.');
    expect(upgradedItem.analysis.segmentation.note).toContain('相关“镜头”描述均按分析段落理解');
    expect(upgradedItem.analysis.editReview.strengths[0]).toContain('分析段落');
    expect(upgradedItem.analysis.editReview.rhythmSummary).toContain('平均段长');
  });

  it('does not migrate malformed video reports or overwrite an invalid edit review', () => {
    const [storedItem] = cacheAnalysisHistoryItem({
      fileName: 'invalid-video.mp4',
      fileSize: 4096,
      analysisMode: 'video',
      processingSummary: 'Invalid legacy video',
      analysis: videoResult,
    });
    const invalidAnalysis: Record<string, unknown> = { ...videoResult, editReview: null };
    delete invalidAnalysis.segmentation;
    const invalidExistingReview = {
      ...storedItem,
      analysis: invalidAnalysis,
    };
    window.localStorage.setItem(
      'soniclens.analysisHistory',
      JSON.stringify([invalidExistingReview]),
    );
    expect(loadAnalysisHistory()).toEqual([]);

    const legacyWithBrokenTimeline: Record<string, unknown> = {
      ...videoResult,
      shots: [videoResult.shots[1]],
    };
    delete legacyWithBrokenTimeline.editReview;
    delete legacyWithBrokenTimeline.segmentation;
    window.localStorage.setItem(
      'soniclens.analysisHistory',
      JSON.stringify([{ ...storedItem, analysis: legacyWithBrokenTimeline }]),
    );
    expect(loadAnalysisHistory()).toEqual([]);
  });

  it('does not persist a partial migration when another stored report is invalid', () => {
    const [storedItem] = cacheAnalysisHistoryItem({
      fileName: 'mixed-video.mp4',
      fileSize: 4096,
      analysisMode: 'video',
      processingSummary: 'Legacy video analysis',
      analysis: videoResult,
    });
    const migratableAnalysis: Record<string, unknown> = { ...videoResult };
    delete migratableAnalysis.editReview;
    delete migratableAnalysis.segmentation;
    const invalidAnalysis: Record<string, unknown> = {
      ...migratableAnalysis,
      shots: [videoResult.shots[1]],
    };
    const storedValue = JSON.stringify([
      { ...storedItem, analysis: migratableAnalysis },
      { ...storedItem, id: 'invalid-video', analysis: invalidAnalysis },
    ]);
    window.localStorage.setItem('soniclens.analysisHistory', storedValue);

    const history = loadAnalysisHistory();
    expect(history).toHaveLength(1);
    expect(history[0].analysis.type).toBe('video');
    if (history[0].analysis.type !== 'video') throw new Error('Expected a video report.');
    expect(history[0].analysis.editReview.recommendations).toHaveLength(1);
    expect(window.localStorage.getItem('soniclens.analysisHistory')).toBe(storedValue);
  });

  it('toggles favorites and persists the updated report', () => {
    const [storedItem] = cacheAnalysisHistoryItem({
      fileName: 'favorite.wav',
      fileSize: 1024,
      analysisMode: 'music',
      processingSummary: 'No transcode',
      analysis: musicResult,
    });

    expect(toggleAnalysisHistoryFavorite(storedItem.id)[0].isFavorite).toBe(true);
    expect(loadAnalysisHistory()[0].isFavorite).toBe(true);
    expect(toggleAnalysisHistoryFavorite(storedItem.id)[0].isFavorite).toBe(false);

    const storedValue = window.localStorage.getItem('soniclens.analysisHistory');
    expect(toggleAnalysisHistoryFavorite('missing')).toEqual(loadAnalysisHistory());
    expect(window.localStorage.getItem('soniclens.analysisHistory')).toBe(storedValue);
  });

  it('updates the selected report analysis without changing its history metadata', () => {
    const [storedItem] = cacheAnalysisHistoryItem({
      fileName: 'review.mp4',
      fileSize: 4096,
      analysisMode: 'video',
      processingSummary: 'Video review',
      analysis: videoResult,
    });
    const updatedAnalysis: VideoAnalysisResult = {
      ...videoResult,
      title: '雨夜归家 · 修订版',
    };

    const [updatedItem] = updateAnalysisHistoryItem(storedItem.id, updatedAnalysis);
    expect(updatedItem.id).toBe(storedItem.id);
    expect(updatedItem.createdAt).toBe(storedItem.createdAt);
    expect(updatedItem.analysis).toEqual(updatedAnalysis);
    expect(loadAnalysisHistory()[0].analysis).toEqual(updatedAnalysis);
    expect(() => updateAnalysisHistoryItem(storedItem.id, musicResult)).toThrow(
      '更新后的分析结果与历史报告类型不匹配',
    );

    const storedValue = window.localStorage.getItem('soniclens.analysisHistory');
    expect(updateAnalysisHistoryItem('missing', updatedAnalysis)).toEqual(loadAnalysisHistory());
    expect(window.localStorage.getItem('soniclens.analysisHistory')).toBe(storedValue);
  });

  it('keeps only the latest configured number of reports', () => {
    for (let index = 0; index <= ANALYSIS_HISTORY_LIMIT; index += 1) {
      cacheAnalysisHistoryItem({
        fileName: `${index}.wav`,
        fileSize: index,
        analysisMode: 'music',
        processingSummary: 'No transcode',
        analysis: musicResult,
      });
    }
    const history = loadAnalysisHistory();
    expect(history).toHaveLength(ANALYSIS_HISTORY_LIMIT);
    expect(history[0].fileName).toBe(`${ANALYSIS_HISTORY_LIMIT}.wav`);
  });
});

describe('parseTimestampToSeconds', () => {
  it('parses points, ranges and hour-long timecodes', () => {
    expect(parseTimestampToSeconds('00:24')).toBe(24);
    expect(parseTimestampToSeconds('12:08 - 13:10')).toBe(728);
    expect(parseTimestampToSeconds('1:05:23')).toBe(3923);
  });

  it('rejects malformed timecodes', () => {
    expect(parseTimestampToSeconds('1:72')).toBe(0);
    expect(parseTimestampToSeconds('1:63:10')).toBe(0);
    expect(parseTimestampToSeconds('start')).toBe(0);
  });
});

describe('timeline helpers', () => {
  it('parses segment ranges and formats their duration', () => {
    expect(parseTimestampRange('01:00 - 02:17')).toEqual({ start: 60, end: 137 });
    expect(formatTimestamp(206)).toBe('3:26');
  });
});

describe('normalizeAudioRange', () => {
  it('keeps valid ranges and clamps their end to the audio duration', () => {
    expect(normalizeAudioRange(2, 5, 10)).toEqual({ start: 2, end: 5, duration: 3 });
    expect(normalizeAudioRange(4, 14, 10)).toEqual({ start: 4, end: 10, duration: 6 });
    expect(normalizeAudioRange(9, 10, 10)).toEqual({ start: 9, end: 10, duration: 1 });
  });

  it('rejects non-finite values and invalid audio boundaries', () => {
    expect(() => normalizeAudioRange(Number.NaN, 3, 10)).toThrow('音频选区时间无效');
    expect(() => normalizeAudioRange(0, Number.POSITIVE_INFINITY, 10)).toThrow('音频选区时间无效');
    expect(() => normalizeAudioRange(0, 3, 0)).toThrow('音频时长必须大于 0');
    expect(() => normalizeAudioRange(-1, 3, 10)).toThrow('音频选区起点不能小于 0');
    expect(() => normalizeAudioRange(10, 12, 10)).toThrow('音频选区起点必须早于音频结束时间');
  });

  it('rejects ranges shorter than one second', () => {
    expect(() => normalizeAudioRange(2, 2, 10)).toThrow('音频选区至少需要 1 秒');
    expect(() => normalizeAudioRange(2, 2.9, 10)).toThrow('音频选区至少需要 1 秒');
    expect(() => normalizeAudioRange(9.5, 20, 10)).toThrow('音频选区至少需要 1 秒');
  });
});

import { describe, expect, it } from 'vitest';
import {
  assessVideoAnalysisQuality,
  getRequiredVideoRecommendationCount,
  selectHigherQualityAnalysis,
} from '../services/videoAnalysisQuality';
import type { VideoAnalysisResult, VideoShot } from '../types';

const makeShot = (index: number): VideoShot => ({
  startSeconds: index * 4,
  endSeconds: (index + 1) * 4,
  shotType: '中景',
  cameraAngle: '平视',
  cameraMovement: '缓慢横移',
  transition: '硬切',
  visualDescription: `模特从画面${index === 0 ? '左侧' : '右侧'}走入明亮厨房，前景玻璃杯形成层次。`,
  visibleAction: '模特拿起玻璃杯并转身看向窗外。',
  onScreenText: '',
  dialogue: '',
  existingSound: '近处杯底接触木桌，背景保留轻微城市环境声。',
  soundCue: {
    cue: '清脆但克制的玻璃触桌声。',
    priority: 'must',
    diegeticStatus: 'diegetic',
    function: '对齐拿杯动作并建立这一镜的节奏落点。',
    character: '近距离、干净，带有短促明亮的高频瞬态。',
    route: 'timed_clip',
    mixRisk: '玻璃高频可能与音乐铃音重叠，需要错开瞬态。',
  },
});

const makeAnalysis = (): VideoAnalysisResult => ({
  type: 'video',
  title: '清晨厨房',
  summary: '模特进入清晨厨房取水，动作从克制逐渐转向轻松，最终停在窗前。',
  durationSeconds: 8,
  narrativeArc: '从安静进入空间，到拿杯停驻，完成由行动向情绪放松的转折。',
  visualStyle: ['自然光', '生活方式', '低饱和'],
  keywords: ['清晨', '厨房', '饮水'],
  segmentation: { mode: 'shot', note: '按两个明确硬切点拆分。' },
  shots: [makeShot(0), makeShot(1)],
  editReview: {
    verdict: {
      status: 'minor_revision',
      rationale: '整体结构已经成立，但第二镜节奏和高光细节仍需进行局部调整。',
    },
    strengths: ['自然光方向统一，人物运动方向在切换后仍然连续。'],
    topIssues: ['第二镜停驻时间略长，产品出现后的信息增量有限。'],
    rhythmSummary: '前四秒建立人物与空间，后四秒用拿杯瞬态形成清晰节奏落点。',
    rhythm: [],
    visualFinish: {
      compositionAndContinuity: '人物始终位于运动方向前侧，两个镜头的视线关系连续。',
      colorAndExposure: '窗外高光略亮，可压低半档以保留玻璃杯轮廓。',
      vfxAndMotion: '无需额外特效，只需稳定横移末端的轻微抖动。',
      typographyAndBranding: '右侧窗面留有稳定负空间，可承载克制的品牌尾板。',
    },
    recommendations: [
      {
        decision: 'trim',
        startSeconds: 4,
        endSeconds: 7,
        category: 'pacing',
        priority: 'medium',
        evidence: '拿杯完成后人物静止约三秒，画面没有新增动作或信息。',
        action: '将停驻段缩短约一秒，并保留视线转向窗外的完整动作。',
        expectedImpact: '维持舒缓气质，同时让产品动作和结尾落点更紧凑。',
      },
      {
        decision: 'polish',
        startSeconds: 0,
        endSeconds: 4,
        category: 'color',
        priority: 'low',
        evidence: '窗外高光贴近玻璃杯轮廓，杯沿在最亮区域出现局部细节损失。',
        action: '只对窗面高光做局部压暗，并保留人物面部与木桌的原有中间调。',
        expectedImpact: '恢复玻璃材质层次，同时不破坏清晨自然光的通透感。',
      },
    ],
  },
  risks: [],
});

describe('assessVideoAnalysisQuality', () => {
  it('passes a concrete, evidence-led analysis', () => {
    const assessment = assessVideoAnalysisQuality(makeAnalysis());

    expect(assessment.status).toBe('pass');
    expect(assessment.score).toBeGreaterThanOrEqual(90);
    expect(assessment.issues).toEqual([]);
    expect(assessment.weakestShotIndexes).toEqual([]);
  });

  it('marks screenshot-style minimal output as limited', () => {
    const analysis = makeAnalysis();
    analysis.summary = '双人广告';
    analysis.narrativeArc = '展示产品';
    analysis.editReview.rhythmSummary = '正常';
    analysis.editReview.strengths = ['好看'];
    analysis.editReview.topIssues = ['无'];
    analysis.editReview.visualFinish = {
      compositionAndContinuity: '正常',
      colorAndExposure: '还行',
      vfxAndMotion: '无',
      typographyAndBranding: '简单',
    };
    analysis.shots = analysis.shots.map((shot) => ({
      ...shot,
      visualDescription: '双人站在白色背景前微笑。',
      visibleAction: '微笑',
      existingSound: '无',
      soundCue: {
        ...shot.soundCue,
        function: '结束',
        character: '轻',
        mixRisk: '低',
      },
    }));
    analysis.editReview.recommendations = [
      {
        ...analysis.editReview.recommendations[0],
        evidence: '一般',
        action: '优化',
        expectedImpact: '更好',
      },
    ];

    const assessment = assessVideoAnalysisQuality(analysis);

    expect(assessment.status).toBe('limited');
    expect(assessment.score).toBeLessThan(50);
    expect(assessment.weakestShotIndexes).toEqual([0, 1]);
    expect(assessment.issues.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        'thin_summary',
        'thin_visual_finish',
        'thin_visual_description',
        'thin_visible_action',
        'thin_existing_sound',
        'thin_sound_function',
        'thin_sound_character',
        'vague_mix_risk',
        'thin_recommendation_evidence',
        'thin_recommendation_action',
        'thin_recommendation_impact',
      ]),
    );
  });

  it('rejects realistic short phrases that only fill the schema', () => {
    const analysis = makeAnalysis();
    analysis.shots = analysis.shots.map((shot) => ({
      ...shot,
      visualDescription: '女生闻衣服并伸懒腰，男生在旁边微笑。',
      visibleAction: '女生闻衣服、伸懒腰',
      existingSound: '轻微环境声和衣料声',
      soundCue: {
        ...shot.soundCue,
        function: '强调产品使用',
        character: '轻柔、自然、生活化',
        mixRisk: '低',
      },
    }));

    const assessment = assessVideoAnalysisQuality(analysis);

    expect(assessment.status).toBe('limited');
    expect(assessment.issues.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        'thin_visible_action',
        'thin_existing_sound',
        'thin_sound_function',
        'thin_sound_character',
        'vague_mix_risk',
      ]),
    );
  });

  it('allows dialogue and on-screen text to remain empty', () => {
    const analysis = makeAnalysis();
    analysis.shots.forEach((shot) => {
      shot.dialogue = '';
      shot.onScreenText = '';
    });

    expect(assessVideoAnalysisQuality(analysis)).toMatchObject({
      score: 100,
      status: 'pass',
      issues: [],
    });
  });

  it('detects highly repeated shot descriptions and reports only shot weaknesses', () => {
    const analysis = makeAnalysis();
    analysis.shots = Array.from({ length: 4 }, (_, index) => ({
      ...makeShot(index),
      visualDescription: '模特站在白色背景中央，面向镜头展示手中的透明产品瓶。',
    }));

    const assessment = assessVideoAnalysisQuality(analysis);

    expect(assessment.issues).toContainEqual(
      expect.objectContaining({
        code: 'repetitive_shot_description',
        shotIndexes: [0, 1, 2, 3],
      }),
    );
    expect(assessment.weakestShotIndexes).toEqual([0, 1, 2, 3]);
  });

  it('does not let many detailed shots dilute a thin global diagnosis', () => {
    const analysis = makeAnalysis();
    analysis.durationSeconds = 56;
    analysis.shots = Array.from({ length: 14 }, (_, index) => makeShot(index));
    analysis.summary = '产品广告';
    analysis.narrativeArc = '展示产品';
    analysis.editReview.strengths = ['正常'];
    analysis.editReview.topIssues = ['无'];
    analysis.editReview.rhythmSummary = '节奏正常';
    analysis.editReview.visualFinish = {
      compositionAndContinuity: '正常',
      colorAndExposure: '正常',
      vfxAndMotion: '无',
      typographyAndBranding: '简单',
    };

    const assessment = assessVideoAnalysisQuality(analysis);

    expect(assessment.status).toBe('limited');
    expect(assessment.score).toBeLessThan(78);
    expect(assessment.issues.map(({ code }) => code)).toEqual(
      expect.arrayContaining(['thin_summary', 'thin_narrative_arc', 'thin_visual_finish']),
    );
  });

  it('rejects long generic filler instead of treating length as evidence', () => {
    const analysis = makeAnalysis();
    analysis.durationSeconds = 56;
    analysis.shots = Array.from({ length: 14 }, (_, index) => ({
      ...makeShot(index),
      visualDescription: '整体画面自然高级，进一步增强广告氛围并强化产品展示效果。',
      visibleAction: '进一步强化产品展示效果并提升整体感染力。',
      existingSound: '整体声音自然清晰，并带有高级广告质感。',
      soundCue: {
        ...makeShot(index).soundCue,
        function: '增强画面氛围并进一步强化产品展示效果。',
        character: '整体轻柔自然清晰，并带有高级广告质感。',
        mixRisk: '整体混音风险较低，不需要进行特别调整。',
      },
    }));

    const assessment = assessVideoAnalysisQuality(analysis);

    expect(assessment.status).toBe('limited');
    expect(assessment.issues.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        'thin_visual_description',
        'thin_visible_action',
        'thin_existing_sound',
        'thin_sound_function',
        'thin_sound_character',
        'vague_mix_risk',
        'repetitive_shot_description',
      ]),
    );
  });

  it('rejects paraphrased filler that reaches the length threshold without concrete entities', () => {
    const analysis = makeAnalysis();
    analysis.shots = analysis.shots.map((shot) => ({
      ...shot,
      visibleAction: '人物继续进行产品展示，并保持面向镜头的状态。',
      soundCue: {
        ...shot.soundCue,
        function: '用于承接当前镜头并保持叙事节奏的连续性。',
        character: '声音保持柔和清晰并带有一定空间层次和变化。',
        mixRisk: '声音可能同时出现，需要避免影响整体效果。',
      },
    }));

    const issueCodes = assessVideoAnalysisQuality(analysis).issues.map(({ code }) => code);

    expect(issueCodes).toEqual(
      expect.arrayContaining([
        'thin_visible_action',
        'thin_sound_function',
        'thin_sound_character',
        'vague_mix_risk',
      ]),
    );
  });

  it('accepts concise descriptions when they contain the required evidence dimensions', () => {
    const analysis = makeAnalysis();
    analysis.shots = analysis.shots.map((shot) => ({
      ...shot,
      visualDescription: '产品瓶在白色前景中央，暖光勾勒玻璃边缘。',
      existingSound: '近处门锁声，远处雨声。',
      soundCue: {
        ...shot.soundCue,
        character: '近距金属脆响，短促衰减，无明显混响。',
      },
    }));

    const issueCodes = assessVideoAnalysisQuality(analysis).issues.map(({ code }) => code);

    expect(issueCodes).not.toContain('thin_visual_description');
    expect(issueCodes).not.toContain('thin_existing_sound');
    expect(issueCodes).not.toContain('thin_sound_character');
  });

  it('does not reject concrete evidence merely because it contains natural or low-risk wording', () => {
    const analysis = makeAnalysis();
    analysis.shots = analysis.shots.map((shot) => ({
      ...shot,
      soundCue: {
        ...shot.soundCue,
        mixRisk: '对白位于中频，环境高频与其错开，因此遮蔽风险较低。',
      },
    }));
    analysis.editReview.recommendations[0].action =
      '将画面从冷色室外自然过渡到暖色门廊，并保留人物进入的完整动作。';

    const issueCodes = assessVideoAnalysisQuality(analysis).issues.map(({ code }) => code);

    expect(issueCodes).not.toContain('vague_mix_risk');
    expect(issueCodes).not.toContain('thin_recommendation_action');
  });

  it('treats evidence keywords as hints rather than a closed vocabulary gate', () => {
    const analysis = makeAnalysis();
    analysis.shots = analysis.shots.map((shot) => ({
      ...shot,
      visualDescription: '雄鹰掠过峡谷后收拢翅膀降落岩壁。',
      visibleAction: '雄鹰掠过峡谷后收拢翅膀降落岩壁。',
      existingSound: '鹰鸣掠过山谷后留下悠长回声。',
      soundCue: {
        ...shot.soundCue,
        character: '羽翼扑动柔软蓬松，快速起振后在山谷内回荡。',
        mixRisk: '鹰鸣可能与风啸同时出现而互相掩盖，需要错开峰值。',
      },
    }));

    const issueCodes = assessVideoAnalysisQuality(analysis).issues.map(({ code }) => code);

    expect(issueCodes).not.toContain('thin_visual_description');
    expect(issueCodes).not.toContain('thin_visible_action');
    expect(issueCodes).not.toContain('thin_existing_sound');
    expect(issueCodes).not.toContain('thin_sound_character');
    expect(issueCodes).not.toContain('vague_mix_risk');
  });

  it('requires at least two concrete recommendations to match the generation contract', () => {
    const analysis = makeAnalysis();
    analysis.editReview.verdict = {
      status: 'major_revision',
      rationale: '当前结构存在明显节奏与视觉问题，需要完成关键修改后再进入交付。',
    };
    analysis.editReview.recommendations = analysis.editReview.recommendations.slice(0, 1);

    const assessment = assessVideoAnalysisQuality(analysis);

    expect(assessment.status).toBe('limited');
    expect(assessment.issues.map(({ code }) => code)).toContain('insufficient_recommendations');
  });

  it('requires a concrete editorial verdict', () => {
    const missing = makeAnalysis();
    delete missing.editReview.verdict;
    const thin = makeAnalysis();
    thin.editReview.verdict = { status: 'minor_revision', rationale: '需要微调' };

    expect(assessVideoAnalysisQuality(missing)).toMatchObject({ status: 'limited' });
    expect(assessVideoAnalysisQuality(missing).issues.map(({ code }) => code)).toContain(
      'missing_editorial_verdict',
    );
    expect(assessVideoAnalysisQuality(thin)).toMatchObject({ status: 'limited' });
    expect(assessVideoAnalysisQuality(thin).issues.map(({ code }) => code)).toContain(
      'thin_editorial_verdict',
    );
  });

  it('flags conflicting detergent and softener evidence in the Airis report', () => {
    const analysis = makeAnalysis();
    analysis.title = 'Airis 洗衣液双人广告';
    analysis.summary = '两位人物使用 Airis 洗衣液完成衣物护理并展示产品。';
    analysis.shots = analysis.shots.map((shot, index) => ({
      ...shot,
      dialogue: index === 0 ? '新しい柔軟剤で、もっとやわらかく。' : '',
      onScreenText: index === 1 ? 'Airis SOFTENER' : '',
    }));

    const assessment = assessVideoAnalysisQuality(analysis);

    expect(assessment.status).toBe('limited');
    expect(assessment.issues.map(({ code }) => code)).toContain('inconsistent_product_category');

    analysis.shots[0].onScreenText = 'Airis 洗衣液';
    expect(assessVideoAnalysisQuality(analysis).issues.map(({ code }) => code)).toContain(
      'inconsistent_product_category',
    );
  });

  it('uses the source filename when OCR and dialogue miss the product category', () => {
    const analysis = makeAnalysis();
    analysis.title = 'Airis 洗衣液广告';
    analysis.summary = '这支广告通过清新空气感展示 Airis 洗衣液带来的衣物护理体验。';

    const assessment = assessVideoAnalysisQuality(analysis, '狮王柔顺剂Airis广告.mp4');

    expect(assessment.status).toBe('limited');
    expect(assessment.issues.map(({ code }) => code)).toContain('inconsistent_product_category');
  });

  it('keeps the category conflict until decision and action text are also corrected', () => {
    const analysis = makeAnalysis();
    analysis.title = 'Airis 柔顺剂广告';
    analysis.summary = '这支广告展示 Airis 柔顺剂带来的衣物护理体验与清新空气感。';
    analysis.editReview.verdict = {
      status: 'minor_revision',
      rationale: '洗衣液卖点已经成立，只需局部收紧产品展示后的停顿。',
    };
    analysis.shots[0].dialogue = 'きっと初めての柔軟剤';

    expect(assessVideoAnalysisQuality(analysis).issues.map(({ code }) => code)).toContain(
      'inconsistent_product_category',
    );
  });

  it('derives recommendation requirements from the editorial verdict', () => {
    const ready = makeAnalysis();
    ready.editReview.verdict = {
      status: 'ready',
      rationale: '当前成片结构、节奏与画面完成度均已满足直接交付要求。',
    };
    ready.editReview.topIssues = [];
    ready.editReview.recommendations = [];
    expect(getRequiredVideoRecommendationCount(ready)).toBe(0);
    expect(assessVideoAnalysisQuality(ready)).toMatchObject({ status: 'pass' });

    const minor = makeAnalysis();
    minor.editReview.recommendations = minor.editReview.recommendations.slice(0, 1);
    expect(getRequiredVideoRecommendationCount(minor)).toBe(1);
    expect(assessVideoAnalysisQuality(minor)).toMatchObject({ status: 'pass' });
    minor.editReview.recommendations = [];
    expect(assessVideoAnalysisQuality(minor)).toMatchObject({ status: 'limited' });
    expect(assessVideoAnalysisQuality(minor).issues.map(({ code }) => code)).toEqual(
      expect.arrayContaining(['insufficient_recommendations', 'inconsistent_editorial_verdict']),
    );

    const major = makeAnalysis();
    major.editReview.verdict = {
      status: 'major_revision',
      rationale: '当前成片存在关键结构与节奏问题，需要完成大幅修改后重新复核。',
    };
    expect(getRequiredVideoRecommendationCount(major)).toBe(2);
    expect(assessVideoAnalysisQuality(major)).toMatchObject({ status: 'limited' });
    expect(assessVideoAnalysisQuality(major).issues.map(({ code }) => code)).toContain(
      'inconsistent_editorial_verdict',
    );
    major.editReview.recommendations[0].priority = 'high';
    expect(assessVideoAnalysisQuality(major)).toMatchObject({ status: 'pass' });
  });

  it('does not allow a ready verdict to hide a high-priority change', () => {
    const analysis = makeAnalysis();
    analysis.editReview.verdict = {
      status: 'ready',
      rationale: '当前成片结构、节奏与画面完成度均已满足直接交付要求。',
    };
    analysis.editReview.recommendations[0].priority = 'high';

    const assessment = assessVideoAnalysisQuality(analysis);

    expect(assessment.status).toBe('limited');
    expect(assessment.issues.map(({ code }) => code)).toContain('inconsistent_editorial_verdict');
  });

  it.each(['可以考虑', '可考虑', '建议考虑', '尝试'])(
    'marks an action beginning with “%s” as non-committal',
    (prefix) => {
      const analysis = makeAnalysis();
      analysis.editReview.recommendations[0].action = `${prefix}将开场跟拍缩短一秒，并保留人物拿杯动作的完整节奏落点。`;

      const assessment = assessVideoAnalysisQuality(analysis);

      expect(assessment.status).toBe('limited');
      expect(assessment.issues.map(({ code }) => code)).toContain('thin_recommendation_action');
    },
  );
});

describe('selectHigherQualityAnalysis', () => {
  it('selects the higher-scoring version and keeps the first version on a tie', () => {
    const detailed = makeAnalysis();
    const minimal = makeAnalysis();
    minimal.shots = minimal.shots.map((shot) => ({
      ...shot,
      visibleAction: '微笑',
      existingSound: '无',
      soundCue: { ...shot.soundCue, function: '结束', character: '轻', mixRisk: '低' },
    }));

    expect(selectHigherQualityAnalysis(minimal, detailed)).toBe(detailed);
    expect(selectHigherQualityAnalysis(detailed, makeAnalysis())).toBe(detailed);
  });

  it('prefers a version that passes the gate over a higher raw score that remains limited', () => {
    const limited = makeAnalysis();
    limited.durationSeconds = 16;
    limited.shots = Array.from({ length: 4 }, (_, index) => ({
      ...makeShot(index),
      visualDescription: '模特站在白色背景中央，暖光勾勒手中的透明玻璃产品瓶并保持静止。',
    }));
    const passing = makeAnalysis();
    passing.durationSeconds = 16;
    const distinctDescriptions = [
      '女性模特站在明亮厨房中景左侧，暖光掠过透明玻璃杯并保持静止。',
      '绿色产品瓶位于白色台面中央特写，冷光勾勒金属瓶盖并保持正面。',
      '骑行者从冷蓝街道全景右侧进入，前景积水反射车灯并随车轮变化。',
      '男性人物在暖色木门近景前站立，侧光照亮手部与门锁金属材质。',
    ];
    passing.shots = Array.from({ length: 4 }, (_, index) => ({
      ...makeShot(index),
      visualDescription: distinctDescriptions[index],
      visibleAction: '微笑',
    }));

    expect(assessVideoAnalysisQuality(limited).status).toBe('limited');
    expect(assessVideoAnalysisQuality(passing).status).toBe('pass');
    expect(selectHigherQualityAnalysis(limited, passing)).toBe(passing);
  });

  it('prefers a version that resolves a critical category conflict on a limited-score tie', () => {
    const conflicted = makeAnalysis();
    conflicted.title = 'Airis 洗衣液广告';
    conflicted.summary = '这支广告通过清新空气感展示 Airis 洗衣液带来的衣物护理体验。';
    conflicted.narrativeArc = '展示产品';
    conflicted.editReview.strengths = ['好看'];
    conflicted.editReview.rhythmSummary = '正常';
    conflicted.editReview.recommendations[0].action = '优化';
    const corrected = makeAnalysis();
    corrected.title = 'Airis 柔顺剂广告';
    corrected.summary = '这支广告通过清新空气感展示 Airis 柔顺剂带来的衣物护理体验。';
    corrected.narrativeArc = '展示产品';
    corrected.editReview.strengths = ['好看'];
    corrected.editReview.rhythmSummary = '正常';
    corrected.editReview.recommendations[0].action = '优化';
    const sourceFileName = '狮王柔顺剂Airis广告.mp4';

    expect(assessVideoAnalysisQuality(conflicted, sourceFileName).status).toBe('limited');
    expect(assessVideoAnalysisQuality(corrected, sourceFileName).status).toBe('limited');
    expect(selectHigherQualityAnalysis(conflicted, corrected, sourceFileName)).toBe(corrected);
  });
});

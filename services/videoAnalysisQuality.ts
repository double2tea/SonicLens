import { VIDEO_ANALYSIS_PASS_SCORE } from '../types';
import type { VideoAnalysisResult } from '../types';

export type VideoQualityIssueCode =
  | 'missing_shots'
  | 'thin_summary'
  | 'thin_narrative_arc'
  | 'thin_rhythm_summary'
  | 'thin_visual_finish'
  | 'thin_strengths'
  | 'thin_top_issues'
  | 'missing_editorial_verdict'
  | 'thin_editorial_verdict'
  | 'inconsistent_editorial_verdict'
  | 'inconsistent_product_category'
  | 'thin_visual_description'
  | 'thin_visible_action'
  | 'thin_existing_sound'
  | 'thin_sound_function'
  | 'thin_sound_character'
  | 'vague_mix_risk'
  | 'repetitive_shot_description'
  | 'insufficient_recommendations'
  | 'thin_recommendation_evidence'
  | 'thin_recommendation_action'
  | 'thin_recommendation_impact';

export interface VideoQualityIssue {
  code: VideoQualityIssueCode;
  scope: 'report' | 'shot' | 'recommendation';
  message: string;
  shotIndexes?: number[];
  recommendationIndexes?: number[];
  visualFinishFields?: Array<keyof VideoAnalysisResult['editReview']['visualFinish']>;
}

export interface VideoQualityAssessment {
  score: number;
  /** Unrounded 0–100 value used for pass/fail and version selection. */
  scoreExact: number;
  status: 'pass' | 'limited';
  issues: VideoQualityIssue[];
  /** Zero-based indexes of at most six shots with the lowest field pass rate. */
  weakestShotIndexes: number[];
}

interface CheckScore {
  passed: number;
  total: number;
}

const normalizeText = (text: string): string =>
  text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\p{P}\p{S}\s]+/gu, '');

const VAGUE_TEXT = new Set(
  [
    '',
    '-',
    'n/a',
    'na',
    'none',
    'low',
    'no risk',
    'low risk',
    '无',
    '暂无',
    '没有',
    '低',
    '较低',
    '无风险',
    '风险低',
    '低风险',
    '无明显风险',
    '无混音风险',
    '结束',
    '场景氛围',
    '动作同步',
    '强调产品使用',
    '建立场景',
  ].map(normalizeText),
);

const GENERIC_FILLER_PATTERNS = [
  /^(?:整体|进一步)?(?:增强|营造|强化|提升).*(?:氛围|质感|效果|感染力)[。.!]?$/u,
  /^(?:整体)?(?:画面|声音).*(?:自然|高级|舒适|不错|正常|质感|效果|感染力)[。.!]?$/u,
  /^(?:整体)?(?:轻柔|自然|清晰|高级|舒适).*(?:质感|效果|感染力|生活化)[。.!]?$/u,
  /^(?:整体)?(?:混音)?(?:风险|冲突).*(?:较低|不高|可控|无需|不需要).*(?:调整|处理|问题)?[。.!]?$/u,
];

const hasDetail = (text: string, minimumLength: number): boolean => {
  const normalized = normalizeText(text);
  return normalized.length >= minimumLength && !VAGUE_TEXT.has(normalized);
};

const isGenericFiller = (text: string): boolean =>
  GENERIC_FILLER_PATTERNS.some((pattern) => pattern.test(text.trim()));

const hasSubstantiveDetail = (text: string, minimumLength: number): boolean =>
  hasDetail(text, minimumLength) && !isGenericFiller(text);

const hasDetailedEntries = (entries: string[], minimumLength: number): boolean =>
  entries.length > 0 &&
  entries.filter((entry) => hasSubstantiveDetail(entry, minimumLength)).length / entries.length >=
    0.75;

const hasPatternGroups = (text: string, groups: RegExp[][], requiredGroups: number): boolean =>
  groups.filter((patterns) => patterns.some((pattern) => pattern.test(text))).length >=
  requiredGroups;

const normalizedLength = (text: string): number => normalizeText(text).length;

const ABSTRACT_FILLER_PATTERN =
  /(?:整体|当前|继续|进行|保持|用于|承接|人物|产品|展示|面向|镜头|状态|画面|声音|叙事|节奏|连续性|柔和|清晰|空间|层次|变化|效果|氛围|质感|可能|同时|出现|需要|避免|影响|带有|一定|相关|内容|并|和|与|的|在|有|了|为|将|对|中)/gu;

const hasConcreteResidue = (text: string, minimumLength = 4): boolean =>
  normalizeText(text.replace(ABSTRACT_FILLER_PATTERN, '')).length >= minimumLength;

const HEDGED_RECOMMENDATION_ACTION_PATTERN = /^(?:可以考虑|可考虑|建议考虑|尝试)/u;
const DETERGENT_PATTERN = /(?:洗衣液|洗涤剂|detergent)/iu;
const SOFTENER_PATTERN = /(?:柔軟剤|柔顺剂|softener)/iu;

const hasDecisiveRecommendationAction = (text: string): boolean =>
  hasSubstantiveDetail(text, 16) && !HEDGED_RECOMMENDATION_ACTION_PATTERN.test(text.trim());

interface ProductCategoryConflict {
  hasConflict: boolean;
  recommendationIndexes: number[];
  shotIndexes: number[];
}

const findProductCategoryConflict = (
  analysis: VideoAnalysisResult,
  sourceFileName: string,
): ProductCategoryConflict => {
  const reportText = [
    analysis.title,
    analysis.summary,
    analysis.narrativeArc,
    analysis.editReview.verdict?.rationale ?? '',
    ...analysis.editReview.strengths,
    ...analysis.editReview.topIssues,
    analysis.editReview.rhythmSummary,
    ...Object.values(analysis.editReview.visualFinish),
  ]
    .join(' ')
    .normalize('NFKC');
  const observedText = [
    sourceFileName,
    ...analysis.shots.flatMap(({ dialogue, onScreenText }) => [dialogue, onScreenText]),
  ]
    .join(' ')
    .normalize('NFKC');
  const shotIndexes = analysis.shots
    .map((shot, index) => ({
      index,
      text: [
        shot.visualDescription,
        shot.visibleAction,
        shot.existingSound,
        shot.soundCue.cue,
        shot.soundCue.function,
        shot.soundCue.character,
        shot.soundCue.mixRisk,
      ].join(' '),
    }))
    .filter(({ text }) => DETERGENT_PATTERN.test(text.normalize('NFKC')))
    .map(({ index }) => index);
  const recommendationIndexes = analysis.editReview.recommendations
    .map((recommendation, index) => ({
      index,
      text: [recommendation.evidence, recommendation.action, recommendation.expectedImpact].join(
        ' ',
      ),
    }))
    .filter(({ text }) => DETERGENT_PATTERN.test(text.normalize('NFKC')))
    .map(({ index }) => index);
  const hasSoftenerEvidence = SOFTENER_PATTERN.test(observedText);
  const hasMixedObservedEvidence = hasSoftenerEvidence && DETERGENT_PATTERN.test(observedText);
  return {
    hasConflict:
      hasSoftenerEvidence &&
      (DETERGENT_PATTERN.test(reportText) ||
        shotIndexes.length > 0 ||
        recommendationIndexes.length > 0 ||
        hasMixedObservedEvidence),
    recommendationIndexes,
    shotIndexes,
  };
};

const isEditorialVerdictConsistent = (analysis: VideoAnalysisResult): boolean => {
  const { recommendations, verdict } = analysis.editReview;
  if (!verdict) return false;
  if (verdict.status === 'ready') {
    return recommendations.every(({ priority }) => priority !== 'high');
  }
  if (verdict.status === 'minor_revision') return recommendations.length >= 1;
  return recommendations.length >= 2 && recommendations.some(({ priority }) => priority === 'high');
};

const VISUAL_SUBJECT_PATTERN =
  /(?:人物|模特|男性|女性|男生|女生|歌手|骑行者|产品|瓶|罐|杯|车辆|手部|面部|主体|字幕|屏幕|桌面|门|建筑|街道|服装|手机|动物)/u;

const hasVisualEvidence = (text: string): boolean =>
  hasDetail(text, 10) &&
  !isGenericFiller(text) &&
  ((normalizedLength(text) >= 14 && hasConcreteResidue(text)) ||
    (VISUAL_SUBJECT_PATTERN.test(text) &&
      hasConcreteResidue(text) &&
      hasPatternGroups(
        text,
        [
          [VISUAL_SUBJECT_PATTERN],
          [
            /(?:特写|近景|中景|全景|远景|前景|背景|白底|左侧|右侧|中央|上方|下方|正面|侧面|构图|景深|台面|俯拍|仰拍)/u,
          ],
          [
            /(?:明亮|暗调|冷光|暖光|逆光|侧光|高光|阴影|曝光|色调|红色|蓝色|绿色|白色|黑色|霓虹|反射|透明|金属|玻璃|木质|塑料|织物|皮肤)/u,
          ],
          [
            /(?:扫过|移动|推进|拉远|旋转|进入|离开|拿起|放下|抬起|落下|切换|变化|显现|消失|保持|静止|站立|坐下|微笑|注视)/u,
          ],
        ],
        3,
      )));

const hasVisibleActionEvidence = (text: string): boolean =>
  hasDetail(text, 6) &&
  !isGenericFiller(text) &&
  ((normalizedLength(text) >= 10 && hasConcreteResidue(text)) ||
    (hasConcreteResidue(text) &&
      hasPatternGroups(
        text,
        [
          [/(?:人物|模特|男性|女性|男生|女生|歌手|骑行者|产品|瓶|罐|杯|车辆|手|视线|身体|主体)/u],
          [
            /(?:进入|离开|拿起|放下|抬起|落下|打开|关闭|转动|移动|推进|减速|加速|停下|保持|静止|站立|坐下|微笑|注视|转身|切换|变化)/u,
          ],
        ],
        2,
      )));

const hasExistingSoundEvidence = (text: string): boolean =>
  hasDetail(text, 6) &&
  !isGenericFiller(text) &&
  ((normalizedLength(text) >= 10 && hasConcreteResidue(text)) ||
    (hasConcreteResidue(text) &&
      hasPatternGroups(
        text,
        [
          [
            /(?:对白|旁白|人声|音乐|环境|动作声|脚步|雨声|细雨|门锁|碰撞|摩擦|风声|车流|轮胎|底噪|静默|无声|声|音)/u,
          ],
          [
            /(?:前景|背景|近处|远处|近景|中景|左侧|右侧|中央|覆盖|叠加|错开|静默|无声|仅有|没有|无对白|无音乐)/u,
          ],
        ],
        2,
      )));

const hasSoundFunctionEvidence = (text: string): boolean =>
  hasDetail(text, 8) &&
  !isGenericFiller(text) &&
  ((normalizedLength(text) >= 14 && hasConcreteResidue(text)) ||
    (hasConcreteResidue(text) &&
      hasPatternGroups(
        text,
        [
          [/(?:瞬态|切点|动作|开场|结尾|转场|节奏|起音|尾音|停顿|画面|镜头)/u],
          [/(?:强调|建立|连接|推动|收束|转移|提示|制造|突出|确认|缓解|引导|形成|服务)/u],
        ],
        2,
      )));

const hasSoundCharacterEvidence = (text: string): boolean =>
  hasDetail(text, 8) &&
  !isGenericFiller(text) &&
  ((normalizedLength(text) >= 16 && hasConcreteResidue(text)) ||
    (hasConcreteResidue(text) &&
      hasPatternGroups(
        text,
        [
          [
            /(?:金属|玻璃|木质|塑料|布料|皮肤|脚步|机械|液体|水花|钥匙|雨声|轮胎|木门|铃音|气泡|人声|弦乐|鼓|合成器|噪声|脆响|摩擦|撞击|低频|中频|高频)/u,
          ],
          [/(?:起音|瞬态|短促|延音|衰减|尾音|attack|body|tail|渐强|渐弱)/iu],
          [/(?:近距|远处|前景|背景|左侧|右侧|中央|室内|室外|混响|干声|空间|声像)/u],
        ],
        3,
      )));

const hasSpecificMixRisk = (text: string): boolean =>
  hasDetail(text, 8) &&
  !isGenericFiller(text) &&
  ((hasConcreteResidue(text) &&
    hasPatternGroups(
      text,
      [
        [/(?:对白|旁白|人声|音乐|环境|动作声|音效|低频|中频|高频|频段|声部|瞬态)/u],
        [/(?:遮蔽|冲突|错开|重叠|抢占|干扰|留出|避让|不冲突|动态|声像|空间|因为|由于)/u],
      ],
      2,
    )) ||
    (normalizedLength(text) >= 16 &&
      hasConcreteResidue(text) &&
      /(?:可能|会|同时|先后|遮蔽|掩盖|冲突|错开|重叠|需要|避免|留出|不影响)/u.test(text)));

const bigrams = (text: string): Set<string> => {
  const pairs = new Set<string>();
  for (let index = 0; index < text.length - 1; index += 1) {
    pairs.add(text.slice(index, index + 2));
  }
  return pairs;
};

const isNearDuplicate = (left: string, right: string): boolean => {
  const normalizedLeft = normalizeText(left);
  const normalizedRight = normalizeText(right);
  if (Math.min(normalizedLeft.length, normalizedRight.length) < 8) return false;
  if (normalizedLeft === normalizedRight) return true;

  const leftPairs = bigrams(normalizedLeft);
  const rightPairs = bigrams(normalizedRight);
  let intersection = 0;
  leftPairs.forEach((pair) => {
    if (rightPairs.has(pair)) intersection += 1;
  });
  const union = new Set([...leftPairs, ...rightPairs]).size;
  return union > 0 && intersection / union >= 0.8;
};

const findRepeatedShotIndexes = (analysis: VideoAnalysisResult): Set<number> => {
  const repeated = new Set<number>();
  analysis.shots.forEach((shot, index) => {
    for (let comparison = index + 1; comparison < analysis.shots.length; comparison += 1) {
      if (isNearDuplicate(shot.visualDescription, analysis.shots[comparison].visualDescription)) {
        repeated.add(index);
        repeated.add(comparison);
      }
    }
  });

  const minimumRepeated = Math.max(3, Math.ceil(analysis.shots.length * 0.3));
  return repeated.size >= minimumRepeated ? repeated : new Set<number>();
};

const addCheck = (score: CheckScore, passed: boolean): void => {
  score.total += 1;
  if (passed) score.passed += 1;
};

const addIssue = (
  issues: VideoQualityIssue[],
  issue: VideoQualityIssue,
  indexes: number[],
): void => {
  if (indexes.length === 0) return;
  issues.push(issue);
};

export const getRequiredVideoRecommendationCount = (analysis: VideoAnalysisResult): number => {
  if (analysis.editReview.verdict?.status === 'ready') return 0;
  if (analysis.editReview.verdict?.status === 'minor_revision') return 1;
  return 2;
};

export const assessVideoAnalysisQuality = (
  analysis: VideoAnalysisResult,
  sourceFileName = '',
): VideoQualityAssessment => {
  const issues: VideoQualityIssue[] = [];
  const reportScore: CheckScore = { passed: 0, total: 0 };
  const shotScore: CheckScore = { passed: 0, total: 0 };
  const recommendationScore: CheckScore = { passed: 0, total: 0 };
  const shotScores = analysis.shots.map<CheckScore>(() => ({ passed: 0, total: 0 }));

  addCheck(shotScore, analysis.shots.length > 0);
  if (analysis.shots.length === 0) {
    issues.push({ code: 'missing_shots', scope: 'report', message: '报告没有可评估的镜头。' });
  }

  const globalChecks: Array<{
    code: VideoQualityIssueCode;
    passed: boolean;
    message: string;
  }> = [
    {
      code: 'thin_summary',
      passed: hasSubstantiveDetail(analysis.summary, 24),
      message: '全局摘要缺少具体事件或结果。',
    },
    {
      code: 'thin_narrative_arc',
      passed: hasSubstantiveDetail(analysis.narrativeArc, 18),
      message: '叙事弧缺少明确的发展或转折。',
    },
    {
      code: 'thin_rhythm_summary',
      passed: hasSubstantiveDetail(analysis.editReview.rhythmSummary, 18),
      message: '节奏总结过于简略。',
    },
    {
      code: 'thin_strengths',
      passed: hasDetailedEntries(analysis.editReview.strengths, 12),
      message: '作品优势缺少具体依据。',
    },
    {
      code: 'thin_top_issues',
      passed:
        (analysis.editReview.verdict?.status === 'ready' &&
          analysis.editReview.topIssues.length === 0) ||
        hasDetailedEntries(analysis.editReview.topIssues, 12),
      message: '主要问题缺少具体描述。',
    },
  ];

  globalChecks.forEach((check) => {
    addCheck(reportScore, check.passed);
    if (!check.passed) {
      issues.push({ code: check.code, scope: 'report', message: check.message });
    }
  });

  const verdict = analysis.editReview.verdict;
  const hasEditorialVerdict = verdict !== undefined;
  const hasDetailedEditorialVerdict =
    verdict !== undefined && hasSubstantiveDetail(verdict.rationale, 16);
  const hasConsistentEditorialVerdict = isEditorialVerdictConsistent(analysis);
  const productCategoryConflict = findProductCategoryConflict(analysis, sourceFileName);
  addCheck(reportScore, hasEditorialVerdict);
  addCheck(reportScore, hasDetailedEditorialVerdict);
  addCheck(reportScore, hasConsistentEditorialVerdict);
  addCheck(reportScore, !productCategoryConflict.hasConflict);
  if (!hasEditorialVerdict) {
    issues.push({
      code: 'missing_editorial_verdict',
      scope: 'report',
      message: '报告缺少可交付、微调或大改的编辑结论。',
    });
  } else {
    if (!hasDetailedEditorialVerdict) {
      issues.push({
        code: 'thin_editorial_verdict',
        scope: 'report',
        message: '编辑结论缺少支持该判断的具体依据。',
      });
    }
    if (!hasConsistentEditorialVerdict) {
      issues.push({
        code: 'inconsistent_editorial_verdict',
        scope: 'report',
        message: '编辑结论与建议数量或高优先级修改项不一致。',
      });
    }
  }
  if (productCategoryConflict.hasConflict) {
    issues.push({
      code: 'inconsistent_product_category',
      scope: 'report',
      message: '文件名、画面文字、对白或报告中的产品类别存在洗衣液与柔顺剂冲突。',
      recommendationIndexes: productCategoryConflict.recommendationIndexes,
      shotIndexes: productCategoryConflict.shotIndexes,
    });
  }

  const visualFinish = analysis.editReview.visualFinish;
  const visualFinishEntries = (
    [
      ['compositionAndContinuity', visualFinish.compositionAndContinuity],
      ['colorAndExposure', visualFinish.colorAndExposure],
      ['vfxAndMotion', visualFinish.vfxAndMotion],
      ['typographyAndBranding', visualFinish.typographyAndBranding],
    ] as const
  ).map(([field, value]) => ({ field, passed: hasSubstantiveDetail(value, 16) }));
  const thinVisualFinishFields = visualFinishEntries
    .filter(({ passed }) => !passed)
    .map(({ field }) => field);
  visualFinishEntries.forEach(({ passed }) => addCheck(reportScore, passed));
  if (thinVisualFinishFields.length > 0) {
    issues.push({
      code: 'thin_visual_finish',
      scope: 'report',
      message: `视觉包装中有 ${thinVisualFinishFields.length} 项描述过于简略。`,
      visualFinishFields: thinVisualFinishFields,
    });
  }

  const repeatedShotIndexes = findRepeatedShotIndexes(analysis);
  const shotFieldChecks: Array<{
    code: VideoQualityIssueCode;
    message: string;
    minimumLength: number;
    read: (shotIndex: number) => string;
  }> = [
    {
      code: 'thin_visual_description',
      message: '镜头画面描述缺少可见细节。',
      minimumLength: 0,
      read: (index) => analysis.shots[index].visualDescription,
    },
    {
      code: 'thin_visible_action',
      message: '镜头动作描述过于简略。',
      minimumLength: 10,
      read: (index) => analysis.shots[index].visibleAction,
    },
    {
      code: 'thin_existing_sound',
      message: '现有声音描述缺少声源或空间信息。',
      minimumLength: 12,
      read: (index) => analysis.shots[index].existingSound,
    },
    {
      code: 'thin_sound_function',
      message: '声音功能描述过于简略。',
      minimumLength: 10,
      read: (index) => analysis.shots[index].soundCue.function,
    },
    {
      code: 'thin_sound_character',
      message: '声音性格描述缺少质感或空间信息。',
      minimumLength: 0,
      read: (index) => analysis.shots[index].soundCue.character,
    },
  ];

  shotFieldChecks.forEach((field) => {
    const failedIndexes: number[] = [];
    analysis.shots.forEach((_shot, index) => {
      const value = field.read(index);
      const passed =
        field.code === 'thin_visual_description'
          ? hasVisualEvidence(value)
          : field.code === 'thin_visible_action'
            ? hasVisibleActionEvidence(value)
            : field.code === 'thin_existing_sound'
              ? hasExistingSoundEvidence(value)
              : field.code === 'thin_sound_function'
                ? hasSoundFunctionEvidence(value)
                : field.code === 'thin_sound_character'
                  ? hasSoundCharacterEvidence(value)
                  : hasDetail(value, field.minimumLength);
      addCheck(shotScore, passed);
      addCheck(shotScores[index], passed);
      if (!passed) failedIndexes.push(index);
    });
    addIssue(
      issues,
      {
        code: field.code,
        scope: 'shot',
        message: field.message,
        shotIndexes: failedIndexes,
      },
      failedIndexes,
    );
  });

  const vagueMixRiskIndexes: number[] = [];
  analysis.shots.forEach((shot, index) => {
    const passed = hasSpecificMixRisk(shot.soundCue.mixRisk);
    addCheck(shotScore, passed);
    addCheck(shotScores[index], passed);
    if (!passed) vagueMixRiskIndexes.push(index);
  });
  addIssue(
    issues,
    {
      code: 'vague_mix_risk',
      scope: 'shot',
      message: '混音风险只有“低”或“无”等空泛结论。',
      shotIndexes: vagueMixRiskIndexes,
    },
    vagueMixRiskIndexes,
  );

  analysis.shots.forEach((_shot, index) => {
    const passed = !repeatedShotIndexes.has(index);
    addCheck(shotScore, passed);
    addCheck(shotScores[index], passed);
  });
  addIssue(
    issues,
    {
      code: 'repetitive_shot_description',
      scope: 'shot',
      message: '多个镜头使用了高度重复的画面描述。',
      shotIndexes: [...repeatedShotIndexes],
    },
    [...repeatedShotIndexes],
  );

  const requiredRecommendations = getRequiredVideoRecommendationCount(analysis);
  const hasEnoughRecommendations =
    analysis.editReview.recommendations.length >= requiredRecommendations;
  addCheck(recommendationScore, hasEnoughRecommendations);
  if (!hasEnoughRecommendations) {
    issues.push({
      code: 'insufficient_recommendations',
      scope: 'recommendation',
      message: `当前编辑结论至少需要 ${requiredRecommendations} 条具体优化建议。`,
    });
  }

  const recommendationChecks: Array<{
    code: VideoQualityIssueCode;
    message: string;
    read: (index: number) => string;
  }> = [
    {
      code: 'thin_recommendation_evidence',
      message: '部分建议没有提供具体证据。',
      read: (index) => analysis.editReview.recommendations[index].evidence,
    },
    {
      code: 'thin_recommendation_action',
      message: '部分建议没有提供可执行动作。',
      read: (index) => analysis.editReview.recommendations[index].action,
    },
    {
      code: 'thin_recommendation_impact',
      message: '部分建议没有说明预期影响。',
      read: (index) => analysis.editReview.recommendations[index].expectedImpact,
    },
  ];

  recommendationChecks.forEach((field) => {
    const failedIndexes: number[] = [];
    analysis.editReview.recommendations.forEach((_recommendation, index) => {
      const value = field.read(index);
      const passed =
        field.code === 'thin_recommendation_action'
          ? hasDecisiveRecommendationAction(value)
          : hasSubstantiveDetail(value, 16);
      if (!passed) failedIndexes.push(index);
    });
    const allowsNoRecommendations =
      requiredRecommendations === 0 && analysis.editReview.recommendations.length === 0;
    addCheck(
      recommendationScore,
      allowsNoRecommendations ||
        (analysis.editReview.recommendations.length > 0 && failedIndexes.length === 0),
    );
    addIssue(
      issues,
      {
        code: field.code,
        scope: 'recommendation',
        message: field.message,
        recommendationIndexes: failedIndexes,
      },
      failedIndexes,
    );
  });

  const toPercent = (section: CheckScore): number =>
    section.total === 0 ? 0 : (section.passed / section.total) * 100;
  const reportPercent = toPercent(reportScore);
  const shotPercent = toPercent(shotScore);
  const recommendationPercent = toPercent(recommendationScore);
  const scoreExact = reportPercent * 0.35 + shotPercent * 0.3 + recommendationPercent * 0.35;
  const passesSectionGates =
    reportPercent >= 67 && shotPercent >= 72 && recommendationPercent >= 80;
  const hasCriticalRepetition = repeatedShotIndexes.size > 0;
  const hasCriticalEditorialIssue = issues.some(({ code }) =>
    [
      'missing_editorial_verdict',
      'thin_editorial_verdict',
      'inconsistent_editorial_verdict',
      'inconsistent_product_category',
    ].includes(code),
  );
  const passesQualityGate =
    scoreExact >= VIDEO_ANALYSIS_PASS_SCORE &&
    passesSectionGates &&
    !hasCriticalRepetition &&
    !hasCriticalEditorialIssue;
  const normalizedScore = passesQualityGate
    ? Math.floor(scoreExact)
    : Math.min(Math.floor(scoreExact), VIDEO_ANALYSIS_PASS_SCORE - 1);
  const fieldWeakestShotIndexes = shotScores
    .map((shotScore, index) => ({
      index,
      rate: shotScore.total === 0 ? 1 : shotScore.passed / shotScore.total,
    }))
    .filter(({ rate }) => rate < 1)
    .sort((left, right) => left.rate - right.rate || left.index - right.index)
    .slice(0, 6)
    .map(({ index }) => index)
    .sort((left, right) => left - right);
  const weakestShotIndexes = Array.from(
    new Set([...productCategoryConflict.shotIndexes, ...fieldWeakestShotIndexes]),
  )
    .sort((left, right) => left - right)
    .slice(0, 6);

  return {
    score: normalizedScore,
    scoreExact,
    status: passesQualityGate ? 'pass' : 'limited',
    issues,
    weakestShotIndexes,
  };
};

export const selectHigherQualityAnalysis = (
  first: VideoAnalysisResult,
  second: VideoAnalysisResult,
  sourceFileName = '',
): VideoAnalysisResult => {
  const firstAssessment = assessVideoAnalysisQuality(first, sourceFileName);
  const secondAssessment = assessVideoAnalysisQuality(second, sourceFileName);
  if (firstAssessment.status !== secondAssessment.status) {
    return secondAssessment.status === 'pass' ? second : first;
  }
  const criticalIssueCodes: VideoQualityIssueCode[] = [
    'missing_editorial_verdict',
    'thin_editorial_verdict',
    'inconsistent_editorial_verdict',
    'inconsistent_product_category',
    'repetitive_shot_description',
  ];
  const countCriticalIssues = (assessment: VideoQualityAssessment): number =>
    assessment.issues.filter(({ code }) => criticalIssueCodes.includes(code)).length;
  const firstCriticalIssues = countCriticalIssues(firstAssessment);
  const secondCriticalIssues = countCriticalIssues(secondAssessment);
  if (firstCriticalIssues !== secondCriticalIssues) {
    return secondCriticalIssues < firstCriticalIssues ? second : first;
  }
  return secondAssessment.scoreExact > firstAssessment.scoreExact ? second : first;
};

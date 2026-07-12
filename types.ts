export type AnalysisMode = 'music' | 'sfx' | 'video';

export type SeedAudioContentMode = 'speech' | 'mixed' | 'nonverbal';
export type SeedAudioDeliveryMode = 'integrated_demo' | 'assembled_mix' | 'stems';
export type SoundPriority = 'must' | 'recommended' | 'creative';
export type SoundRoute = 'integrated' | 'timed_clip' | 'library_foley' | 'mix_only' | 'omit';

export interface VideoSoundCue {
  cue: string;
  priority: SoundPriority;
  diegeticStatus: 'diegetic' | 'non_diegetic' | 'ambiguous';
  function: string;
  character: string;
  route: SoundRoute;
  mixRisk: string;
}

export interface VideoShot {
  startSeconds: number;
  endSeconds: number;
  shotType: string;
  cameraAngle: string;
  cameraMovement: string;
  transition: string;
  visualDescription: string;
  visibleAction: string;
  onScreenText: string;
  dialogue: string;
  existingSound: string;
  soundCue: VideoSoundCue;
}

export interface VideoSegmentation {
  mode: 'shot' | 'sequence';
  note: string;
  detection?: {
    method: 'two_stage';
    sampleRateFps: number;
    detectedCuts: number;
    confidence: 'high' | 'medium' | 'low';
  };
}

export interface SeedAudioBrief {
  recommendedMode: SeedAudioDeliveryMode;
  contentMode: SeedAudioContentMode;
  projectContext: string;
  speakerVo: string;
  music: string;
  sfxAmbience: string;
  mix: string;
  avoid: string[];
  textPrompt: string;
}

export type EditRecommendationCategory =
  | 'structure'
  | 'pacing'
  | 'cut'
  | 'continuity'
  | 'transition'
  | 'color'
  | 'vfx'
  | 'motion_graphics'
  | 'typography'
  | 'branding';

export type EditPriority = 'high' | 'medium' | 'low';

export interface VideoRhythmPoint {
  startSeconds: number;
  endSeconds: number;
  intensity: number;
  label: string;
  description: string;
}

export interface VideoEditRecommendation {
  startSeconds: number;
  endSeconds: number;
  category: EditRecommendationCategory;
  priority: EditPriority;
  evidence: string;
  action: string;
  expectedImpact: string;
}

export interface VideoEditReview {
  strengths: string[];
  topIssues: string[];
  rhythmSummary: string;
  rhythm: VideoRhythmPoint[];
  visualFinish: {
    compositionAndContinuity: string;
    colorAndExposure: string;
    vfxAndMotion: string;
    typographyAndBranding: string;
  };
  recommendations: VideoEditRecommendation[];
}

export interface VideoAnalysisResult {
  type: 'video';
  title: string;
  summary: string;
  durationSeconds: number;
  narrativeArc: string;
  visualStyle: string[];
  keywords: string[];
  segmentation: VideoSegmentation;
  shots: VideoShot[];
  editReview: VideoEditReview;
  seedAudio?: SeedAudioBrief;
  risks: string[];
}

export interface SonicProfile {
  energy: number;
  happiness: number;
  acousticness: number;
  instrumental: number;
  intensity: number;
}

export interface SongSegment {
  timestamp: string;
  genre: string;
  mood: string;
  description: string;
  bpm?: number;
  key?: string;
  instruments?: string[];
}

export interface SimilarTrack {
  artist: string;
  title: string;
}

export interface EditorCuePoint {
  timestamp: string;
  eventName: string;
  vibeChange: string;
  visualAdvice: string;
}

export interface SfxDetails {
  name: string;
  ucsCatId: string;
  ucsCategory: string;
  ucsSubCategory: string;
  foleyInstructions: string;
  accessibleAlternatives: string;
  visualSyncTips: string;
}

interface BaseAnalysisResult {
  keywords: string[];
  educationalContext: string;
  instruments: string[];
  mood?: string[];
  optimizedPrompt?: string;
}

export interface MusicAnalysisResult extends BaseAnalysisResult {
  type: 'music';
  mainGenre: string;
  subGenres?: string[];
  bpm?: number;
  timeSignature?: string;
  key?: string;
  rhythmDescription?: string;
  similarTracks?: SimilarTrack[];
  sonicProfile?: SonicProfile;
  multipleSongsDetected?: boolean;
  segments?: SongSegment[];
  editorCuePoints?: EditorCuePoint[];
}

export interface SfxAnalysisResult extends BaseAnalysisResult {
  type: 'sfx';
  sfx: SfxDetails;
}

export type AnalysisResult = MusicAnalysisResult | SfxAnalysisResult | VideoAnalysisResult;

type UnknownRecord = Record<string, unknown>;
type ValueValidator = (value: unknown) => boolean;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === 'string';
const isInteger = (value: unknown): value is number => Number.isInteger(value);
const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isString);

const isOptionalFieldValid = (
  value: UnknownRecord,
  key: string,
  validate: ValueValidator,
): boolean => !(key in value) || validate(value[key]);

const isSimilarTrack = (value: unknown): value is SimilarTrack =>
  isRecord(value) && isString(value.artist) && isString(value.title);

const isSonicProfile = (value: unknown): value is SonicProfile =>
  isRecord(value) &&
  isInteger(value.energy) &&
  isInteger(value.happiness) &&
  isInteger(value.acousticness) &&
  isInteger(value.instrumental) &&
  isInteger(value.intensity);

const isSongSegment = (value: unknown): value is SongSegment =>
  isRecord(value) &&
  isString(value.timestamp) &&
  isString(value.genre) &&
  isString(value.mood) &&
  isString(value.description) &&
  isOptionalFieldValid(value, 'bpm', isFiniteNumber) &&
  isOptionalFieldValid(value, 'key', isString) &&
  isOptionalFieldValid(value, 'instruments', isStringArray);

const isEditorCuePoint = (value: unknown): value is EditorCuePoint =>
  isRecord(value) &&
  isString(value.timestamp) &&
  isString(value.eventName) &&
  isString(value.vibeChange) &&
  isString(value.visualAdvice);

const isSfxDetails = (value: unknown): value is SfxDetails =>
  isRecord(value) &&
  isString(value.name) &&
  isString(value.ucsCatId) &&
  isString(value.ucsCategory) &&
  isString(value.ucsSubCategory) &&
  isString(value.foleyInstructions) &&
  isString(value.accessibleAlternatives) &&
  isString(value.visualSyncTips);

const hasValidBaseFields = (value: UnknownRecord): boolean =>
  isStringArray(value.keywords) &&
  isString(value.educationalContext) &&
  isStringArray(value.instruments) &&
  isOptionalFieldValid(value, 'mood', isStringArray) &&
  isOptionalFieldValid(value, 'optimizedPrompt', isString);

const isMusicAnalysisResult = (value: UnknownRecord): boolean =>
  value.type === 'music' &&
  hasValidBaseFields(value) &&
  isString(value.mainGenre) &&
  isOptionalFieldValid(value, 'subGenres', isStringArray) &&
  isOptionalFieldValid(value, 'bpm', isFiniteNumber) &&
  isOptionalFieldValid(value, 'timeSignature', isString) &&
  isOptionalFieldValid(value, 'key', isString) &&
  isOptionalFieldValid(value, 'rhythmDescription', isString) &&
  isOptionalFieldValid(
    value,
    'similarTracks',
    (tracks) => Array.isArray(tracks) && tracks.every(isSimilarTrack),
  ) &&
  isOptionalFieldValid(value, 'sonicProfile', isSonicProfile) &&
  isOptionalFieldValid(value, 'multipleSongsDetected', isBoolean) &&
  isOptionalFieldValid(
    value,
    'segments',
    (segments) => Array.isArray(segments) && segments.every(isSongSegment),
  ) &&
  isOptionalFieldValid(
    value,
    'editorCuePoints',
    (cuePoints) => Array.isArray(cuePoints) && cuePoints.every(isEditorCuePoint),
  );

const isSfxAnalysisResult = (value: UnknownRecord): boolean =>
  value.type === 'sfx' && hasValidBaseFields(value) && isSfxDetails(value.sfx);

const isSeedAudioContentMode = (value: unknown): value is SeedAudioContentMode =>
  value === 'speech' || value === 'mixed' || value === 'nonverbal';

const isSeedAudioDeliveryMode = (value: unknown): value is SeedAudioDeliveryMode =>
  value === 'integrated_demo' || value === 'assembled_mix' || value === 'stems';

const isSoundPriority = (value: unknown): value is SoundPriority =>
  value === 'must' || value === 'recommended' || value === 'creative';

const isSoundRoute = (value: unknown): value is SoundRoute =>
  value === 'integrated' ||
  value === 'timed_clip' ||
  value === 'library_foley' ||
  value === 'mix_only' ||
  value === 'omit';

const isDiegeticStatus = (value: unknown): value is VideoSoundCue['diegeticStatus'] =>
  value === 'diegetic' || value === 'non_diegetic' || value === 'ambiguous';

const isVideoSoundCue = (value: unknown): value is VideoSoundCue =>
  isRecord(value) &&
  isString(value.cue) &&
  isSoundPriority(value.priority) &&
  isDiegeticStatus(value.diegeticStatus) &&
  isString(value.function) &&
  isString(value.character) &&
  isSoundRoute(value.route) &&
  isString(value.mixRisk);

const isVideoShot = (value: unknown, durationSeconds: number): value is VideoShot =>
  isRecord(value) &&
  isFiniteNumber(value.startSeconds) &&
  isFiniteNumber(value.endSeconds) &&
  value.startSeconds >= 0 &&
  value.startSeconds < value.endSeconds &&
  value.endSeconds <= durationSeconds &&
  isString(value.shotType) &&
  isString(value.cameraAngle) &&
  isString(value.cameraMovement) &&
  isString(value.transition) &&
  isString(value.visualDescription) &&
  isString(value.visibleAction) &&
  isString(value.onScreenText) &&
  isString(value.dialogue) &&
  isString(value.existingSound) &&
  isVideoSoundCue(value.soundCue);

const isVideoSegmentation = (value: unknown): value is VideoSegmentation =>
  isRecord(value) &&
  (value.mode === 'shot' || value.mode === 'sequence') &&
  isString(value.note) &&
  value.note.trim().length > 0 &&
  (value.detection === undefined ||
    (isRecord(value.detection) &&
      value.detection.method === 'two_stage' &&
      isFiniteNumber(value.detection.sampleRateFps) &&
      value.detection.sampleRateFps > 0 &&
      typeof value.detection.detectedCuts === 'number' &&
      Number.isInteger(value.detection.detectedCuts) &&
      value.detection.detectedCuts >= 0 &&
      (value.detection.confidence === 'high' ||
        value.detection.confidence === 'medium' ||
        value.detection.confidence === 'low')));

const SEED_AUDIO_AUTHORING_HEADING =
  /\b(?:Mode|Speaker\s*\/\s*VO|Timeline|Music|SFX\s*\/\s*Ambience|Mix|Avoid)\s*:/i;

const isSeedAudioBrief = (value: unknown): value is SeedAudioBrief =>
  isRecord(value) &&
  isSeedAudioDeliveryMode(value.recommendedMode) &&
  isSeedAudioContentMode(value.contentMode) &&
  isString(value.projectContext) &&
  isString(value.speakerVo) &&
  isString(value.music) &&
  isString(value.sfxAmbience) &&
  isString(value.mix) &&
  isStringArray(value.avoid) &&
  isString(value.textPrompt) &&
  value.textPrompt.length <= 2048 &&
  !SEED_AUDIO_AUTHORING_HEADING.test(value.textPrompt);

const isEditRecommendationCategory = (value: unknown): value is EditRecommendationCategory =>
  value === 'structure' ||
  value === 'pacing' ||
  value === 'cut' ||
  value === 'continuity' ||
  value === 'transition' ||
  value === 'color' ||
  value === 'vfx' ||
  value === 'motion_graphics' ||
  value === 'typography' ||
  value === 'branding';

const isEditPriority = (value: unknown): value is EditPriority =>
  value === 'high' || value === 'medium' || value === 'low';

const isVideoTimeRange = (
  startSeconds: unknown,
  endSeconds: unknown,
  durationSeconds: number,
): startSeconds is number =>
  isFiniteNumber(startSeconds) &&
  isFiniteNumber(endSeconds) &&
  startSeconds >= 0 &&
  startSeconds < endSeconds &&
  endSeconds <= durationSeconds;

const isVideoRhythmPoint = (value: unknown, durationSeconds: number): value is VideoRhythmPoint =>
  isRecord(value) &&
  isVideoTimeRange(value.startSeconds, value.endSeconds, durationSeconds) &&
  isInteger(value.intensity) &&
  value.intensity >= 1 &&
  value.intensity <= 5 &&
  isString(value.label) &&
  isString(value.description);

const isVideoEditRecommendation = (
  value: unknown,
  durationSeconds: number,
): value is VideoEditRecommendation =>
  isRecord(value) &&
  isVideoTimeRange(value.startSeconds, value.endSeconds, durationSeconds) &&
  isEditRecommendationCategory(value.category) &&
  isEditPriority(value.priority) &&
  isString(value.evidence) &&
  isString(value.action) &&
  isString(value.expectedImpact);

const VIDEO_TIME_EPSILON_SECONDS = 1e-3;

const isContinuousVideoRhythm = (
  value: unknown,
  durationSeconds: number,
): value is VideoRhythmPoint[] => {
  if (!Array.isArray(value) || value.length === 0) return false;

  let previousEnd = 0;
  for (const point of value) {
    if (
      !isVideoRhythmPoint(point, durationSeconds) ||
      Math.abs(point.startSeconds - previousEnd) > VIDEO_TIME_EPSILON_SECONDS
    ) {
      return false;
    }
    previousEnd = point.endSeconds;
  }

  return Math.abs(previousEnd - durationSeconds) <= VIDEO_TIME_EPSILON_SECONDS;
};

const isVideoEditReview = (value: unknown, durationSeconds: number): value is VideoEditReview => {
  if (!isRecord(value) || !isRecord(value.visualFinish)) return false;

  const rhythm = value.rhythm;
  const recommendations = value.recommendations;

  return (
    isStringArray(value.strengths) &&
    isStringArray(value.topIssues) &&
    isString(value.rhythmSummary) &&
    isContinuousVideoRhythm(rhythm, durationSeconds) &&
    isString(value.visualFinish.compositionAndContinuity) &&
    isString(value.visualFinish.colorAndExposure) &&
    isString(value.visualFinish.vfxAndMotion) &&
    isString(value.visualFinish.typographyAndBranding) &&
    Array.isArray(recommendations) &&
    recommendations.length > 0 &&
    recommendations.every((recommendation) =>
      isVideoEditRecommendation(recommendation, durationSeconds),
    )
  );
};

const hasContinuousShotTimeline = (shots: VideoShot[], durationSeconds: number): boolean => {
  if (shots.length === 0 || Math.abs(shots[0].startSeconds) > VIDEO_TIME_EPSILON_SECONDS) {
    return false;
  }

  for (let index = 1; index < shots.length; index += 1) {
    if (
      Math.abs(shots[index].startSeconds - shots[index - 1].endSeconds) > VIDEO_TIME_EPSILON_SECONDS
    ) {
      return false;
    }
  }

  return (
    Math.abs(shots[shots.length - 1].endSeconds - durationSeconds) <= VIDEO_TIME_EPSILON_SECONDS
  );
};

const isVideoAnalysisResult = (value: UnknownRecord): boolean => {
  const durationSeconds = value.durationSeconds;
  const shots = value.shots;

  if (
    value.type !== 'video' ||
    !isString(value.title) ||
    !isString(value.summary) ||
    !isFiniteNumber(durationSeconds) ||
    durationSeconds <= 0 ||
    !isString(value.narrativeArc) ||
    !isStringArray(value.visualStyle) ||
    !isStringArray(value.keywords) ||
    !isVideoSegmentation(value.segmentation) ||
    !Array.isArray(shots) ||
    !isVideoEditReview(value.editReview, durationSeconds) ||
    !isOptionalFieldValid(value, 'seedAudio', isSeedAudioBrief) ||
    !isStringArray(value.risks)
  ) {
    return false;
  }

  if (!shots.every((shot) => isVideoShot(shot, durationSeconds))) return false;

  return hasContinuousShotTimeline(shots, durationSeconds);
};

export const isAnalysisResult = (value: unknown, mode?: AnalysisMode): value is AnalysisResult => {
  if (!isRecord(value)) return false;
  if (mode !== undefined && value.type !== mode) return false;
  return isMusicAnalysisResult(value) || isSfxAnalysisResult(value) || isVideoAnalysisResult(value);
};

export enum AnalysisState {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  CONVERTING = 'CONVERTING',
  ANALYZING = 'ANALYZING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR',
}

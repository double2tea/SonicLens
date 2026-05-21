export interface SonicProfile {
  energy: number;      // 0-100
  happiness: number;   // 0-100
  acousticness: number;// 0-100
  instrumental: number;// 0-100
  intensity: number;   // 0-100
}

export interface SongSegment {
  timestamp: string;   // e.g. "00:00 - 02:15"
  genre: string;       // Genre of this specific segment
  mood: string;        // Mood of this specific segment
  description: string; // Detailed analysis
  // New granular fields
  bpm?: number;
  key?: string;
  instruments?: string[];
}

export interface SimilarTrack {
  artist: string;
  title: string;
}

export interface EditorCuePoint {
  timestamp: string;   // e.g. "00:15"
  eventName: string;   // e.g. "高潮 (Drop)"
  vibeChange: string;  // e.g. "打击乐加入，能量变强"
  visualAdvice: string;// e.g. "适合做画面快速切面(Fast Cuts)或卡点转场"
}

export interface SfxDetails {
  name: string;
  ucsCatId: string;      // e.g. "WODCreak"
  ucsCategory: string;   // e.g. "Wood"
  ucsSubCategory: string;// e.g. "Creak"
  foleyInstructions: string;
  accessibleAlternatives: string;
  visualSyncTips?: string; // 画面同步卡点技巧 (音画对齐建议)
}

export interface MusicAnalysisResult {
  type: 'music' | 'sfx'; // Discriminator
  
  // Common
  keywords: string[];
  optimizedPrompt?: string; // AI Generation Prompt
  
  // Music Specific (Optional/Nullable if sfx)
  mainGenre?: string;
  subGenres?: string[];
  bpm?: number;
  timeSignature?: string;
  key?: string;
  mood?: string[];
  instruments?: string[];
  rhythmDescription?: string;
  educationalContext?: string; 
  similarTracks?: SimilarTrack[];
  sonicProfile?: SonicProfile;
  multipleSongsDetected?: boolean;
  segments?: SongSegment[];
  editorCuePoints?: EditorCuePoint[]; // 专为视频剪辑设计的卡点时间轴

  // SFX Specific
  sfx?: SfxDetails;
}

export enum AnalysisState {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  CONVERTING = 'CONVERTING',
  ANALYZING = 'ANALYZING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}
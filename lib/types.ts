export type JobStatus =
  | 'idle'
  | 'planning'
  | 'generating-instruments'
  | 'synthesizing-vocals'
  | 'mixing-mastering'
  | 'rendering-video'
  | 'finalizing'
  | 'complete'
  | 'error'
  | 'cancelled';

export type VideoStyle = 'lyric' | 'official' | 'abstract';

export type DrumPattern = {
  kick: (number | null)[];
  snare: (number | null)[];
  hihat: (number | null)[];
}

export type SynthLine = {
  pattern: 'pads' | 'arpeggio-up' | 'arpeggio-down';
  timbre: 'warm' | 'bright' | 'dark' | 'glassy';
}

export type LeadMelodyNote = {
  note: string;
  duration: number;
  ornamentation: 'none' | 'light' | 'heavy';
}

export type Effects = {
  reverb: number;
  compressionThreshold: number;
  stereoWidth: number;
}

export type Section = {
  name: string;
  sectionType: 'intro' | 'verse' | 'chorus' | 'bridge' | 'breakdown' | 'drop' | 'outro';
  durationBars: number;
  chordProgression: string[];
  drumPattern: DrumPattern;
  synthLine: SynthLine;
  leadMelody: LeadMelodyNote[];
  effects: Effects;
  lyrics?: string;
}

export type Stems = {
    vocals: boolean;
    drums: boolean;
    bass: boolean;
    instruments: boolean;
}

export type CuePoints = {
    introEnd: number;
    dropStart: number;
    outroStart: number;
}

export type MusicPlan = {
  title: string;
  genre: string;
  bpm: number;
  key: string;
  overallStructure: string;
  vocalStyle: string;
  lyrics: string;
  randomSeed: number;
  sections: Section[];
  stems: Stems;
  cuePoints: CuePoints;
}

export type AuditResult = {
  lyricsSung: boolean;
  isUnique: boolean;
  styleFaithful: boolean;
  djStructure: boolean;
  masteringApplied: boolean;
  passed: boolean;
  feedback: string;
}

export type FinalPlan = {
  plan: MusicPlan;
  lyricsAlignment?: { time: string; line: string }[];
  conditioningString: string;
  videoStoryboard?: Partial<Record<VideoStyle, string>>;
}

export type Job = {
  id: string;
  status: JobStatus;
  progress: number;
  message: string;
  finalPlan: FinalPlan | null;
  conditioningString: string | null;
  rca: string | null;
  totalEta?: number;
  step?: number;
  totalSteps?: number;
  audioUrl?: string | null;
  videoUrls?: Partial<Record<VideoStyle, string>> | null;
  // Fields for logging
  prompt: string;
  genres: string[];
  duration: number;
  artists: string[];
  languages?: string[];
  lyrics: string;
  generateVideo: boolean;
  videoStyles: VideoStyle[];
  createdAt: string;
}

export type JobLog = Job;

// Types for the Toast system
export type Toast = { 
  id: number; 
  message: string; 
  type: 'success' | 'error'; 
};

export type ToastContextValue = {
  addToast: (message: string, type: 'success' | 'error') => void;
  removeToast: (id: number) => void;
  toasts: Toast[];
};

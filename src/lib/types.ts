export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export interface StoryMeta {
  id: string;
  title: string;
  level: CefrLevel;
  ageRange?: [number, number];
  tags?: string[];
  author?: string;
}

export interface Story extends StoryMeta {
  sentences: string[];
}

export interface AttemptRecord {
  sentenceIndex: number;
  score: number;
  transcript?: string;
  at: string;
}

export interface StoryProgress {
  storyId: string;
  completed: boolean;
  currentSentenceIndex: number;
  fluencyLevel?: CefrLevel;
  averageScore?: number;
  attempts: AttemptRecord[];
  lastOpenedAt: string;
}

export interface ProgressState {
  version: 1;
  stories: Record<string, StoryProgress>;
}

export interface Student {
  id: string;
  name: string;
  avatarColor: string;
  createdAt: string;
}

export type VoiceQuality = "local" | "neural";
export type ScoringMode = "local" | "azure";
export type TranslationSource = "azure" | "none";

export interface Settings {
  voiceQuality: VoiceQuality;
  scoringMode: ScoringMode;
  translationSource: TranslationSource;
  ttsRate: number;
}

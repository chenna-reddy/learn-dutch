import { writable, get } from "svelte/store";
import type {
  AttemptRecord,
  CefrLevel,
  ProgressState,
  StoryProgress,
} from "../types";

const STORAGE_KEY = "learn-dutch:progress:v1";

function loadInitial(): ProgressState {
  if (typeof localStorage === "undefined") {
    return { version: 1, stories: {} };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 1, stories: {} };
    const parsed = JSON.parse(raw) as ProgressState;
    if (parsed.version !== 1) return { version: 1, stories: {} };
    return parsed;
  } catch {
    return { version: 1, stories: {} };
  }
}

const state = writable<ProgressState>(loadInitial());

state.subscribe((value) => {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
});

export const progressStore = { subscribe: state.subscribe };

function ensureStory(
  s: ProgressState,
  storyId: string
): StoryProgress {
  if (!s.stories[storyId]) {
    s.stories[storyId] = {
      storyId,
      completed: false,
      currentSentenceIndex: 0,
      attempts: [],
      lastOpenedAt: new Date().toISOString(),
    };
  }
  return s.stories[storyId];
}

export function getStoryProgress(storyId: string): StoryProgress | undefined {
  return get(state).stories[storyId];
}

export function markOpened(storyId: string): void {
  state.update((s) => {
    const p = ensureStory(s, storyId);
    p.lastOpenedAt = new Date().toISOString();
    return { ...s };
  });
}

export function setCurrentSentence(storyId: string, index: number): void {
  state.update((s) => {
    const p = ensureStory(s, storyId);
    p.currentSentenceIndex = Math.max(0, index);
    return { ...s };
  });
}

export function setCompleted(storyId: string, completed: boolean): void {
  state.update((s) => {
    const p = ensureStory(s, storyId);
    p.completed = completed;
    return { ...s };
  });
}

function scoreToLevel(avg: number): CefrLevel {
  if (avg >= 90) return "C1";
  if (avg >= 80) return "B2";
  if (avg >= 70) return "B1";
  if (avg >= 55) return "A2";
  return "A1";
}

export function recordAttempt(
  storyId: string,
  attempt: AttemptRecord
): StoryProgress {
  let updated: StoryProgress | null = null;
  state.update((s) => {
    const p = ensureStory(s, storyId);
    p.attempts = [...p.attempts.slice(-49), attempt];
    const total = p.attempts.reduce((sum, a) => sum + a.score, 0);
    p.averageScore = Math.round(total / p.attempts.length);
    p.fluencyLevel = scoreToLevel(p.averageScore);
    updated = p;
    return { ...s };
  });
  return updated!;
}

export function resetProgress(): void {
  state.set({ version: 1, stories: {} });
}

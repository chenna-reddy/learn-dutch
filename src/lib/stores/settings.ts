import { writable } from "svelte/store";
import type { Settings } from "../types";

const STORAGE_KEY = "learn-dutch:settings:v1";

const defaults: Settings = {
  voiceQuality: "local",
  scoringMode: "local",
  ttsRate: 0.75,
};

function loadInitial(): Settings {
  if (typeof localStorage === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return defaults;
  }
}

export const settingsStore = writable<Settings>(loadInitial());

settingsStore.subscribe((value) => {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignore
  }
});

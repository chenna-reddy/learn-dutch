import { init, register, getLocaleFromNavigator, locale } from "svelte-i18n";

register("en", () => import("./en.json"));
register("nl", () => import("./nl.json"));

const STORAGE_KEY = "learn-dutch:locale";

const saved =
  typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;

init({
  fallbackLocale: "en",
  initialLocale: saved || getLocaleFromNavigator() || "en",
});

export function setLocale(newLocale: "en" | "nl"): void {
  locale.set(newLocale);
  try {
    localStorage.setItem(STORAGE_KEY, newLocale);
  } catch {
    // ignore
  }
}

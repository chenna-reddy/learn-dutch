import { auth } from "../firebase"

const CACHE_KEY = "learn-dutch:translations:v1"

interface TranslationCache {
  [word: string]: string
}

function loadCache(): TranslationCache {
  if (typeof localStorage === "undefined") return {}
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as TranslationCache) : {}
  } catch {
    return {}
  }
}

function saveCache(cache: TranslationCache): void {
  if (typeof localStorage === "undefined") return
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // ignore quota
  }
}

let cache = loadCache()

export function stripPunctuation(word: string): string {
  return word.replace(/^[^\p{L}\p{N}]+/u, "").replace(/[^\p{L}\p{N}]+$/u, "")
}

export function getCached(word: string): string | undefined {
  return cache[word.toLowerCase()]
}

export async function translateWord(word: string): Promise<string> {
  const clean = stripPunctuation(word)
  const key = clean.toLowerCase()
  if (!key) return ""

  const cached = cache[key]
  if (cached !== undefined) return cached

  const user = auth.currentUser
  if (!user) throw new Error("not_signed_in")
  const idToken = await user.getIdToken()

  const res = await fetch("/api/translate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ word: clean }),
  })

  if (!res.ok) {
    throw new Error(`translate_failed: ${res.status}`)
  }

  const data = (await res.json()) as { translated?: string }
  const translated = data.translated ?? ""
  cache[key] = translated
  saveCache(cache)
  return translated
}

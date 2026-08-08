import { writable, get } from "svelte/store"
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore"
import { db } from "../firebase"
import { user } from "./auth"
import { activeStudent } from "./students"
import type { AttemptRecord, CefrLevel, ProgressState, StoryProgress } from "../types"

const LEGACY_KEYS = ["learn-dutch:progress:v1"]

if (typeof localStorage !== "undefined") {
  for (const key of LEGACY_KEYS) {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key)
    }
  }
}

const state = writable<ProgressState>({ version: 1, stories: {} })

export const progressStore = { subscribe: state.subscribe }

let unsub: (() => void) | null = null
let currentUid: string | null = null
let currentStudentId: string | null = null

function progressCollection(uid: string, studentId: string) {
  return collection(db, "users", uid, "students", studentId, "progress")
}

function mapDoc(id: string, data: any): StoryProgress {
  return {
    storyId: id,
    completed: !!data?.completed,
    currentSentenceIndex: Number(data?.currentSentenceIndex ?? 0),
    fluencyLevel: data?.fluencyLevel as CefrLevel | undefined,
    averageScore: typeof data?.averageScore === "number" ? data.averageScore : undefined,
    attempts: Array.isArray(data?.attempts) ? data.attempts : [],
    lastOpenedAt: data?.lastOpenedAt ?? new Date().toISOString(),
  }
}

function stopSubscription() {
  if (unsub) {
    unsub()
    unsub = null
  }
  state.set({ version: 1, stories: {} })
}

function startSubscription(uid: string, studentId: string) {
  stopSubscription()
  currentUid = uid
  currentStudentId = studentId
  const col = progressCollection(uid, studentId)
  unsub = onSnapshot(
    col,
    (snap) => {
      const stories: Record<string, StoryProgress> = {}
      snap.docs.forEach((d) => {
        stories[d.id] = mapDoc(d.id, d.data())
      })
      state.set({ version: 1, stories })
    },
    (err) => {
      console.warn("progress snapshot failed", err)
    }
  )
}

let lastUid: string | null = null
user.subscribe((u) => {
  lastUid = u?.uid ?? null
  if (!u) {
    currentUid = null
    currentStudentId = null
    stopSubscription()
  }
})

activeStudent.subscribe((student) => {
  if (!lastUid || !student) {
    currentUid = null
    currentStudentId = null
    stopSubscription()
    return
  }
  if (currentUid === lastUid && currentStudentId === student.id) return
  startSubscription(lastUid, student.id)
})

export function getStoryProgress(storyId: string): StoryProgress | undefined {
  return get(state).stories[storyId]
}

function progressDocRef(storyId: string) {
  if (!currentUid || !currentStudentId) return null
  return doc(db, "users", currentUid, "students", currentStudentId, "progress", storyId)
}

async function upsert(storyId: string, update: Partial<StoryProgress>): Promise<void> {
  const ref = progressDocRef(storyId)
  if (!ref) return
  const existing = get(state).stories[storyId]
  const merged: StoryProgress = {
    storyId,
    completed: existing?.completed ?? false,
    currentSentenceIndex: existing?.currentSentenceIndex ?? 0,
    attempts: existing?.attempts ?? [],
    fluencyLevel: existing?.fluencyLevel,
    averageScore: existing?.averageScore,
    lastOpenedAt: existing?.lastOpenedAt ?? new Date().toISOString(),
    ...update,
  }
  const payload: Record<string, unknown> = {
    completed: merged.completed,
    currentSentenceIndex: merged.currentSentenceIndex,
    attempts: merged.attempts,
    lastOpenedAt: merged.lastOpenedAt,
    updatedAt: serverTimestamp(),
  }
  if (merged.fluencyLevel !== undefined) payload.fluencyLevel = merged.fluencyLevel
  if (merged.averageScore !== undefined) payload.averageScore = merged.averageScore
  try {
    await setDoc(ref, payload, { merge: true })
  } catch (err) {
    console.warn("progress upsert failed", err)
  }
}

export function markOpened(storyId: string): void {
  upsert(storyId, { lastOpenedAt: new Date().toISOString() })
}

export function setCurrentSentence(storyId: string, index: number): void {
  upsert(storyId, { currentSentenceIndex: Math.max(0, index) })
}

export function setCompleted(storyId: string, completed: boolean): void {
  upsert(storyId, { completed })
}

function scoreToLevel(avg: number): CefrLevel {
  if (avg >= 90) return "C1"
  if (avg >= 80) return "B2"
  if (avg >= 70) return "B1"
  if (avg >= 55) return "A2"
  return "A1"
}

export function recordAttempt(storyId: string, attempt: AttemptRecord): void {
  const existing = get(state).stories[storyId]
  const attempts = [...(existing?.attempts ?? []).slice(-49), attempt]
  const total = attempts.reduce((sum, a) => sum + a.score, 0)
  const avg = Math.round(total / attempts.length)
  upsert(storyId, {
    attempts,
    averageScore: avg,
    fluencyLevel: scoreToLevel(avg),
  })
}

export async function resetProgress(): Promise<void> {
  if (!currentUid || !currentStudentId) return
  const stories = get(state).stories
  const batch = writeBatch(db)
  for (const storyId of Object.keys(stories)) {
    const ref = doc(
      db,
      "users",
      currentUid,
      "students",
      currentStudentId,
      "progress",
      storyId
    )
    batch.delete(ref)
  }
  try {
    await batch.commit()
  } catch (err) {
    console.warn("resetProgress failed", err)
  }
}

export async function deleteSingleProgress(storyId: string): Promise<void> {
  const ref = progressDocRef(storyId)
  if (!ref) return
  try {
    await deleteDoc(ref)
  } catch (err) {
    console.warn("deleteSingleProgress failed", err)
  }
}

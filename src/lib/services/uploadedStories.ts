import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore"
import { db } from "../firebase"
import { splitSentences } from "./stories"
import type { Story, CefrLevel } from "../types"

export function uploadedStoriesCollection(uid: string, studentId: string) {
  return collection(db, "users", uid, "students", studentId, "uploadedStories")
}

export interface UploadedStoryDoc {
  title: string
  content: string
  level: CefrLevel
  sentences: string[]
  createdAt: Timestamp
}

export function mapUploadedStoryDoc(id: string, data: any): Story {
  const createdAt =
    data?.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString()
  return {
    id,
    title: String(data?.title ?? ""),
    level: (data?.level as CefrLevel) ?? "A1",
    sentences: Array.isArray(data?.sentences) ? data.sentences : [],
  }
}

export async function loadUploadedStories(
  uid: string,
  studentId: string
): Promise<Story[]> {
  const q = query(
    uploadedStoriesCollection(uid, studentId),
    orderBy("createdAt", "desc")
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => mapUploadedStoryDoc(d.id, d.data()))
}

export async function loadUploadedStory(
  uid: string,
  studentId: string,
  storyId: string
): Promise<Story | undefined> {
  const ref = doc(db, "users", uid, "students", studentId, "uploadedStories", storyId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return undefined
  return mapUploadedStoryDoc(snap.id, snap.data())
}

export function subscribeUploadedStories(
  uid: string,
  studentId: string,
  callback: (stories: Story[]) => void
): () => void {
  const q = query(
    uploadedStoriesCollection(uid, studentId),
    orderBy("createdAt", "desc")
  )
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => mapUploadedStoryDoc(d.id, d.data())))
    },
    (err) => {
      console.warn("uploadedStories snapshot failed", err)
    }
  )
}

export async function createUploadedStory(
  uid: string,
  studentId: string,
  title: string,
  content: string,
  level: CefrLevel
): Promise<void> {
  const trimmed = content.trim()
  if (!trimmed) throw new Error("content_required")
  const sentences = splitSentences(trimmed)
  await addDoc(uploadedStoriesCollection(uid, studentId), {
    title: title.trim() || "Untitled",
    content: trimmed,
    level,
    sentences,
    createdAt: serverTimestamp(),
  })
}

export async function deleteUploadedStory(
  uid: string,
  studentId: string,
  storyId: string
): Promise<void> {
  await deleteDoc(
    doc(db, "users", uid, "students", studentId, "uploadedStories", storyId)
  )
}

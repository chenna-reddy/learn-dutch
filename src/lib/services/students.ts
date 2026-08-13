import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore"
import { db } from "../firebase"
import type { Student } from "../types"

const AVATAR_COLORS = [
  "#0b6bcb",
  "#22c55e",
  "#ff9f43",
  "#a855f7",
  "#ec4899",
  "#0ea5e9",
  "#f97316",
  "#14b8a6",
]

export function pickAvatarColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

export function studentsCollection(uid: string) {
  return collection(db, "users", uid, "students")
}

export async function ensureUserAndDefaultStudent(
  uid: string,
  displayName: string | null | undefined,
  email: string | null | undefined
): Promise<void> {
  const userRef = doc(db, "users", uid)
  await setDoc(
    userRef,
    {
      displayName: displayName ?? "",
      email: email ?? "",
      createdAt: serverTimestamp(),
    },
    { merge: true }
  )
  const students = await getDocs(studentsCollection(uid))
  if (students.empty) {
    const name = (displayName || email || "Kid").split("@")[0]
    await addDoc(studentsCollection(uid), {
      name,
      avatarColor: pickAvatarColor(name),
      createdAt: serverTimestamp(),
    })
  }
}

export async function createStudent(
  uid: string,
  name: string,
  grade?: Student["grade"]
): Promise<void> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error("name_required")
  const payload: Record<string, unknown> = {
    name: trimmed,
    avatarColor: pickAvatarColor(trimmed),
    createdAt: serverTimestamp(),
  }
  if (grade != null) payload.grade = grade
  await addDoc(studentsCollection(uid), payload)
}

export async function renameStudent(
  uid: string,
  studentId: string,
  name: string,
  grade?: Student["grade"]
): Promise<void> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error("name_required")
  const payload: Record<string, unknown> = { name: trimmed }
  if (grade !== undefined) payload.grade = grade ?? null
  await updateDoc(doc(db, "users", uid, "students", studentId), payload)
}

export async function deleteStudent(uid: string, studentId: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "students", studentId))
}

export function mapStudentDoc(id: string, data: any): Student {
  const createdAt =
    data?.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString()
  const grade = data?.grade ?? null
  return {
    id,
    name: String(data?.name ?? ""),
    grade: grade === "g4" || grade === "g7" ? grade : null,
    avatarColor: String(data?.avatarColor ?? pickAvatarColor(id)),
    createdAt,
  }
}

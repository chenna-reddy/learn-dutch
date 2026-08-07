import { writable, derived, get } from "svelte/store";
import { onSnapshot, query, orderBy } from "firebase/firestore";
import { user } from "./auth";
import {
  ensureUserAndDefaultStudent,
  mapStudentDoc,
  studentsCollection,
} from "../services/students";
import type { Student } from "../types";

const ACTIVE_KEY = "learn-dutch:activeStudent";

const studentsStore = writable<Student[]>([]);
const activeIdStore = writable<string | null>(
  typeof localStorage !== "undefined" ? localStorage.getItem(ACTIVE_KEY) : null
);
const loadingStore = writable(false);

activeIdStore.subscribe((id) => {
  if (typeof localStorage === "undefined") return;
  if (id) {
    localStorage.setItem(ACTIVE_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_KEY);
  }
});

let unsub: (() => void) | null = null;

user.subscribe(async (u) => {
  if (unsub) {
    unsub();
    unsub = null;
  }
  if (!u) {
    studentsStore.set([]);
    return;
  }
  loadingStore.set(true);
  try {
    await ensureUserAndDefaultStudent(u.uid, u.displayName, u.email);
  } catch (err) {
    console.warn("ensureUserAndDefaultStudent failed", err);
  }

  const q = query(studentsCollection(u.uid), orderBy("createdAt", "asc"));
  unsub = onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => mapStudentDoc(d.id, d.data()));
      studentsStore.set(list);
      const currentActive = get(activeIdStore);
      if (!currentActive || !list.find((s) => s.id === currentActive)) {
        activeIdStore.set(list[0]?.id ?? null);
      }
      loadingStore.set(false);
    },
    (err) => {
      console.warn("students snapshot failed", err);
      loadingStore.set(false);
    }
  );
});

export const students = { subscribe: studentsStore.subscribe };
export const studentsLoading = { subscribe: loadingStore.subscribe };
export const activeStudentId = {
  subscribe: activeIdStore.subscribe,
  set: (id: string | null) => activeIdStore.set(id),
};

export const activeStudent = derived(
  [studentsStore, activeIdStore],
  ([$students, $activeId]) =>
    $students.find((s) => s.id === $activeId) ?? $students[0] ?? null
);

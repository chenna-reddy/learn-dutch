import { writable, derived } from "svelte/store";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { auth } from "../firebase";

const userStore = writable<User | null>(null);
const readyStore = writable(false);

onAuthStateChanged(auth, (u) => {
  userStore.set(u);
  readyStore.set(true);
});

export const user = { subscribe: userStore.subscribe };
export const authReady = { subscribe: readyStore.subscribe };
export const isSignedIn = derived(userStore, (u) => u !== null);

export async function signInWithGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  await signInWithPopup(auth, provider);
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<void> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    await updateProfile(cred.user, { displayName });
  }
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

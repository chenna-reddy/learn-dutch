import { auth } from "../firebase";

interface TokenResponse {
  token: string;
  region: string;
  expiresInSeconds: number;
}

interface CachedToken {
  token: string;
  region: string;
  expiresAt: number;
}

let cached: CachedToken | null = null;
let pending: Promise<CachedToken> | null = null;

const TOKEN_URL = "/api/token";

export async function fetchSpeechToken(): Promise<CachedToken> {
  const now = Date.now();
  if (cached && cached.expiresAt - now > 30_000) return cached;
  if (pending) return pending;

  pending = (async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("not_signed_in");
    const idToken = await currentUser.getIdToken();
    const res = await fetch(TOKEN_URL, {
      method: "GET",
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`);
    const data = (await res.json()) as TokenResponse;
    cached = {
      token: data.token,
      region: data.region,
      expiresAt: Date.now() + Math.max(60, data.expiresInSeconds) * 1000,
    };
    return cached;
  })();

  try {
    return await pending;
  } finally {
    pending = null;
  }
}

export function clearCachedToken(): void {
  cached = null;
}

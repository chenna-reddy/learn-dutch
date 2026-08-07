import type { Settings } from "../types";
import { fetchSpeechToken } from "./azureAuth";

let cachedVoices: SpeechSynthesisVoice[] | null = null;

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const existing = window.speechSynthesis.getVoices();
    if (existing.length > 0) {
      cachedVoices = existing;
      resolve(existing);
      return;
    }
    const handler = () => {
      cachedVoices = window.speechSynthesis.getVoices();
      window.speechSynthesis.removeEventListener("voiceschanged", handler);
      resolve(cachedVoices);
    };
    window.speechSynthesis.addEventListener("voiceschanged", handler);
    setTimeout(() => {
      if (!cachedVoices) {
        cachedVoices = window.speechSynthesis.getVoices();
        resolve(cachedVoices);
      }
    }, 800);
  });
}

async function pickDutchVoice(): Promise<SpeechSynthesisVoice | undefined> {
  const voices = cachedVoices ?? (await loadVoices());
  return (
    voices.find((v) => v.lang === "nl-NL") ||
    voices.find((v) => v.lang.startsWith("nl")) ||
    voices.find((v) => /dutch|nederlands/i.test(v.name))
  );
}

export interface SpeakOptions {
  text: string;
  rate?: number;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
}

export interface SpeakResult {
  source: "local" | "neural";
  voiceName: string;
  rate: number;
  requested: "local" | "neural";
  fallbackReason?: string;
}

export function stopSpeaking(): void {
  if (typeof window === "undefined") return;
  window.speechSynthesis.cancel();
}

export async function speakLocal(
  opts: SpeakOptions
): Promise<{ voiceName: string; rate: number }> {
  stopSpeaking();
  const utter = new SpeechSynthesisUtterance(opts.text);
  utter.lang = "nl-NL";
  const rate = Math.max(0.4, Math.min(2, opts.rate ?? 0.75));
  utter.rate = rate;
  utter.pitch = 1;
  const voice = await pickDutchVoice();
  if (voice) utter.voice = voice;
  const voiceName = voice
    ? `${voice.name} (${voice.lang})`
    : "browser default";
  if (opts.onEnd) utter.onend = () => opts.onEnd?.();
  if (opts.onError) utter.onerror = (e) => opts.onError?.(e);
  window.speechSynthesis.speak(utter);
  console.info("[TTS] local voice:", voiceName, "rate:", rate);
  return { voiceName, rate };
}

const NEURAL_VOICE = "nl-NL-FennaNeural";

async function speakNeural(
  opts: SpeakOptions
): Promise<{ voiceName: string; rate: number }> {
  const { token, region } = await fetchSpeechToken();
  const rate = opts.rate ?? 0.75;
  const ratePct = Math.round((rate - 1) * 100);
  const rateAttr = ratePct >= 0 ? `+${ratePct}%` : `${ratePct}%`;
  const ssml = `<?xml version="1.0" encoding="UTF-8"?>
    <speak version="1.0" xml:lang="nl-NL">
      <voice name="${NEURAL_VOICE}">
        <prosody rate="${rateAttr}">${escapeXml(opts.text)}</prosody>
      </voice>
    </speak>`;
  const res = await fetch(
    `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3",
      },
      body: ssml,
    }
  );
  if (!res.ok) throw new Error(`Azure TTS failed: HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  const blob = new Blob([buf], { type: "audio/mpeg" });
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.onended = () => {
    URL.revokeObjectURL(url);
    opts.onEnd?.();
  };
  audio.onerror = (e) => opts.onError?.(e);
  await audio.play();
  console.info("[TTS] Azure Neural voice:", NEURAL_VOICE, "rate:", rate);
  return { voiceName: `${NEURAL_VOICE} (Azure)`, rate };
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function speak(
  opts: SpeakOptions,
  settings: Settings
): Promise<SpeakResult> {
  const requested = settings.voiceQuality;
  if (requested === "neural") {
    try {
      const r = await speakNeural({ ...opts, rate: settings.ttsRate });
      return {
        source: "neural",
        voiceName: r.voiceName,
        rate: r.rate,
        requested,
      };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.warn("[TTS] Neural failed, falling back to local:", reason);
      const r = await speakLocal({ ...opts, rate: settings.ttsRate });
      return {
        source: "local",
        voiceName: r.voiceName,
        rate: r.rate,
        requested,
        fallbackReason: reason,
      };
    }
  }
  const r = await speakLocal({ ...opts, rate: settings.ttsRate });
  return {
    source: "local",
    voiceName: r.voiceName,
    rate: r.rate,
    requested,
  };
}

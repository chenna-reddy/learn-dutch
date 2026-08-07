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

export function stopSpeaking(): void {
  if (typeof window === "undefined") return;
  window.speechSynthesis.cancel();
}

export async function speakLocal(opts: SpeakOptions): Promise<void> {
  stopSpeaking();
  const utter = new SpeechSynthesisUtterance(opts.text);
  utter.lang = "nl-NL";
  utter.rate = Math.max(0.4, Math.min(2, opts.rate ?? 0.75));
  utter.pitch = 1;
  const voice = await pickDutchVoice();
  if (voice) utter.voice = voice;
  if (opts.onEnd) utter.onend = () => opts.onEnd?.();
  if (opts.onError) utter.onerror = (e) => opts.onError?.(e);
  window.speechSynthesis.speak(utter);
}

async function speakNeural(opts: SpeakOptions): Promise<void> {
  const { token, region } = await fetchSpeechToken();
  const rate = opts.rate ?? 0.75;
  const ratePct = Math.round((rate - 1) * 100);
  const rateAttr = ratePct >= 0 ? `+${ratePct}%` : `${ratePct}%`;
  const ssml = `<?xml version="1.0" encoding="UTF-8"?>
    <speak version="1.0" xml:lang="nl-NL">
      <voice name="nl-NL-FennaNeural">
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
  if (!res.ok) throw new Error(`Azure TTS failed: ${res.status}`);
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
): Promise<void> {
  if (settings.voiceQuality === "neural") {
    try {
      await speakNeural({ ...opts, rate: settings.ttsRate });
      return;
    } catch (err) {
      console.warn("Neural TTS failed, falling back to local", err);
    }
  }
  await speakLocal({ ...opts, rate: settings.ttsRate });
}

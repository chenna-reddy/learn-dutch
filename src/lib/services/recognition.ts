import type { Settings } from "../types"
import { scoreLocally, type LocalScore } from "./scoring"
import { fetchSpeechToken } from "./azureAuth"

interface SpeechRecognitionResultLike {
  transcript: string
  confidence: number
  isFinal?: boolean
}

// Web Speech API TypeScript shims (browser prefixed types are not in lib.dom)
interface WSR {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((ev: any) => void) | null
  onerror: ((ev: any) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

function getWebSpeechCtor(): (new () => WSR) | null {
  const w = window as any
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

export function webSpeechSupported(): boolean {
  return getWebSpeechCtor() !== null
}

export interface FluencyResult {
  score: number
  accuracy: number
  completeness: number
  fluency?: number
  prosody?: number
  wordMatches: { expected: string; matched: boolean }[]
  transcript: string
  source: "local" | "azure"
}

export interface PartialUpdate {
  transcript: string
  matchedWordCount: number
  totalWordCount: number
}

export interface RecognitionOptions {
  onPartial?: (update: PartialUpdate) => void
}

export interface RecognitionHandle {
  stop(): void
  promise: Promise<FluencyResult>
}

const MIN_LISTEN_MS = 800

function countMatchesRoughly(expected: string, transcript: string): number {
  if (!transcript) return 0
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\p{L}\s'-]/gu, " ")
      .split(/\s+/)
      .filter(Boolean)
  const expectedWords = norm(expected)
  const spokenSet = new Set(norm(transcript))
  return expectedWords.filter((w) => spokenSet.has(w)).length
}

function recognizeWithWebSpeech(
  expected: string,
  opts: RecognitionOptions
): RecognitionHandle {
  const Ctor = getWebSpeechCtor()
  if (!Ctor) throw new Error("Web Speech API not supported in this browser")

  const expectedWordCount = expected
    .toLowerCase()
    .replace(/[^\p{L}\s'-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean).length

  const recognizer = new Ctor()
  recognizer.lang = "nl-NL"
  recognizer.continuous = true
  recognizer.interimResults = true
  recognizer.maxAlternatives = 1

  let userStopped = false
  let finalTranscript = ""
  let interimTranscript = ""
  let startedAt = 0
  let stopped = false
  let resolved = false

  const promise = new Promise<FluencyResult>((resolve, reject) => {
    const finish = () => {
      if (resolved) return
      resolved = true
      const combined = (finalTranscript + " " + interimTranscript).trim()
      const local: LocalScore = scoreLocally(expected, combined)
      resolve({
        score: local.score,
        accuracy: local.accuracy,
        completeness: local.completeness,
        wordMatches: local.wordMatches,
        transcript: local.transcript,
        source: "local",
      })
    }

    recognizer.onstart = () => {
      startedAt = Date.now()
    }

    recognizer.onresult = (event: any) => {
      interimTranscript = ""
      const results = event.results as any
      for (let i = event.resultIndex ?? 0; i < results.length; i++) {
        const result = results[i]
        const alt = result[0] as SpeechRecognitionResultLike
        if (result.isFinal) {
          finalTranscript += alt.transcript + " "
        } else {
          interimTranscript += alt.transcript + " "
        }
      }
      const combined = (finalTranscript + " " + interimTranscript).trim()
      opts.onPartial?.({
        transcript: combined,
        matchedWordCount: countMatchesRoughly(expected, combined),
        totalWordCount: expectedWordCount,
      })
    }

    recognizer.onerror = (event: any) => {
      const code = event?.error ?? "recognition_error"
      if (code === "no-speech" || code === "aborted") {
        return
      }
      resolved = true
      reject(new Error(code))
    }

    recognizer.onend = () => {
      const elapsed = Date.now() - startedAt
      if (!userStopped && !stopped && elapsed < 30_000) {
        try {
          recognizer.start()
          return
        } catch {
          // fall through and finish
        }
      }
      finish()
    }

    try {
      recognizer.start()
    } catch (err) {
      reject(err)
    }
  })

  return {
    stop: () => {
      const elapsed = Date.now() - startedAt
      if (elapsed < MIN_LISTEN_MS) {
        setTimeout(() => {
          userStopped = true
          stopped = true
          try {
            recognizer.stop()
          } catch {
            // ignore
          }
        }, MIN_LISTEN_MS - elapsed)
        return
      }
      userStopped = true
      stopped = true
      try {
        recognizer.stop()
      } catch {
        // ignore
      }
    },
    promise,
  }
}

async function recognizeWithAzure(
  expected: string,
  _opts: RecognitionOptions
): Promise<RecognitionHandle> {
  const { token, region } = await fetchSpeechToken()
  const sdk = await import("microsoft-cognitiveservices-speech-sdk")

  const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(token, region)
  speechConfig.speechRecognitionLanguage = "nl-NL"
  speechConfig.setProperty(
    sdk.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs,
    "3000"
  )
  speechConfig.setProperty(
    sdk.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs,
    "8000"
  )

  const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput()
  const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig)

  const pronunciationConfig = new sdk.PronunciationAssessmentConfig(
    expected,
    sdk.PronunciationAssessmentGradingSystem.HundredMark,
    sdk.PronunciationAssessmentGranularity.Word,
    true
  )
  pronunciationConfig.enableProsodyAssessment = true
  pronunciationConfig.applyTo(recognizer)

  const promise = new Promise<FluencyResult>((resolve, reject) => {
    recognizer.recognizeOnceAsync(
      (result: any) => {
        try {
          const json = JSON.parse(
            result.properties.getProperty(
              sdk.PropertyId.SpeechServiceResponse_JsonResult
            ) || "{}"
          )
          const nb = json?.NBest?.[0]
          const pa = nb?.PronunciationAssessment ?? {}
          const words: any[] = nb?.Words ?? []

          const wordMatches = words.map((w: any) => ({
            expected: String(w.Word ?? ""),
            matched:
              (w.PronunciationAssessment?.AccuracyScore ?? 0) >= 60 &&
              w.PronunciationAssessment?.ErrorType !== "Omission",
          }))

          resolve({
            score: Math.round(pa.PronScore ?? pa.AccuracyScore ?? 0),
            accuracy: Math.round(pa.AccuracyScore ?? 0),
            completeness: Math.round(pa.CompletenessScore ?? 0),
            fluency: Math.round(pa.FluencyScore ?? 0),
            prosody: Math.round(pa.ProsodyScore ?? 0),
            wordMatches,
            transcript: result.text ?? "",
            source: "azure",
          })
        } catch (err) {
          reject(err)
        } finally {
          recognizer.close()
        }
      },
      (err: any) => {
        recognizer.close()
        reject(new Error(String(err)))
      }
    )
  })

  return {
    stop: () => {
      try {
        recognizer.stopContinuousRecognitionAsync()
      } catch {
        // ignore
      }
    },
    promise,
  }
}

export async function recognize(
  expected: string,
  settings: Settings,
  opts: RecognitionOptions = {}
): Promise<RecognitionHandle> {
  if (settings.scoringMode === "azure") {
    try {
      return await recognizeWithAzure(expected, opts)
    } catch (err) {
      console.warn("Azure scoring failed, falling back to Web Speech", err)
    }
  }
  return recognizeWithWebSpeech(expected, opts)
}

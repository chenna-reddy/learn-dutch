import { onRequest } from "firebase-functions/v2/https"
import { defineSecret } from "firebase-functions/params"
import { logger } from "firebase-functions"
import { initializeApp, getApps } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"

if (getApps().length === 0) {
  initializeApp()
}

const AZURE_SPEECH_KEY = defineSecret("AZURE_SPEECH_KEY")
const AZURE_SPEECH_REGION = defineSecret("AZURE_SPEECH_REGION")
const AZURE_TRANSLATOR_KEY = defineSecret("AZURE_TRANSLATOR_KEY")
const AZURE_TRANSLATOR_REGION = defineSecret("AZURE_TRANSLATOR_REGION")
const AZURE_TRANSLATOR_BASE_URL = defineSecret("AZURE_TRANSLATOR_BASE_URL")

export const getSpeechToken = onRequest(
  {
    region: "europe-west3",
    secrets: [AZURE_SPEECH_KEY, AZURE_SPEECH_REGION],
    cors: true,
    maxInstances: 10,
    invoker: "public",
  },
  async (req, res) => {
    try {
      const authHeader = req.get("authorization") || ""
      const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
      if (!idToken) {
        res.status(401).json({ error: "unauthenticated" })
        return
      }
      try {
        await getAuth().verifyIdToken(idToken)
      } catch (err) {
        logger.warn("Invalid ID token", err)
        res.status(401).json({ error: "invalid_token" })
        return
      }

      const region = AZURE_SPEECH_REGION.value()
      const key = AZURE_SPEECH_KEY.value()

      const upstream = await fetch(
        `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
        {
          method: "POST",
          headers: {
            "Ocp-Apim-Subscription-Key": key,
            "Content-Length": "0",
          },
        }
      )

      if (!upstream.ok) {
        logger.error("Azure token request failed", { status: upstream.status })
        res.status(502).json({ error: "token_failed" })
        return
      }

      const token = await upstream.text()
      res.set("Cache-Control", "no-store")
      res.json({ token, region, expiresInSeconds: 540 })
    } catch (err) {
      logger.error("Unexpected error minting speech token", err)
      res.status(500).json({ error: "internal" })
    }
  }
)

export const translateWord = onRequest(
  {
    region: "europe-west3",
    secrets: [AZURE_TRANSLATOR_KEY, AZURE_TRANSLATOR_REGION, AZURE_TRANSLATOR_BASE_URL],
    cors: true,
    maxInstances: 10,
    invoker: "public",
  },
  async (req, res) => {
    try {
      const authHeader = req.get("authorization") || ""
      const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
      if (!idToken) {
        res.status(401).json({ error: "unauthenticated" })
        return
      }
      try {
        await getAuth().verifyIdToken(idToken)
      } catch (err) {
        logger.warn("Invalid ID token", err)
        res.status(401).json({ error: "invalid_token" })
        return
      }

      const body = req.body
      const word = typeof body === "string" ? JSON.parse(body).word : (body?.word ?? "")
      if (!word || typeof word !== "string") {
        res.status(400).json({ error: "word_required" })
        return
      }

      const key = AZURE_TRANSLATOR_KEY.value()
      const region = AZURE_TRANSLATOR_REGION.value()
      const base = AZURE_TRANSLATOR_BASE_URL.value() || "api"
      const endpoint = `https://${base}.cognitive.microsofttranslator.com/translate?api-version=3.0&from=nl&to=en`

      const headers: Record<string, string> = {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/json",
      }
      if (region) {
        headers["Ocp-Apim-Subscription-Region"] = region
      }

      const upstream = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify([{ Text: word }]),
      })

      if (!upstream.ok) {
        logger.error("Azure translation failed", { status: upstream.status })
        res.status(502).json({ error: "translation_failed" })
        return
      }

      const data = (await upstream.json()) as any[]
      const translated = data?.[0]?.translations?.[0]?.text ?? ""
      res.json({ word, translated })
    } catch (err) {
      logger.error("Unexpected error translating", err)
      res.status(500).json({ error: "internal" })
    }
  }
)

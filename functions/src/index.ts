import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

if (getApps().length === 0) {
  initializeApp();
}

const AZURE_SPEECH_KEY = defineSecret("AZURE_SPEECH_KEY");
const AZURE_SPEECH_REGION = defineSecret("AZURE_SPEECH_REGION");

export const getSpeechToken = onRequest(
  {
    region: "europe-west3",
    secrets: [AZURE_SPEECH_KEY, AZURE_SPEECH_REGION],
    cors: true,
    maxInstances: 10,
  },
  async (req, res) => {
    try {
      const authHeader = req.get("authorization") || "";
      const idToken = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : "";
      if (!idToken) {
        res.status(401).json({ error: "unauthenticated" });
        return;
      }
      try {
        await getAuth().verifyIdToken(idToken);
      } catch (err) {
        logger.warn("Invalid ID token", err);
        res.status(401).json({ error: "invalid_token" });
        return;
      }

      const region = AZURE_SPEECH_REGION.value();
      const key = AZURE_SPEECH_KEY.value();

      const upstream = await fetch(
        `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
        {
          method: "POST",
          headers: {
            "Ocp-Apim-Subscription-Key": key,
            "Content-Length": "0",
          },
        }
      );

      if (!upstream.ok) {
        logger.error("Azure token request failed", { status: upstream.status });
        res.status(502).json({ error: "token_failed" });
        return;
      }

      const token = await upstream.text();
      res.set("Cache-Control", "no-store");
      res.json({ token, region, expiresInSeconds: 540 });
    } catch (err) {
      logger.error("Unexpected error minting speech token", err);
      res.status(500).json({ error: "internal" });
    }
  }
);

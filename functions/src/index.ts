import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";

const AZURE_SPEECH_KEY = defineSecret("AZURE_SPEECH_KEY");
const AZURE_SPEECH_REGION = defineSecret("AZURE_SPEECH_REGION");

export const getSpeechToken = onRequest(
  {
    secrets: [AZURE_SPEECH_KEY, AZURE_SPEECH_REGION],
    cors: true,
    maxInstances: 10,
  },
  async (_req, res) => {
    try {
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

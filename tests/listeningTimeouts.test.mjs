import assert from "node:assert/strict"
import test from "node:test"
import { getListeningTimeouts } from "../src/lib/services/listeningTimeouts.ts"

test("longer sentences get more time to speak and pause", () => {
  const short = getListeningTimeouts("Hallo.")
  const long = getListeningTimeouts(
    "Ik wil vandaag een lang verhaal vertellen over de dieren in het bos."
  )

  assert.equal(short.wordCount, 1)
  assert.equal(long.wordCount, 13)
  assert.ok(long.maxListenMs > short.maxListenMs)
  assert.ok(long.initialSilenceMs > short.initialSilenceMs)
  assert.ok(long.endSilenceMs > short.endSilenceMs)
})

test("punctuation does not count as words and timeouts stay bounded", () => {
  assert.equal(getListeningTimeouts("Hallo, wereld!").wordCount, 2)
  assert.equal(getListeningTimeouts("...").wordCount, 0)

  const veryLong = getListeningTimeouts("woord ".repeat(100))
  assert.equal(veryLong.maxListenMs, 120_000)
  assert.equal(veryLong.initialSilenceMs, 15_000)
  assert.equal(veryLong.endSilenceMs, 5_000)
})

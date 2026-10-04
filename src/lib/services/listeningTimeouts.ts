export function getListeningTimeouts(expected: string) {
  const wordCount = expected
    .replace(/[^\p{L}\s'-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean).length

  return {
    wordCount,
    maxListenMs: Math.min(120_000, 12_000 + wordCount * 2_500),
    initialSilenceMs: Math.min(15_000, 8_000 + wordCount * 250),
    endSilenceMs: Math.min(5_000, 3_000 + wordCount * 150),
  }
}

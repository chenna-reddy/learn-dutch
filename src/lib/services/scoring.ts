function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\s'-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[a.length][b.length];
}

export interface WordMatch {
  expected: string;
  matched: boolean;
}

export interface LocalScore {
  score: number;
  accuracy: number;
  completeness: number;
  wordMatches: WordMatch[];
  transcript: string;
}

export function scoreLocally(
  expected: string,
  transcript: string
): LocalScore {
  const expectedWords = normalize(expected);
  const spokenWords = normalize(transcript);
  const spokenSet = new Set(spokenWords);

  const wordMatches: WordMatch[] = expectedWords.map((w) => {
    if (spokenSet.has(w)) return { expected: w, matched: true };
    const closest = [...spokenSet].some((s) => {
      const dist = levenshtein(s, w);
      return dist <= Math.max(1, Math.floor(w.length * 0.25));
    });
    return { expected: w, matched: closest };
  });

  const matched = wordMatches.filter((m) => m.matched).length;
  const completeness = expectedWords.length
    ? matched / expectedWords.length
    : 0;

  const expectedJoined = expectedWords.join(" ");
  const spokenJoined = spokenWords.join(" ");
  const distance = levenshtein(expectedJoined, spokenJoined);
  const maxLen = Math.max(expectedJoined.length, spokenJoined.length, 1);
  const accuracy = 1 - distance / maxLen;

  const score = Math.round(
    Math.max(0, Math.min(100, (accuracy * 0.6 + completeness * 0.4) * 100))
  );

  return {
    score,
    accuracy: Math.round(accuracy * 100),
    completeness: Math.round(completeness * 100),
    wordMatches,
    transcript,
  };
}

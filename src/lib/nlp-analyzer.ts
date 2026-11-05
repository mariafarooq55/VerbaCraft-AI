import type {
  ArticleAnalysis,
  RepeatedTerm,
  SentenceBreakdown,
  VocabularyMetrics,
} from "@/types/article";

const STOPWORDS = new Set([
  "the", "and", "for", "that", "this", "with", "from", "your", "have", "more",
  "will", "are", "was", "were", "been", "being", "into", "about", "than", "then",
  "them", "they", "their", "there", "what", "when", "where", "which", "while",
  "who", "whom", "whose", "why", "how", "can", "could", "should", "would", "may",
  "might", "must", "shall", "not", "only", "also", "very", "just", "over", "under",
  "such", "some", "many", "most", "other", "each", "every", "both", "through",
  "between", "after", "before", "during", "without", "within", "across", "because",
  "however", "therefore", "thus", "unto", "onto", "upon", "these", "those", "its",
  "our", "you", "his", "her", "out", "all", "any", "one", "two", "new", "use",
  "used", "using", "make", "made", "like", "well", "even", "back", "still", "way",
  "https", "http", "www", "com", "org", "edu", "jpeg", "png", "pexels", "images",
  "auto", "compress", "tinysrgb", "fit", "crop", "youtube", "watch",
]);

export const AI_CLICHE_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bdelve(?:s|d)? into\b/gi, label: "delve into" },
  { pattern: /\bin today['’]s fast-paced (?:world|landscape|era)\b/gi, label: "in today's fast-paced world" },
  { pattern: /\bmoreover\b/gi, label: "moreover" },
  { pattern: /\bfurthermore\b/gi, label: "furthermore" },
  { pattern: /\bit is (?:important|crucial|essential|worth) to (?:note|remember|understand)\b/gi, label: "it is important to note" },
  { pattern: /\brich tapestry\b|\btapestry of\b/gi, label: "tapestry of" },
  { pattern: /\btestament to\b/gi, label: "testament to" },
  { pattern: /\bunlock(?:ing)? the (?:full )?potential\b/gi, label: "unlock the full potential" },
  { pattern: /\bgame-changer\b|\bgame changer\b/gi, label: "game-changer" },
  { pattern: /\bseamless(?:ly)? integrat(?:e|ion|ing)\b/gi, label: "seamless integration" },
  { pattern: /\bparadigm shift\b/gi, label: "paradigm shift" },
  { pattern: /\bin conclusion\b/gi, label: "in conclusion" },
  { pattern: /\bat the end of the day\b/gi, label: "at the end of the day" },
  { pattern: /\bleverag(?:e|ing) cutting-edge\b/gi, label: "leveraging cutting-edge" },
  { pattern: /\bnavigat(?:e|ing) the complex(?:ities)?\b/gi, label: "navigating the complexities" },
  { pattern: /\bholistic approach\b/gi, label: "holistic approach" },
  { pattern: /\bfoster(?:ing)? innovation\b/gi, label: "fostering innovation" },
  { pattern: /\bpave(?:s|d)? the way\b/gi, label: "pave the way" },
  { pattern: /\bundeniably\b/gi, label: "undeniably" },
  { pattern: /\bin summary\b/gi, label: "in summary" },
];

export function stripMarkdownForAnalysis(markdown: string): string {
  return markdown
    // Remove markdown image syntax completely so URLs don't skew word metrics
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    // Replace markdown links [text](url) with just text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove HTML tags if any
    .replace(/<[^>]+>/g, " ")
    // Remove heading hashes, blockquotes, bold/italic markers, code ticks
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/[*_`~]/g, "")
    // Remove horizontal rules
    .replace(/^-{3,}$/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function countSyllables(word: string): number {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!cleaned) return 0;
  if (cleaned.length <= 3) return 1;

  const adjusted = cleaned
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
    .replace(/^y/, "");

  const vowelGroups = adjusted.match(/[aeiouy]{1,2}/g);
  return Math.max(1, vowelGroups ? vowelGroups.length : 1);
}

export function analyzeArticleContent(
  markdown: string,
  targetKeywords: string[] = []
): ArticleAnalysis {
  const rawParagraphs = markdown
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(
      (p) =>
        p.length > 0 &&
        !p.startsWith("![") &&
        !p.startsWith("---") &&
        !p.startsWith("```")
    );

  const plainText = stripMarkdownForAnalysis(markdown);
  const words = plainText.match(/[A-Za-z0-9'’-]+/g) ?? [];
  const cleanWords = words
    .map((w) => w.replace(/^['’-]+|['’-]+$/g, ""))
    .filter((w) => w.length > 0);

  const wordCount = cleanWords.length;
  const characterCount = plainText.length;
  const paragraphCount = Math.max(1, rawParagraphs.length);

  // Split sentences carefully
  const rawSentences = plainText
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"“'])/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 2);

  const sentenceCount = Math.max(1, rawSentences.length);
  const readingTimeMinutes = Math.max(1, Math.round((wordCount / 225) * 10) / 10);

  // Syllable & vocabulary analysis
  let totalSyllables = 0;
  let complexWordCount = 0;
  let totalWordChars = 0;
  const freqMap = new Map<string, number>();
  const uniqueSet = new Set<string>();

  for (const rawWord of cleanWords) {
    const lower = rawWord.toLowerCase();
    uniqueSet.add(lower);
    totalWordChars += lower.length;

    const syl = countSyllables(lower);
    totalSyllables += syl;
    if (syl >= 3 && !lower.endsWith("ing") && !lower.endsWith("ed")) {
      complexWordCount += 1;
    }

    if (lower.length >= 4 && !STOPWORDS.has(lower) && !/^\d+$/.test(lower)) {
      freqMap.set(lower, (freqMap.get(lower) ?? 0) + 1);
    }
  }

  const safeWords = Math.max(1, wordCount);
  const avgWordsPerSentence = Math.round((safeWords / sentenceCount) * 10) / 10;
  const avgSyllablesPerWord = totalSyllables / safeWords;

  // Flesch Reading Ease & Flesch-Kincaid Grade
  const rawFre =
    206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
  const fleschReadingEase = Math.round(
    Math.max(5, Math.min(98, rawFre)) * 10
  ) / 10;

  const rawFk =
    0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;
  const fleschKincaidGrade = Math.round(
    Math.max(3, Math.min(18, rawFk)) * 10
  ) / 10;

  let readabilityLabel = "Standard Editorial";
  if (fleschReadingEase >= 70) readabilityLabel = "Effortless & Conversational";
  else if (fleschReadingEase >= 58) readabilityLabel = "Clear Editorial Prose";
  else if (fleschReadingEase >= 45) readabilityLabel = "Analytical / Professional";
  else readabilityLabel = "Dense / Academic";

  // Sentence structure & burstiness (coefficient of variation of sentence lengths)
  let shortCount = 0;
  let mediumCount = 0;
  let longCount = 0;
  let veryLongCount = 0;
  const sentenceLengths: number[] = [];

  for (const sent of rawSentences) {
    const len = (sent.match(/[A-Za-z0-9'’-]+/g) ?? []).length;
    sentenceLengths.push(len);
    if (len <= 10) shortCount++;
    else if (len <= 22) mediumCount++;
    else if (len <= 34) longCount++;
    else veryLongCount++;
  }

  let stdDev = 0;
  if (sentenceLengths.length > 1) {
    const mean =
      sentenceLengths.reduce((acc, v) => acc + v, 0) / sentenceLengths.length;
    const variance =
      sentenceLengths.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) /
      sentenceLengths.length;
    stdDev = Math.sqrt(variance);
  }

  // Coefficient of variation mapped to 0-100 burstiness score
  const cv = avgWordsPerSentence > 0 ? stdDev / avgWordsPerSentence : 0;
  const burstinessScore = Math.round(Math.min(98, Math.max(18, cv * 145)));

  // Passive voice estimate
  const passiveMatches =
    plainText.match(
      /\b(?:is|are|was|were|be|been|being)\s+(?:\w+ly\s+)?\w+(?:ed|en|wn|t)\b/gi
    ) ?? [];
  const passiveVoiceEstimate = Math.min(
    100,
    Math.round((passiveMatches.length / sentenceCount) * 100)
  );

  const sentenceStructure: SentenceBreakdown = {
    shortCount,
    mediumCount,
    longCount,
    veryLongCount,
    avgWordsPerSentence,
    burstinessScore,
    passiveVoiceEstimate,
  };

  // Vocabulary metrics
  const uniqueWords = uniqueSet.size;
  const typeTokenRatio = Math.round((uniqueWords / safeWords) * 1000) / 10;
  const complexWordPercent =
    Math.round((complexWordCount / safeWords) * 1000) / 10;
  const avgWordLength = Math.round((totalWordChars / safeWords) * 10) / 10;

  let lexicalGrade: VocabularyMetrics["lexicalGrade"] = "Balanced";
  if (complexWordPercent >= 20) lexicalGrade = "Academic";
  else if (complexWordPercent >= 13) lexicalGrade = "Rich Editorial";
  else if (complexWordPercent <= 8) lexicalGrade = "Accessible";

  const vocabulary: VocabularyMetrics = {
    uniqueWords,
    typeTokenRatio,
    complexWordCount,
    complexWordPercent,
    avgWordLength,
    lexicalGrade,
  };

  // Repeated terms
  const repeatedTerms: RepeatedTerm[] = Array.from(freqMap.entries())
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([term, count]) => {
      const densityPercent = Math.round((count / safeWords) * 1000) / 10;
      return {
        term,
        count,
        densityPercent,
        isOverused: densityPercent > 1.8 || count >= 9,
      };
    });

  // Repeated bigrams/trigrams
  const bigramCounts = new Map<string, number>();
  const lowerClean = cleanWords.map((w) => w.toLowerCase());
  for (let i = 0; i < lowerClean.length - 2; i++) {
    const w1 = lowerClean[i];
    const w2 = lowerClean[i + 1];
    const w3 = lowerClean[i + 2];
    if (!STOPWORDS.has(w1) && !STOPWORDS.has(w3) && w1.length > 3 && w3.length > 3) {
      const phrase = `${w1} ${w2} ${w3}`;
      bigramCounts.set(phrase, (bigramCounts.get(phrase) ?? 0) + 1);
    }
  }
  const repeatedPhrases = Array.from(bigramCounts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([phrase, count]) => ({ phrase, count }));

  // AI clichés detection
  const aiClichésDetected: string[] = [];
  for (const { pattern, label } of AI_CLICHE_PATTERNS) {
    const matches = plainText.match(pattern);
    if (matches && matches.length > 0) {
      aiClichésDetected.push(
        matches.length > 1 ? `${label} (×${matches.length})` : label
      );
    }
  }

  // Keyword coverage
  const lowerFull = plainText.toLowerCase();
  const dedupedKeywords = Array.from(
    new Set(targetKeywords.map((k) => k.trim()).filter(Boolean))
  );
  const keywordCoverage = dedupedKeywords.map((keyword) => {
    const escaped = keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "gi");
    const matches = lowerFull.match(regex);
    const count = matches ? matches.length : 0;
    return {
      keyword,
      count,
      present: count > 0,
    };
  });

  // Human Naturalness Score (0 - 100)
  const clichePenalty = Math.min(38, aiClichésDetected.length * 5.5);
  const overusePenalty = Math.min(
    15,
    repeatedTerms.filter((t) => t.isOverused).length * 4
  );
  const passivePenalty = Math.max(0, (passiveVoiceEstimate - 18) * 0.4);
  const readabilityContribution =
    fleschReadingEase >= 52 && fleschReadingEase <= 78 ? 28 : 19;
  const burstinessContribution = Math.min(38, burstinessScore * 0.45);
  const diversityContribution = Math.min(26, typeTokenRatio * 0.48);

  const rawNaturalness =
    12 +
    readabilityContribution +
    burstinessContribution +
    diversityContribution -
    clichePenalty -
    overusePenalty -
    passivePenalty;

  const humanNaturalnessScore = Math.round(
    Math.max(24, Math.min(97, rawNaturalness))
  );

  return {
    wordCount,
    characterCount,
    paragraphCount,
    sentenceCount,
    readingTimeMinutes,
    fleschReadingEase,
    fleschKincaidGrade,
    readabilityLabel,
    humanNaturalnessScore,
    aiClichésDetected,
    repeatedTerms,
    repeatedPhrases,
    sentenceStructure,
    vocabulary,
    keywordCoverage,
  };
}

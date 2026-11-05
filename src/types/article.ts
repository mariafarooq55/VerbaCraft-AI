export interface TitleCandidate {
  id: string;
  title: string;
  hookType: string;
  seoScore: number;
  rationale: string;
}

export interface GuidedQuestion {
  id: string;
  question: string;
  placeholder: string;
  helperText: string;
  answer: string;
}

export interface OutlineSection {
  id: string;
  heading: string;
  level: "H2" | "H3";
  keyPoints: string[];
  estimatedWords: number;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  included: boolean;
}

export interface MediaImage {
  id: string;
  url: string;
  alt: string;
  caption: string;
  photographer: string;
  placement: "cover" | "inline";
  selected: boolean;
}

export interface MediaVideo {
  id: string;
  title: string;
  channel: string;
  duration: string;
  embedUrl: string;
  watchUrl: string;
  thumbnailUrl: string;
  summary: string;
  selected: boolean;
}

export interface ExternalReference {
  id: string;
  title: string;
  url: string;
  domain: string;
  authorityType: "Research" | "Industry Report" | "Documentation" | "Editorial";
  snippet: string;
  selected: boolean;
}

export interface RepeatedTerm {
  term: string;
  count: number;
  densityPercent: number;
  isOverused: boolean;
}

export interface SentenceBreakdown {
  shortCount: number; // <= 10 words
  mediumCount: number; // 11 - 22 words
  longCount: number; // 23 - 34 words
  veryLongCount: number; // >= 35 words
  avgWordsPerSentence: number;
  burstinessScore: number; // 0 - 100 (higher = more natural human variation)
  passiveVoiceEstimate: number;
}

export interface VocabularyMetrics {
  uniqueWords: number;
  typeTokenRatio: number; // 0 - 100%
  complexWordCount: number;
  complexWordPercent: number;
  avgWordLength: number;
  lexicalGrade: "Accessible" | "Balanced" | "Rich Editorial" | "Academic";
}

export interface ArticleAnalysis {
  wordCount: number;
  characterCount: number;
  paragraphCount: number;
  sentenceCount: number;
  readingTimeMinutes: number;
  fleschReadingEase: number; // 0 - 100
  fleschKincaidGrade: number;
  readabilityLabel: string;
  humanNaturalnessScore: number; // 0 - 100
  aiClichésDetected: string[];
  repeatedTerms: RepeatedTerm[];
  repeatedPhrases: { phrase: string; count: number }[];
  sentenceStructure: SentenceBreakdown;
  vocabulary: VocabularyMetrics;
  keywordCoverage: { keyword: string; count: number; present: boolean }[];
}

export interface ArticleRecord {
  id: string;
  userId?: string;
  slug: string;
  topic: string;
  fixedTitle: string;
  category: string;
  audience: string;
  tone: string;
  purpose: string;
  targetWordCount: number;
  guidedAnswers: Record<string, string>;
  aiKeywords: string[];
  userKeywords: string[];
  outline: OutlineSection[];
  faqs: FaqItem[];
  selectedImages: MediaImage[];
  selectedVideos: MediaVideo[];
  selectedLinks: ExternalReference[];
  rawDraft: string;
  humanizedDraft: string;
  finalContent: string;
  beforeAnalysis: ArticleAnalysis;
  afterAnalysis: ArticleAnalysis;
  humanizationStyle: string;
  storageBackend: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudioSessionState {
  currentStep: number;
  topic: string;
  titleCandidates: TitleCandidate[];
  fixedTitle: string;
  isTitleLocked: boolean;
  guidedQuestions: GuidedQuestion[];
  category: string;
  audience: string;
  tone: string;
  targetWordCount: number;
  purpose: string;
  aiKeywords: string[];
  selectedAiKeywords: string[];
  userKeywords: string[];
  outline: OutlineSection[];
  faqs: FaqItem[];
  images: MediaImage[];
  videos: MediaVideo[];
  links: ExternalReference[];
  rawDraft: string;
  humanizedDraft: string;
  finalContent: string;
  humanizationStyle: string;
  humanizationIntensity: "light" | "balanced" | "deep";
  beforeAnalysis: ArticleAnalysis | null;
  afterAnalysis: ArticleAnalysis | null;
  liveAnalysis: ArticleAnalysis | null;
  savedArticleId: string | null;
}

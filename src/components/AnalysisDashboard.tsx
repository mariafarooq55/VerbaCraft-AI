"use client";

import React from "react";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Repeat,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { ArticleAnalysis } from "@/types/article";

interface AnalysisDashboardProps {
  analysis: ArticleAnalysis;
  baselineAnalysis?: ArticleAnalysis | null;
  title?: string;
}

function DeltaPill({
  current,
  previous,
  inverse = false,
  suffix = "",
}: {
  current: number;
  previous?: number;
  inverse?: boolean;
  suffix?: string;
}) {
  if (previous === undefined || previous === null) return null;
  const diff = Math.round((current - previous) * 10) / 10;
  if (diff === 0) {
    return (
      <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-[#242936] text-zinc-600 dark:text-[#A1A7B5]">
        no change
      </span>
    );
  }
  const isPositiveGood = inverse ? diff < 0 : diff > 0;
  return (
    <span
      className={`text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded ${
        isPositiveGood
          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
          : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
      }`}
    >
      {diff > 0 ? `+${diff}` : diff}
      {suffix}
    </span>
  );
}

const WORD_GRADE_LABELS: Record<string, string> = {
  Accessible: "Simple words",
  Balanced: "Balanced",
  "Rich Editorial": "Rich",
  Academic: "Advanced",
};

export function AnalysisDashboard({
  analysis,
  baselineAnalysis,
  title = "Writing quality check",
}: AnalysisDashboardProps) {
  const totalSentences = Math.max(
    1,
    analysis.sentenceStructure.shortCount +
      analysis.sentenceStructure.mediumCount +
      analysis.sentenceStructure.longCount +
      analysis.sentenceStructure.veryLongCount
  );

  const shortPct = Math.round(
    (analysis.sentenceStructure.shortCount / totalSentences) * 100
  );
  const medPct = Math.round(
    (analysis.sentenceStructure.mediumCount / totalSentences) * 100
  );
  const longPct = Math.round(
    (analysis.sentenceStructure.longCount / totalSentences) * 100
  );
  const vLongPct = Math.max(0, 100 - shortPct - medPct - longPct);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#C84B31] dark:text-[#E06348]" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#18181B] dark:text-[#F4F4F6]">
              {title}
            </h3>
          </div>
          <p className="text-xs text-[#71717A] dark:text-[#8E96A8] mt-1">
            A simple report card for your writing. Green numbers are good; the
            tips below each score explain what to do next.
          </p>
        </div>
        <div className="text-xs font-mono text-[#52525B] dark:text-[#A1A7B5]">
          {analysis.paragraphCount} paragraphs · {analysis.sentenceCount}{" "}
          sentences · about {analysis.readingTimeMinutes} min to read
        </div>
      </div>

      {/* Primary scores */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-[#FAF8F5]/70 dark:bg-[#1B1E26] border border-[#E6E1D8] dark:border-[#262A34] rounded-xl p-4">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-medium text-[#52525B] dark:text-[#A1A7B5]">
              Sounds human
            </span>
            <DeltaPill
              current={analysis.humanNaturalnessScore}
              previous={baselineAnalysis?.humanNaturalnessScore}
              suffix=" pts"
            />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-bold text-[#15803D] dark:text-emerald-400">
              {analysis.humanNaturalnessScore}
            </span>
            <span className="text-xs font-mono text-[#71717A] dark:text-[#7F8799]">
              / 100
            </span>
          </div>
          <div className="mt-2 w-full h-1.5 rounded-full bg-[#E6E1D8] dark:bg-[#2A2F3D] overflow-hidden">
            <div
              className="h-full bg-[#15803D] dark:bg-emerald-400 rounded-full transition-all"
              style={{ width: `${analysis.humanNaturalnessScore}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-[#52525B] dark:text-[#A1A7B5]">
            70 or higher reads like a person wrote it.
          </p>
        </div>

        <div className="bg-[#FAF8F5]/70 dark:bg-[#1B1E26] border border-[#E6E1D8] dark:border-[#262A34] rounded-xl p-4">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-medium text-[#52525B] dark:text-[#A1A7B5]">
              Easy to read
            </span>
            <DeltaPill
              current={analysis.fleschReadingEase}
              previous={baselineAnalysis?.fleschReadingEase}
            />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-[#18181B] dark:text-[#F4F4F6]">
              {analysis.fleschReadingEase}
            </span>
            <span className="text-xs font-mono text-[#71717A] dark:text-[#7F8799]">
              school level ~{analysis.fleschKincaidGrade}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-[#52525B] dark:text-[#A1A7B5]">
            {analysis.readabilityLabel}. Aim for 55–75 for a general audience.
          </p>
        </div>

        <div className="bg-[#FAF8F5]/70 dark:bg-[#1B1E26] border border-[#E6E1D8] dark:border-[#262A34] rounded-xl p-4">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-medium text-[#52525B] dark:text-[#A1A7B5]">
              Sentence variety
            </span>
            <DeltaPill
              current={analysis.sentenceStructure.burstinessScore}
              previous={baselineAnalysis?.sentenceStructure.burstinessScore}
            />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-bold text-[#3730A3] dark:text-indigo-400">
              {analysis.sentenceStructure.burstinessScore}
            </span>
            <span className="text-xs font-mono text-[#71717A] dark:text-[#7F8799]">
              / 100
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-[#52525B] dark:text-[#A1A7B5]">
            About {analysis.sentenceStructure.avgWordsPerSentence} words per
            sentence. Mix short and long lines.
          </p>
        </div>

        <div className="bg-[#FAF8F5]/70 dark:bg-[#1B1E26] border border-[#E6E1D8] dark:border-[#262A34] rounded-xl p-4">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-medium text-[#52525B] dark:text-[#A1A7B5]">
              Robotic phrases
            </span>
            <DeltaPill
              current={analysis.aiClichésDetected.length}
              previous={baselineAnalysis?.aiClichésDetected.length}
              inverse
              suffix=" found"
            />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-[#18181B] dark:text-[#F4F4F6]">
              {analysis.wordCount.toLocaleString()}
            </span>
            <span className="text-xs font-mono text-[#71717A] dark:text-[#7F8799]">
              words
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-[#52525B] dark:text-[#A1A7B5]">
            {analysis.aiClichésDetected.length === 0
              ? "None found — nice and natural."
              : `${analysis.aiClichésDetected.length} to remove in step 7.`}
          </p>
        </div>
      </div>

      {/* Sentence mix + word choice */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#181B22] border border-[#E6E1D8] dark:border-[#262A34] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#18181B] dark:text-[#F4F4F6] flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#3730A3] dark:text-indigo-400" />
              Sentence length mix
            </span>
            <span className="text-xs font-mono text-[#52525B] dark:text-[#A1A7B5]">
              Passive voice: {analysis.sentenceStructure.passiveVoiceEstimate}%
            </span>
          </div>

          <div className="h-3 w-full rounded-full overflow-hidden flex bg-[#F3EFE8] dark:bg-[#252A36]">
            {shortPct > 0 && (
              <div
                style={{ width: `${shortPct}%` }}
                className="bg-emerald-500"
                title={`Short: ${analysis.sentenceStructure.shortCount}`}
              />
            )}
            {medPct > 0 && (
              <div
                style={{ width: `${medPct}%` }}
                className="bg-indigo-500"
                title={`Medium: ${analysis.sentenceStructure.mediumCount}`}
              />
            )}
            {longPct > 0 && (
              <div
                style={{ width: `${longPct}%` }}
                className="bg-amber-500"
                title={`Long: ${analysis.sentenceStructure.longCount}`}
              />
            )}
            {vLongPct > 0 && (
              <div
                style={{ width: `${vLongPct}%` }}
                className="bg-[#C84B31] dark:bg-[#E06348]"
                title={`Very long: ${analysis.sentenceStructure.veryLongCount}`}
              />
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-[#FAF8F5] dark:bg-[#12141A]">
              <div className="text-[11px] text-[#71717A] dark:text-[#8E96A8]">
                Short (10 words)
              </div>
              <div className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                {analysis.sentenceStructure.shortCount} ({shortPct}%)
              </div>
            </div>
            <div className="p-2 rounded-lg bg-[#FAF8F5] dark:bg-[#12141A]">
              <div className="text-[11px] text-[#71717A] dark:text-[#8E96A8]">
                Medium (11–22)
              </div>
              <div className="font-mono font-semibold text-indigo-700 dark:text-indigo-400">
                {analysis.sentenceStructure.mediumCount} ({medPct}%)
              </div>
            </div>
            <div className="p-2 rounded-lg bg-[#FAF8F5] dark:bg-[#12141A]">
              <div className="text-[11px] text-[#71717A] dark:text-[#8E96A8]">
                Long (23–34)
              </div>
              <div className="font-mono font-semibold text-amber-700 dark:text-amber-400">
                {analysis.sentenceStructure.longCount} ({longPct}%)
              </div>
            </div>
            <div className="p-2 rounded-lg bg-[#FAF8F5] dark:bg-[#12141A]">
              <div className="text-[11px] text-[#71717A] dark:text-[#8E96A8]">
                Very long (35+)
              </div>
              <div className="font-mono font-semibold text-[#C84B31] dark:text-[#E06348]">
                {analysis.sentenceStructure.veryLongCount} ({vLongPct}%)
              </div>
            </div>
          </div>
          <p className="text-[11px] text-[#71717A] dark:text-[#8E96A8]">
            Too many very long sentences makes an article tiring. The rewrite
            step splits the worst ones.
          </p>
        </div>

        <div className="bg-white dark:bg-[#181B22] border border-[#E6E1D8] dark:border-[#262A34] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#18181B] dark:text-[#F4F4F6] flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#C84B31] dark:text-[#E06348]" />
              Word choice
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#FAF8F5] dark:bg-[#12141A] border border-[#E6E1D8] dark:border-[#262A34] text-[#18181B] dark:text-[#F4F4F6]">
              {WORD_GRADE_LABELS[analysis.vocabulary.lexicalGrade] ??
                analysis.vocabulary.lexicalGrade}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-xs">
            <div className="p-2.5 rounded-lg bg-[#FAF8F5] dark:bg-[#12141A]">
              <div className="text-[11px] text-[#71717A] dark:text-[#8E96A8]">
                Different words
              </div>
              <div className="font-mono text-sm font-semibold text-[#18181B] dark:text-[#F4F4F6] mt-0.5">
                {analysis.vocabulary.uniqueWords} (
                {analysis.vocabulary.typeTokenRatio}%)
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-[#FAF8F5] dark:bg-[#12141A]">
              <div className="text-[11px] text-[#71717A] dark:text-[#8E96A8]">
                Longer words
              </div>
              <div className="font-mono text-sm font-semibold text-[#18181B] dark:text-[#F4F4F6] mt-0.5">
                {analysis.vocabulary.complexWordCount} (
                {analysis.vocabulary.complexWordPercent}%)
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-[#FAF8F5] dark:bg-[#12141A]">
              <div className="text-[11px] text-[#71717A] dark:text-[#8E96A8]">
                Word length
              </div>
              <div className="font-mono text-sm font-semibold text-[#18181B] dark:text-[#F4F4F6] mt-0.5">
                {analysis.vocabulary.avgWordLength} letters
              </div>
            </div>
          </div>

          {/* Robotic phrase detector */}
          <div className="pt-1">
            {analysis.aiClichésDetected.length === 0 ? (
              <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 px-3 py-2 rounded-lg">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  No robotic-sounding phrases found. This reads naturally.
                </span>
              </div>
            ) : (
              <div className="space-y-1.5 bg-amber-50/70 dark:bg-amber-950/35 border border-amber-200 dark:border-amber-800/70 p-2.5 rounded-lg">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {analysis.aiClichésDetected.length} phrase(s) that sound
                    machine-written:
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.aiClichésDetected.map((c, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] font-mono px-2 py-0.5 rounded bg-white dark:bg-[#14161B] border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200"
                    >
                      “{c}”
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                  Step 7 (Make it sound human) replaces these automatically.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Repetition + keywords */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#181B22] border border-[#E6E1D8] dark:border-[#262A34] rounded-xl p-4 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#18181B] dark:text-[#F4F4F6]">
            <Repeat className="w-3.5 h-3.5 text-[#52525B] dark:text-[#A1A7B5]" />
            Repeated words
          </div>
          {analysis.repeatedTerms.length === 0 ? (
            <p className="text-xs text-[#71717A] dark:text-[#8E96A8]">
              No word is used too often. Good.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {analysis.repeatedTerms.map((item) => (
                <span
                  key={item.term}
                  className={`text-xs font-mono px-2.5 py-1 rounded-lg border ${
                    item.isOverused
                      ? "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
                      : "bg-[#FAF8F5] dark:bg-[#12141A] border-[#E6E1D8] dark:border-[#262A34] text-[#27272A] dark:text-[#D4D8E2]"
                  }`}
                >
                  {item.term}{" "}
                  <span className="opacity-70">
                    ×{item.count} ({item.densityPercent}%)
                  </span>
                </span>
              ))}
            </div>
          )}
          <p className="text-[11px] text-[#71717A] dark:text-[#8E96A8]">
            Words in red are used far too often and should be swapped for
            synonyms.
          </p>
        </div>

        <div className="bg-white dark:bg-[#181B22] border border-[#E6E1D8] dark:border-[#262A34] rounded-xl p-4 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#18181B] dark:text-[#F4F4F6]">
            <Sparkles className="w-3.5 h-3.5 text-[#C84B31] dark:text-[#E06348]" />
            Key phrases used
          </div>
          {analysis.keywordCoverage.length === 0 ? (
            <p className="text-xs text-[#71717A] dark:text-[#8E96A8]">
              Pick key phrases in step 3 and we will count how often they appear
              here.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {analysis.keywordCoverage.map((kw) => (
                <span
                  key={kw.keyword}
                  className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border ${
                    kw.present
                      ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300"
                      : "bg-zinc-50 dark:bg-[#12141A] border-zinc-200 dark:border-[#262A34] text-zinc-500 dark:text-[#7F8799]"
                  }`}
                >
                  <span className="font-medium">{kw.keyword}</span>
                  <span className="font-mono text-[11px] opacity-80">
                    ({kw.count})
                  </span>
                </span>
              ))}
            </div>
          )}
          <p className="text-[11px] text-[#71717A] dark:text-[#8E96A8]">
            Green means the phrase appears in your article. Grey means it is
            missing.
          </p>
        </div>
      </div>
    </div>
  );
}

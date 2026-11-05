"use client";

import React, { useState } from "react";
import { ExternalLink, Play, ChevronDown, ChevronUp } from "lucide-react";
import type { MediaVideo } from "@/types/article";

interface MarkdownPreviewProps {
  markdown: string;
  selectedVideos?: MediaVideo[];
}

function renderInlineFormatting(text: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  const regex = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("[") && token.includes("](")) {
      const m = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (m) {
        tokens.push(
          <a
            key={`lnk-${keyIdx++}`}
            href={m[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-[#C84B31] dark:text-[#E06348] underline decoration-[#C84B31]/40 dark:decoration-[#E06348]/40 underline-offset-4 hover:decoration-[#C84B31] dark:hover:decoration-[#E06348] transition-colors"
          >
            <span>{m[1]}</span>
            <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
        );
      } else {
        tokens.push(token);
      }
    } else if (token.startsWith("**") && token.endsWith("**")) {
      tokens.push(
        <strong
          key={`b-${keyIdx++}`}
          className="font-semibold text-[#18181B] dark:text-[#F8F8FA]"
        >
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      tokens.push(
        <em
          key={`i-${keyIdx++}`}
          className="italic text-[#3F3F46] dark:text-[#B8BFCE]"
        >
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push(text.slice(lastIndex));
  }

  return tokens;
}

export function MarkdownPreview({
  markdown,
  selectedVideos = [],
}: MarkdownPreviewProps) {
  const [activeEmbedId, setActiveEmbedId] = useState<string | null>(null);
  const [openFaqIndices, setOpenFaqIndices] = useState<Record<number, boolean>>(
    { 0: true, 1: true }
  );

  if (!markdown.trim()) {
    return (
      <div className="p-10 text-center text-[#71717A] dark:text-[#8E96A8] border border-dashed border-[#E6E1D8] dark:border-[#2A2F3D] rounded-xl bg-[#FAF8F5] dark:bg-[#14161B]">
        Nothing to preview yet. Write or generate your article first and it will
        appear here.
      </div>
    );
  }

  const lines = markdown.split("\n");
  const elements: React.ReactNode[] = [];
  let inFaqSection = false;
  let faqCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    // Image ![alt](url) optionally followed by *Figure...* caption on next line
    if (trimmed.startsWith("![")) {
      const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (imgMatch) {
        let captionText = "";
        if (
          i + 1 < lines.length &&
          lines[i + 1].trim().startsWith("*") &&
          lines[i + 1].trim().endsWith("*")
        ) {
          captionText = lines[i + 1].trim().slice(1, -1);
          i += 1;
        }
        elements.push(
          <figure
            key={`fig-${i}`}
            className="my-8 rounded-xl overflow-hidden border border-[#E6E1D8] dark:border-[#262A34] bg-[#FAF8F5] dark:bg-[#181B22] shadow-xs"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgMatch[2]}
              alt={imgMatch[1]}
              className="w-full max-h-[420px] object-cover block"
              loading="lazy"
            />
            {(captionText || imgMatch[1]) && (
              <figcaption className="px-4 py-2.5 text-xs text-[#52525B] dark:text-[#A1A7B5] font-sans border-t border-[#E6E1D8] dark:border-[#262A34] bg-white dark:bg-[#14161B]">
                {captionText || imgMatch[1]}
              </figcaption>
            )}
          </figure>
        );
        continue;
      }
    }

    // Metadata subtitle line
    if (trimmed.startsWith("*Category:") && trimmed.endsWith("*")) {
      elements.push(
        <div
          key={`meta-${i}`}
          className="text-xs font-mono uppercase tracking-wider text-[#C84B31] dark:text-[#E06348] pb-4 mb-6 border-b border-[#E6E1D8] dark:border-[#262A34]"
        >
          {trimmed.slice(1, -1)}
        </div>
      );
      continue;
    }

    // H1
    if (trimmed.startsWith("# ")) {
      inFaqSection = false;
      elements.push(
        <h1
          key={`h1-${i}`}
          className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#111827] dark:text-[#F8F8FA] leading-[1.18] mb-3"
        >
          {trimmed.slice(2)}
        </h1>
      );
      continue;
    }

    // H2
    if (trimmed.startsWith("## ")) {
      const headingText = trimmed.slice(3);
      inFaqSection = headingText.toLowerCase().includes("frequently asked");
      elements.push(
        <h2
          key={`h2-${i}`}
          className="font-serif text-2xl font-semibold text-[#18181B] dark:text-[#F4F4F6] mt-10 mb-4 pb-2 border-b border-[#EFECE6] dark:border-[#262A34]"
        >
          {headingText}
        </h2>
      );
      continue;
    }

    // H3 (or FAQ Accordion item if inside FAQ section)
    if (trimmed.startsWith("### ")) {
      const subText = trimmed.slice(4);
      if (inFaqSection) {
        const answerLines: string[] = [];
        while (
          i + 1 < lines.length &&
          lines[i + 1].trim() !== "" &&
          !lines[i + 1].trim().startsWith("#")
        ) {
          answerLines.push(lines[i + 1].trim());
          i += 1;
        }
        const currentFaqIdx = faqCounter++;
        const isOpen = Boolean(openFaqIndices[currentFaqIdx]);
        elements.push(
          <div
            key={`faq-${i}`}
            className="my-3 rounded-xl border border-[#E6E1D8] dark:border-[#262A34] bg-[#FAF8F5]/70 dark:bg-[#1B1E26] overflow-hidden"
          >
            <button
              type="button"
              onClick={() =>
                setOpenFaqIndices((prev) => ({
                  ...prev,
                  [currentFaqIdx]: !prev[currentFaqIdx],
                }))
              }
              className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left font-sans font-semibold text-sm text-[#18181B] dark:text-[#F4F4F6] hover:bg-[#F3EFE8]/70 dark:hover:bg-[#232834] transition-colors cursor-pointer"
            >
              <span>{subText}</span>
              {isOpen ? (
                <ChevronUp className="w-4 h-4 text-[#C84B31] dark:text-[#E06348] shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#71717A] dark:text-[#8E96A8] shrink-0" />
              )}
            </button>
            {isOpen && (
              <div className="px-4 pb-4 pt-2 text-sm leading-relaxed text-[#3F3F46] dark:text-[#D4D8E2] border-t border-[#E6E1D8]/60 dark:border-[#262A34] bg-white dark:bg-[#14161B]">
                {renderInlineFormatting(answerLines.join(" "))}
              </div>
            )}
          </div>
        );
        continue;
      }

      elements.push(
        <h3
          key={`h3-${i}`}
          className="font-serif text-xl font-semibold text-[#27272A] dark:text-[#E4E7EE] mt-7 mb-2.5"
        >
          {subText}
        </h3>
      );
      continue;
    }

    // Blockquote / Video callout
    if (trimmed.startsWith("> ")) {
      elements.push(
        <blockquote
          key={`bq-${i}`}
          className="my-6 pl-5 pr-4 py-4 border-l-4 border-[#C84B31] dark:border-[#E06348] bg-[#FAF6F2] dark:bg-[#1B1E26] rounded-r-xl text-[#27272A] dark:text-[#E4E7EE] font-serif text-[1.02rem] leading-relaxed"
        >
          {renderInlineFormatting(trimmed.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Bullet list group
    if (trimmed.startsWith("- ")) {
      const items: string[] = [trimmed.slice(2)];
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith("- ")) {
        items.push(lines[i + 1].trim().slice(2));
        i += 1;
      }
      elements.push(
        <ul
          key={`ul-${i}`}
          className="my-4 space-y-2.5 pl-5 list-disc marker:text-[#C84B31] dark:marker:text-[#E06348] text-[#27272A] dark:text-[#D4D8E2] leading-relaxed"
        >
          {items.map((item, idx) => (
            <li key={idx} className="text-[1.03rem] font-serif">
              {renderInlineFormatting(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered reference list group
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [trimmed.replace(/^\d+\.\s+/, "")];
      while (i + 1 < lines.length && /^\d+\.\s+/.test(lines[i + 1].trim())) {
        items.push(lines[i + 1].trim().replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      elements.push(
        <ol
          key={`ol-${i}`}
          className="my-4 space-y-2.5 pl-5 list-decimal marker:font-mono marker:text-xs marker:text-[#C84B31] dark:marker:text-[#E06348] text-sm text-[#3F3F46] dark:text-[#C6CCD9] leading-relaxed"
        >
          {items.map((item, idx) => (
            <li key={idx}>{renderInlineFormatting(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Standard editorial paragraph
    elements.push(
      <p
        key={`p-${i}`}
        className="my-4 font-serif text-[1.08rem] leading-[1.82] text-[#27272A] dark:text-[#D8DCE6]"
      >
        {renderInlineFormatting(trimmed)}
      </p>
    );
  }

  return (
    <article className="bg-white dark:bg-[#14161B] border border-[#E6E1D8] dark:border-[#262A34] rounded-2xl p-6 sm:p-10 lg:p-12 shadow-xs">
      {elements}

      {selectedVideos.length > 0 && (
        <section className="mt-10 pt-6 border-t border-[#E6E1D8] dark:border-[#262A34]">
          <div className="text-xs font-mono uppercase tracking-wider text-[#71717A] dark:text-[#8E96A8] mb-3">
            Videos in this article
          </div>
          <div className="grid grid-cols-1 gap-4">
            {selectedVideos.map((vid) => (
              <div
                key={vid.id}
                className="rounded-xl border border-[#E6E1D8] dark:border-[#262A34] bg-[#FAF8F5] dark:bg-[#1B1E26] overflow-hidden"
              >
                {activeEmbedId === vid.id ? (
                  <div className="aspect-video w-full bg-black">
                    <iframe
                      src={vid.embedUrl}
                      title={vid.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4">
                    <div className="relative w-full sm:w-44 h-28 rounded-lg overflow-hidden shrink-0 bg-zinc-900">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={vid.thumbnailUrl}
                        alt={vid.title}
                        className="w-full h-full object-cover opacity-90"
                      />
                      <button
                        type="button"
                        onClick={() => setActiveEmbedId(vid.id)}
                        className="absolute inset-0 flex items-center justify-center bg-black/35 hover:bg-black/50 transition-colors cursor-pointer"
                        title="Play embedded video"
                      >
                        <span className="w-10 h-10 rounded-full bg-[#C84B31] text-white flex items-center justify-center shadow-md">
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </span>
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono text-[#C84B31] dark:text-[#E06348]">
                        {vid.channel} · {vid.duration}
                      </div>
                      <h4 className="font-semibold text-sm text-[#18181B] dark:text-[#F4F4F6] mt-0.5">
                        {vid.title}
                      </h4>
                      <p className="text-xs text-[#52525B] dark:text-[#A1A7B5] mt-1 line-clamp-2">
                        {vid.summary}
                      </p>
                      <div className="mt-2 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setActiveEmbedId(vid.id)}
                          className="text-xs font-medium text-[#C84B31] dark:text-[#E06348] hover:underline cursor-pointer"
                        >
                          Play Inline Player
                        </button>
                        <a
                          href={vid.watchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[#52525B] dark:text-[#A1A7B5] hover:text-[#18181B] dark:hover:text-white"
                        >
                          Open on YouTube <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

"use client";

import React, { useMemo, useState } from "react";
import {
  Archive,
  ArrowUpRight,
  Clock,
  Download,
  Eye,
  FileText,
  Search,
  Trash2,
} from "lucide-react";
import type { ArticleRecord } from "@/types/article";
import { buildSafeExportFilename } from "@/lib/client-download";
import { MarkdownPreview } from "./MarkdownPreview";

interface ArticleHistoryVaultProps {
  articles: ArticleRecord[];
  loading: boolean;
  storage?: { label: string; note: string } | null;
  onLoadIntoStudio: (article: ArticleRecord) => void;
  onDeleteArticle: (id: string) => Promise<void>;
  onNotifyDownload?: (msg: string) => void;
}

export function ArticleHistoryVault({
  articles,
  loading,
  storage,
  onLoadIntoStudio,
  onDeleteArticle,
  onNotifyDownload,
}: ArticleHistoryVaultProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(articles.map((a) => a.category)));
    return ["ALL", ...unique];
  }, [articles]);

  const filtered = useMemo(() => {
    return articles.filter((a) => {
      const matchesCat =
        categoryFilter === "ALL" || a.category === categoryFilter;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchesCat;
      return (
        matchesCat &&
        (a.fixedTitle.toLowerCase().includes(q) ||
          a.topic.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q))
      );
    });
  }, [articles, categoryFilter, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#14161B] border border-[#E6E1D8] dark:border-[#262A34] rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#C84B31] dark:text-[#E06348]">
              <Archive className="w-3.5 h-3.5" />
              Your saved work
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#18181B] dark:text-[#F4F4F6] mt-1">
              My articles
            </h2>
            <p className="text-sm text-[#52525B] dark:text-[#A1A7B5] mt-1">
              Every finished article is saved here automatically. Open one to keep
              editing, compare the first draft with the natural-sounding version,
              or download it to your computer as a PDF, Word, HTML or text file.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#1B1E26] border border-[#E6E1D8] dark:border-[#262A34] text-right">
              <div className="text-[11px] font-mono uppercase text-[#71717A] dark:text-[#8E96A8]">
                Saved articles
              </div>
              <div className="text-xl font-mono font-bold text-[#18181B] dark:text-[#F4F4F6]">
                {articles.length}
              </div>
            </div>
          </div>
        </div>

        {storage && (
          <div className="mt-4 flex items-start gap-1.5 text-[11px] text-[#52525B] dark:text-[#A1A7B5]">
            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>
              Saved on <strong>{storage.label}</strong>. {storage.note}
            </span>
          </div>
        )}

        {/* Search & Filter */}
        <div className="mt-5 pt-5 border-t border-[#E6E1D8] dark:border-[#262A34] flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#71717A] dark:text-[#8E96A8] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your articles..."
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-[#E6E1D8] dark:border-[#2A2F3D] bg-[#FAF8F5] dark:bg-[#1B1E26] text-[#18181B] dark:text-[#F4F4F6] focus:bg-white dark:focus:bg-[#14161B] focus:outline-none focus:border-[#C84B31] dark:focus:border-[#E06348]"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3.5 py-2.5 text-sm rounded-xl border border-[#E6E1D8] dark:border-[#2A2F3D] bg-[#FAF8F5] dark:bg-[#1B1E26] text-[#18181B] dark:text-[#F4F4F6] focus:outline-none focus:border-[#C84B31] dark:focus:border-[#E06348]"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === "ALL" ? "All topics" : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-[#14161B] border border-[#E6E1D8] dark:border-[#262A34] rounded-2xl p-12 text-center text-sm text-[#52525B] dark:text-[#A1A7B5]">
          Loading your saved articles...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-[#14161B] border border-dashed border-[#D6CFC2] dark:border-[#2A2F3D] rounded-2xl p-12 text-center space-y-2">
          <FileText className="w-8 h-8 text-[#C84B31] dark:text-[#E06348] mx-auto opacity-80" />
          <h3 className="font-serif text-xl font-semibold text-[#18181B] dark:text-[#F4F4F6]">
            No matching articles found
          </h3>
          <p className="text-sm text-[#52525B] dark:text-[#A1A7B5] max-w-md mx-auto">
            Finish an article in the Write tab and it will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((art) => {
            const beforeScore = art.beforeAnalysis?.humanNaturalnessScore ?? 62;
            const afterScore = art.afterAnalysis?.humanNaturalnessScore ?? 88;
            const gain = afterScore - beforeScore;
            const isPreviewOpen = previewId === art.id;

            return (
              <div
                key={art.id}
                className="bg-white dark:bg-[#14161B] border border-[#E6E1D8] dark:border-[#262A34] rounded-2xl p-5 sm:p-6 shadow-xs transition-all hover:border-[#D0C7B8] dark:hover:border-[#383F52]"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#FAF6F2] dark:bg-[#1F1A18] border border-[#E6E1D8] dark:border-[#3A2923] font-medium text-[#C84B31] dark:text-[#E06348]">
                        {art.category}
                      </span>
                      <span className="font-mono text-[#71717A] dark:text-[#8E96A8] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(art.updatedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span className="font-mono text-[#52525B] dark:text-[#A1A7B5]">
                        · {art.afterAnalysis?.wordCount ?? art.targetWordCount}{" "}
                        words
                      </span>
                      <span className="font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                        Sounds human: {beforeScore} → {afterScore} (
                        {gain >= 0 ? `+${gain}` : gain})
                      </span>
                    </div>

                    <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#18181B] dark:text-[#F4F4F6] leading-snug">
                      {art.fixedTitle}
                    </h3>

                    <p className="text-xs text-[#52525B] dark:text-[#A1A7B5]">
                      <span className="font-semibold text-[#27272A] dark:text-[#E4E7EE]">
                        Topic:
                      </span>{" "}
                      {art.topic} ·{" "}
                      <span className="font-semibold text-[#27272A] dark:text-[#E4E7EE]">
                        Audience:
                      </span>{" "}
                      {art.audience} ·{" "}
                      <span className="font-semibold text-[#27272A] dark:text-[#E4E7EE]">
                        Voice:
                      </span>{" "}
                      {art.humanizationStyle}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onLoadIntoStudio(art)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#C84B31] hover:bg-[#B03E26] text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <span>Open in Studio</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setPreviewId(isPreviewOpen ? null : art.id)
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E6E1D8] dark:border-[#2A2F3D] bg-[#FAF8F5] dark:bg-[#1B1E26] text-xs font-medium text-[#18181B] dark:text-[#F4F4F6] hover:bg-[#F3EFE8] dark:hover:bg-[#252A36] cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{isPreviewOpen ? "Hide Preview" : "Preview"}</span>
                    </button>

                    <button
                      type="button"
                      disabled={deletingId === art.id}
                      onClick={async () => {
                        setDeletingId(art.id);
                        await onDeleteArticle(art.id);
                        setDeletingId(null);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl border border-[#E6E1D8] dark:border-[#2A2F3D] text-xs text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-50 cursor-pointer"
                      title="Delete article"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Direct PC Download Strip */}
                <div className="mt-4 pt-3.5 border-t border-[#F1EDE6] dark:border-[#232732] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {[...art.aiKeywords, ...art.userKeywords]
                      .slice(0, 5)
                      .map((kw) => (
                        <span
                          key={kw}
                          className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#FAF8F5] dark:bg-[#1B1E26] border border-[#E6E1D8] dark:border-[#262A34] text-[#52525B] dark:text-[#A1A7B5]"
                        >
                          #{kw}
                        </span>
                      ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-mono text-[#71717A] dark:text-[#8E96A8] mr-1 flex items-center gap-1">
                      <Download className="w-3 h-3 text-[#C84B31] dark:text-[#E06348]" />{" "}
                      Download:
                    </span>
                    {(["pdf", "docx", "html", "txt"] as const).map((fmt) => {
                      const dlName = buildSafeExportFilename(
                        art.fixedTitle,
                        fmt
                      );
                      return (
                        <a
                          key={fmt}
                          href={`/api/export?id=${art.id}&format=${fmt}`}
                          download={dlName}
                          onClick={() =>
                            onNotifyDownload?.(
                              `Downloading "${dlName}" directly to your PC!`
                            )
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E6E1D8] dark:border-[#2A2F3D] bg-[#FAF8F5] dark:bg-[#1B1E26] hover:bg-[#18181B] dark:hover:bg-[#E06348] hover:border-[#18181B] dark:hover:border-[#E06348] text-[#18181B] dark:text-[#F4F4F6] hover:text-white text-[11px] font-mono uppercase font-semibold transition-colors"
                        >
                          <Download className="w-2.5 h-2.5" />
                          <span>{fmt}</span>
                        </a>
                      );
                    })}
                  </div>
                </div>

                {isPreviewOpen && (
                  <div className="mt-5 pt-5 border-t border-[#E6E1D8] dark:border-[#262A34]">
                    <MarkdownPreview
                      markdown={art.finalContent}
                      selectedVideos={art.selectedVideos}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

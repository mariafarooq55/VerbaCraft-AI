"use client";

import React, { useState } from "react";
import {
  Check,
  Copy,
  Download,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Globe,
  Loader2,
} from "lucide-react";
import {
  downloadArticleToPc,
  type ExportFormat,
} from "@/lib/client-download";
import type {
  ExternalReference,
  MediaImage,
  MediaVideo,
} from "@/types/article";

interface ExportToolbarProps {
  title: string;
  category: string;
  audience: string;
  tone: string;
  markdown: string;
  wordCount?: number;
  readabilityScore?: number;
  naturalnessScore?: number;
  selectedImages?: MediaImage[];
  selectedVideos?: MediaVideo[];
  selectedLinks?: ExternalReference[];
  label?: string;
  compact?: boolean;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

const FORMAT_CARDS: {
  format: ExportFormat;
  label: string;
  ext: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  accentClass: string;
}[] = [
  {
    format: "pdf",
    label: "Download PDF",
    ext: ".PDF",
    subtitle: "Print-ready document",
    icon: FileText,
    accentClass: "text-[#C84B31] dark:text-[#E06348]",
  },
  {
    format: "docx",
    label: "Download DOCX",
    ext: ".DOCX",
    subtitle: "Opens in Microsoft Word",
    icon: FileSpreadsheet,
    accentClass: "text-indigo-600 dark:text-indigo-400",
  },
  {
    format: "html",
    label: "Download HTML",
    ext: ".HTML",
    subtitle: "Single web page file",
    icon: Globe,
    accentClass: "text-emerald-600 dark:text-emerald-400",
  },
  {
    format: "txt",
    label: "Download TXT",
    ext: ".TXT",
    subtitle: "Plain text, no formatting",
    icon: FileCode2,
    accentClass: "text-amber-600 dark:text-amber-400",
  },
];

export function ExportToolbar({
  title,
  category,
  audience,
  tone,
  markdown,
  wordCount,
  readabilityScore,
  naturalnessScore,
  selectedImages,
  selectedVideos,
  selectedLinks,
  label = "Download your article to your computer",
  compact = false,
  onSuccess,
  onError,
}: ExportToolbarProps) {
  const [activeFormat, setActiveFormat] = useState<ExportFormat | null>(null);
  const [copied, setCopied] = useState(false);
  const [lastExport, setLastExport] = useState<{
    filename: string;
    backupUrl: string | null;
  } | null>(null);

  const hasContent = Boolean(markdown && markdown.trim().length > 0);

  const handleExport = async (format: ExportFormat) => {
    if (!hasContent) {
      onError?.("Generate or enter article text before downloading.");
      return;
    }

    setActiveFormat(format);
    try {
      const result = await downloadArticleToPc({
        format,
        title: title || "Intelligent Article",
        category,
        audience,
        tone,
        markdown,
        wordCount,
        readabilityScore,
        naturalnessScore,
        selectedImages,
        selectedVideos,
        selectedLinks,
      });

      setLastExport({
        filename: result.filename,
        backupUrl: result.backupBlobUrl,
      });
      onSuccess?.(`Downloading "${result.filename}" directly to your PC!`);
    } catch (err) {
      onError?.(
        err instanceof Error ? err.message : "Could not download the file. Please try again."
      );
    } finally {
      setActiveFormat(null);
    }
  };

  const handleCopyMarkdown = async () => {
    if (!hasContent) return;
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      onSuccess?.("Article text copied to your clipboard.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      onError?.("Could not access clipboard.");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#52525B] dark:text-[#A1A7B5] font-semibold">
          <Download className="w-3.5 h-3.5 text-[#C84B31] dark:text-[#E06348]" />
          <span>{label}</span>
        </div>

        <button
          type="button"
          disabled={!hasContent}
          onClick={handleCopyMarkdown}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E6E1D8] dark:border-[#2A2F3D] bg-[#FAF8F5] dark:bg-[#1B1E26] hover:bg-white dark:hover:bg-[#242936] text-xs font-medium text-[#27272A] dark:text-[#E4E7EE] transition-colors disabled:opacity-45 cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span>Copied Markdown</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Markdown</span>
            </>
          )}
        </button>
      </div>

      <div
        className={`grid gap-2.5 ${
          compact ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        }`}
      >
        {FORMAT_CARDS.map((card) => {
          const Icon = card.icon;
          const isBusy = activeFormat === card.format;
          return (
            <button
              key={card.format}
              type="button"
              disabled={!hasContent || Boolean(activeFormat)}
              onClick={() => handleExport(card.format)}
              className="group relative flex items-center justify-between gap-3 p-3.5 rounded-xl border border-[#E6E1D8] dark:border-[#262A34] bg-[#FAF8F5] dark:bg-[#1B1E26] hover:bg-[#18181B] dark:hover:bg-[#E06348] hover:border-[#18181B] dark:hover:border-[#E06348] text-left transition-all shadow-2xs disabled:opacity-45 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-white dark:bg-[#14161B] group-hover:bg-white/15 border border-[#E6E1D8] dark:border-[#2A2F3D] group-hover:border-transparent flex items-center justify-center shrink-0 transition-colors">
                  {isBusy ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#C84B31] group-hover:text-white" />
                  ) : (
                    <Icon
                      className={`w-4 h-4 ${card.accentClass} group-hover:text-white transition-colors`}
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#18181B] dark:text-[#F4F4F6] group-hover:text-white truncate">
                    {card.label}
                  </div>
                  {!compact && (
                    <div className="text-[11px] text-[#71717A] dark:text-[#9CA3B5] group-hover:text-white/80 truncate">
                      {card.subtitle}
                    </div>
                  )}
                </div>
              </div>
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-white dark:bg-[#14161B] text-[#52525B] dark:text-[#A1A7B5] group-hover:bg-white/20 group-hover:text-white shrink-0">
                {card.ext}
              </span>
            </button>
          );
        })}
      </div>

      {lastExport && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 text-xs text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              Exported <strong className="font-mono">{lastExport.filename}</strong>{" "}
              to your computer (usually the Downloads folder).
            </span>
          </div>
          {lastExport.backupUrl && (
            <a
              href={lastExport.backupUrl}
              download={lastExport.filename}
              className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 text-emerald-800 dark:text-emerald-300 hover:text-emerald-950 dark:hover:text-white"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download {lastExport.filename} again</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}

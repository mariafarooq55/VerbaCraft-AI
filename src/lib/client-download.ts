export type ExportFormat = "pdf" | "docx" | "html" | "txt";

export interface ClientExportRequest {
  format: ExportFormat;
  title: string;
  category: string;
  audience: string;
  tone: string;
  markdown: string;
  wordCount?: number;
  readabilityScore?: number;
  naturalnessScore?: number;
  selectedImages?: import("@/types/article").MediaImage[];
  selectedVideos?: import("@/types/article").MediaVideo[];
  selectedLinks?: import("@/types/article").ExternalReference[];
}

export interface PreparedDownloadResult {
  filename: string;
  backupBlobUrl: string | null;
}

const DOWNLOAD_IFRAME_NAME = "verbacraft_native_dl_frame";

function ensureDownloadIframe(): HTMLIFrameElement {
  let iframe = document.getElementById(
    DOWNLOAD_IFRAME_NAME
  ) as HTMLIFrameElement | null;

  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = DOWNLOAD_IFRAME_NAME;
    iframe.name = DOWNLOAD_IFRAME_NAME;
    iframe.title = "VerbaCraft File Download Target";
    // Keep 1x1 transparent rather than display:none so WebKit/Blink/Gecko always instantiate browsing context
    iframe.style.position = "fixed";
    iframe.style.width = "1px";
    iframe.style.height = "1px";
    iframe.style.bottom = "0";
    iframe.style.right = "0";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");
    document.body.appendChild(iframe);
  }

  return iframe;
}

export function buildSafeExportFilename(
  title: string,
  format: ExportFormat
): string {
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "verbacraft-article";
  return `${slug}.${format}`;
}

/**
 * Triggers an immediate, synchronous user-gesture HTTP attachment download to the user's PC
 * via `/api/export` (Content-Disposition: attachment), and prepares a 5-minute persistent
 * backup Blob URL for optional manual re-saving.
 */
export async function downloadArticleToPc(
  req: ClientExportRequest
): Promise<PreparedDownloadResult> {
  const cleanMarkdown = req.markdown.trim();
  if (!cleanMarkdown) {
    throw new Error(
      "Manuscript is empty. Generate or enter article content before exporting."
    );
  }

  const filename = buildSafeExportFilename(req.title, req.format);

  // 1. Synchronous native form POST during active user click gesture -> triggers immediate OS PC download
  ensureDownloadIframe();
  const form = document.createElement("form");
  form.method = "POST";
  form.action = "/api/export";
  form.target = DOWNLOAD_IFRAME_NAME;
  form.enctype = "application/x-www-form-urlencoded";
  form.style.display = "none";

  const fields: Record<string, string> = {
    format: req.format,
    title: req.title || "Intelligent Article",
    category: req.category || "Editorial",
    audience: req.audience || "General Readers",
    tone: req.tone || "Authoritative",
    markdown: cleanMarkdown,
    wordCount: String(
      req.wordCount || cleanMarkdown.split(/\s+/).filter(Boolean).length
    ),
  };

  if (req.readabilityScore !== undefined) {
    fields.readabilityScore = String(req.readabilityScore);
  }
  if (req.naturalnessScore !== undefined) {
    fields.naturalnessScore = String(req.naturalnessScore);
  }
  if (req.selectedImages?.length) {
    fields.selectedImages = JSON.stringify(req.selectedImages);
  }
  if (req.selectedVideos?.length) {
    fields.selectedVideos = JSON.stringify(req.selectedVideos);
  }
  if (req.selectedLinks?.length) {
    fields.selectedLinks = JSON.stringify(req.selectedLinks);
  }

  for (const [key, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();

  window.setTimeout(() => {
    if (form.parentNode) {
      form.parentNode.removeChild(form);
    }
  }, 4000);

  // 2. Prepare a non-revoked Blob URL in background (kept alive for 5 minutes) for direct "Save Again" link
  let backupBlobUrl: string | null = null;
  try {
    const res = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      const mimeMap: Record<ExportFormat, string> = {
        pdf: "application/pdf",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        html: "text/html;charset=utf-8",
        txt: "text/plain;charset=utf-8",
      };
      const blob = new Blob([arrayBuffer], { type: mimeMap[req.format] });
      backupBlobUrl = URL.createObjectURL(blob);
      // Retain Blob URL for 5 full minutes (300,000ms) — never revoke prematurely!
      const urlToCleanup = backupBlobUrl;
      window.setTimeout(() => {
        URL.revokeObjectURL(urlToCleanup);
      }, 300_000);
    }
  } catch {
    // Native form download already succeeded
  }

  return { filename, backupBlobUrl };
}

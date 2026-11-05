import { PDFDocument, StandardFonts, rgb, PDFName, PDFString } from "pdf-lib";
import {
  AlignmentType,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
  type ParagraphChild,
} from "docx";
import type {
  ExternalReference,
  MediaImage,
  MediaVideo,
} from "@/types/article";

export interface ExportPayload {
  title: string;
  category: string;
  audience: string;
  tone: string;
  markdown: string;
  wordCount: number;
  readabilityScore?: number;
  naturalnessScore?: number;
  selectedImages?: MediaImage[];
  selectedVideos?: MediaVideo[];
  selectedLinks?: ExternalReference[];
}

interface ImageAsset {
  bytes: Uint8Array;
  type: "jpg" | "png" | "gif" | "bmp";
  contentType: string;
}

const MAX_IMAGE_BYTES = 7 * 1024 * 1024;
const IMAGE_FETCH_TIMEOUT_MS = 7000;
const IMAGE_RE = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;
const LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

function sanitizePdfText(input: string): string {
  return input
    .replace(/\u00A0/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, " - ")
    .replace(/…/g, "...")
    .replace(/•/g, "-")
    .replace(/×/g, "x")
    .replace(/[^\x20-\x7E\xA1-\xFF]/g, "");
}

function safeHttpUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.href;
  } catch {
    return null;
  }
}

function cleanInlineMarkdown(line: string): string {
  return line
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "[Picture: $1 — $2]")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/, "")
    .replace(/^>\s+/, "")
    .trim();
}

function extractMarkdownImages(markdown: string): { alt: string; url: string }[] {
  const results: { alt: string; url: string }[] = [];
  for (const match of markdown.matchAll(IMAGE_RE)) {
    const url = safeHttpUrl(match[2]);
    if (url) results.push({ alt: match[1] || "Article picture", url });
  }
  return results;
}

function extractMarkdownLinks(markdown: string): { title: string; url: string }[] {
  const results: { title: string; url: string }[] = [];
  for (const match of markdown.matchAll(LINK_RE)) {
    const url = safeHttpUrl(match[2]);
    if (url) results.push({ title: match[1], url });
  }
  return results;
}

function imageUrlFromMarkdownLine(line: string): { alt: string; url: string } | null {
  const match = line.trim().match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/);
  if (!match) return null;
  const url = safeHttpUrl(match[2]);
  return url ? { alt: match[1] || "Article picture", url } : null;
}

function selectedImagesNotInArticle(payload: ExportPayload): MediaImage[] {
  const articleUrls = new Set(extractMarkdownImages(payload.markdown).map((i) => i.url));
  const added = new Set<string>();
  return (payload.selectedImages ?? []).filter((image) => {
    const url = safeHttpUrl(image.url);
    if (!url || articleUrls.has(url) || added.has(url)) return false;
    added.add(url);
    return true;
  });
}

function selectedLinksNotInArticle(payload: ExportPayload): ExternalReference[] {
  const articleUrls = new Set(extractMarkdownLinks(payload.markdown).map((link) => link.url));
  const added = new Set<string>();
  return (payload.selectedLinks ?? []).filter((link) => {
    const url = safeHttpUrl(link.url);
    if (!url || articleUrls.has(url) || added.has(url)) return false;
    added.add(url);
    return true;
  });
}

function getVideoWatchUrl(video: MediaVideo): string | null {
  return safeHttpUrl(video.watchUrl || video.embedUrl || "");
}

function getYoutubeEmbedUrl(video: MediaVideo): string | null {
  const raw = video.embedUrl || video.watchUrl;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    let id = "";
    if (url.hostname.includes("youtu.be")) {
      id = url.pathname.split("/").filter(Boolean)[0] || "";
    } else if (url.hostname.includes("youtube.com")) {
      id = url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).pop() || "";
    }
    if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return null;
    return `https://www.youtube-nocookie.com/embed/${id}`;
  } catch {
    return null;
  }
}

function selectedVideosNotInArticle(payload: ExportPayload): MediaVideo[] {
  return (payload.selectedVideos ?? []).filter((video) => Boolean(getVideoWatchUrl(video)));
}

function imageTypeFromData(bytes: Uint8Array, contentType: string): ImageAsset["type"] | null {
  if (contentType.includes("image/png") || (bytes[0] === 0x89 && bytes[1] === 0x50)) return "png";
  if (
    contentType.includes("image/jpeg") ||
    contentType.includes("image/jpg") ||
    (bytes[0] === 0xff && bytes[1] === 0xd8)
  ) return "jpg";
  if (contentType.includes("image/gif") || (bytes[0] === 0x47 && bytes[1] === 0x49)) return "gif";
  if (contentType.includes("image/bmp") || bytes[0] === 0x42 && bytes[1] === 0x4d) return "bmp";
  return null;
}

function isPublicImageHost(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.startsWith("127.") ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    host.startsWith("169.254.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host.startsWith("fc") ||
    host.startsWith("fd")
  ) return false;
  return url.protocol === "https:" || url.protocol === "http:";
}

async function fetchImageAsset(rawUrl: string): Promise<ImageAsset | null> {
  const safeUrl = safeHttpUrl(rawUrl);
  if (!safeUrl) return null;
  let parsed: URL;
  try {
    parsed = new URL(safeUrl);
  } catch {
    return null;
  }
  if (!isPublicImageHost(parsed)) return null;

  try {
    const response = await fetch(safeUrl, {
      signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS),
      headers: { Accept: "image/jpeg,image/png,image/gif,image/bmp,*/*;q=0.5" },
    });
    if (!response.ok) return null;
    const finalUrl = new URL(response.url || safeUrl);
    if (!isPublicImageHost(finalUrl)) return null;
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > MAX_IMAGE_BYTES) return null;
    const buffer = new Uint8Array(await response.arrayBuffer());
    if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) return null;
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    const type = imageTypeFromData(buffer, contentType);
    if (!type) return null;
    return { bytes: buffer, type, contentType };
  } catch {
    return null;
  }
}

function imageDimensions(bytes: Uint8Array, type: ImageAsset["type"]): { width: number; height: number } {
  try {
    if (type === "png" && bytes.length >= 24) {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      return { width: view.getUint32(16), height: view.getUint32(20) };
    }
    if (type === "jpg" && bytes.length > 4) {
      let offset = 2;
      while (offset + 9 < bytes.length) {
        if (bytes[offset] !== 0xff) {
          offset += 1;
          continue;
        }
        const marker = bytes[offset + 1];
        const segmentLength = (bytes[offset + 2] << 8) | bytes[offset + 3];
        if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
          return {
            height: (bytes[offset + 5] << 8) | bytes[offset + 6],
            width: (bytes[offset + 7] << 8) | bytes[offset + 8],
          };
        }
        if (segmentLength < 2) break;
        offset += segmentLength + 2;
      }
    }
  } catch {
    // Use a landscape fallback for unsupported or malformed images.
  }
  return { width: 1200, height: 627 };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(s: string): string {
  return escapeHtml(s).replace(/`/g, "&#96;");
}

function decodeEscapedHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function imageFigureHtml(
  alt: string,
  rawUrl: string,
  caption = "",
  embeddedSources?: Map<string, string>
): string {
  const url = safeHttpUrl(rawUrl);
  if (!url) return `<p>[Picture: ${escapeHtml(alt)}]</p>`;
  const src = embeddedSources?.get(url) || url;
  const openLink = url !== src;
  return `<figure class="article-figure">${openLink ? `<a href="${escapeAttribute(url)}" target="_blank" rel="noopener noreferrer">` : ""}<img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}" loading="lazy"/>${openLink ? "</a>" : ""}<figcaption>${escapeHtml(caption || alt)}</figcaption></figure>`;
}

function formatInlineHtml(text: string, embeddedSources?: Map<string, string>): string {
  let out = escapeHtml(text);
  out = out.replace(
    /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g,
    (_match, escapedAlt: string, escapedUrl: string) => {
      const alt = decodeEscapedHtml(escapedAlt);
      const url = decodeEscapedHtml(escapedUrl);
      return imageFigureHtml(alt, url, alt, embeddedSources);
    }
  );
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_match, escapedLabel: string, escapedUrl: string) => {
      const label = decodeEscapedHtml(escapedLabel);
      const url = safeHttpUrl(decodeEscapedHtml(escapedUrl));
      return url
        ? `<a href="${escapeAttribute(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`
        : escapeHtml(label);
    }
  );
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  return out;
}

function supplementalImagesHtml(
  payload: ExportPayload,
  embeddedSources?: Map<string, string>
): string {
  const images = selectedImagesNotInArticle(payload);
  if (!images.length) return "";
  return `<section class="media-section"><h2>More pictures</h2>${images
    .map((image) =>
      imageFigureHtml(image.alt || image.caption, image.url, image.caption, embeddedSources)
    )
    .join("\n")}</section>`;
}

function videosHtml(payload: ExportPayload, embeddedSources?: Map<string, string>): string {
  const videos = selectedVideosNotInArticle(payload);
  if (!videos.length) return "";
  return `<section class="media-section"><h2>Videos</h2><p class="media-intro">These videos open and play when you are online.</p>${videos
    .map((video) => {
      const watchUrl = getVideoWatchUrl(video);
      const embedUrl = getYoutubeEmbedUrl(video);
      const thumbnail = safeHttpUrl(video.thumbnailUrl || "");
      const thumbnailSrc = thumbnail
        ? embeddedSources?.get(thumbnail) || thumbnail
        : "";
      return `<article class="video-card">${
        embedUrl
          ? `<div class="video-frame"><iframe src="${escapeAttribute(embedUrl)}" title="${escapeAttribute(video.title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>${thumbnailSrc ? `<a class="video-thumb" href="${escapeAttribute(watchUrl || "#")}" target="_blank" rel="noopener noreferrer"><img src="${escapeAttribute(thumbnailSrc)}" alt="Video thumbnail: ${escapeAttribute(video.title)}"/><span>Open video on YouTube ↗</span></a>` : ""}`
          : thumbnailSrc
            ? `<a class="video-thumb" href="${escapeAttribute(watchUrl || "#")}" target="_blank" rel="noopener noreferrer"><img src="${escapeAttribute(thumbnailSrc)}" alt="${escapeAttribute(video.title)}"/></a>`
            : ""
      }<div class="video-info"><h3>${escapeHtml(video.title)}</h3><div class="video-meta">${escapeHtml(video.channel)}${video.duration ? ` · ${escapeHtml(video.duration)}` : ""}</div><p>${escapeHtml(video.summary || "")}</p>${watchUrl ? `<a class="watch-link" href="${escapeAttribute(watchUrl)}" target="_blank" rel="noopener noreferrer">Watch this video ↗</a>` : ""}</div></article>`;
    })
    .join("\n")}</section>`;
}

function sourcesHtml(payload: ExportPayload): string {
  const sources = selectedLinksNotInArticle(payload);
  if (!sources.length) return "";
  return `<section class="media-section"><h2>Sources and further reading</h2><ol>${sources
    .map((source) => {
      const url = safeHttpUrl(source.url);
      const link = url
        ? `<a href="${escapeAttribute(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.title)}</a>`
        : escapeHtml(source.title);
      return `<li><strong>${link}</strong><span class="source-domain">${escapeHtml(source.domain)}${source.authorityType ? ` · ${escapeHtml(source.authorityType)}` : ""}</span><p>${escapeHtml(source.snippet || "")}</p></li>`;
    })
    .join("\n")}</ol></section>`;
}

export function buildTxtExport(payload: ExportPayload): string {
  const divider = "=".repeat(Math.min(78, Math.max(40, payload.title.length)));
  const lines = payload.markdown.split("\n").map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("# ")) {
      const h = cleanInlineMarkdown(trimmed.slice(2)).toUpperCase();
      return `${h}\n${divider}`;
    }
    if (trimmed.startsWith("## ")) {
      const h = cleanInlineMarkdown(trimmed.slice(3));
      return `\n${h}\n${"-".repeat(Math.min(60, h.length))}`;
    }
    if (trimmed.startsWith("### ")) {
      return `\n[${cleanInlineMarkdown(trimmed.slice(4))}]`;
    }
    if (trimmed.startsWith("> ")) {
      return `  | ${cleanInlineMarkdown(trimmed.slice(2))}`;
    }
    return cleanInlineMarkdown(line);
  });

  const extras: string[] = [];
  const extraImages = selectedImagesNotInArticle(payload);
  if (extraImages.length) {
    extras.push("", "PICTURES", "--------");
    for (const image of extraImages) {
      extras.push(`${image.caption || image.alt || "Picture"}\nImage URL: ${image.url}`);
    }
  }

  const videos = selectedVideosNotInArticle(payload);
  if (videos.length) {
    extras.push("", "VIDEOS", "------");
    for (const video of videos) {
      extras.push(
        `${video.title} — ${video.channel}${video.duration ? ` (${video.duration})` : ""}\n${video.summary || ""}\nWatch: ${getVideoWatchUrl(video) || ""}${video.thumbnailUrl ? `\nThumbnail: ${video.thumbnailUrl}` : ""}`
      );
    }
  }

  const extraSources = selectedLinksNotInArticle(payload);
  if (extraSources.length) {
    extras.push("", "SOURCES AND FURTHER READING", "--------------------------");
    for (const source of extraSources) {
      extras.push(
        `${source.title} (${source.domain}${source.authorityType ? ` · ${source.authorityType}` : ""})\n${source.snippet || ""}\n${source.url}`
      );
    }
  }

  const header = [
    `TITLE: ${payload.title}`,
    `CATEGORY: ${payload.category} | AUDIENCE: ${payload.audience} | TONE: ${payload.tone}`,
    `WORDS: ${payload.wordCount}${
      payload.readabilityScore !== undefined
        ? ` | READABILITY: ${payload.readabilityScore}`
        : ""
    }${
      payload.naturalnessScore !== undefined
        ? ` | NATURALNESS: ${payload.naturalnessScore}/100`
        : ""
    }`,
    `EXPORTED: ${new Date().toISOString().split("T")[0]}`,
    divider,
    "",
  ].join("\n");

  return `${header}${lines.join("\n")}${extras.join("\n\n")}\n`;
}

export async function buildHtmlExport(payload: ExportPayload): Promise<string> {
  // Package photos inside the HTML file as data URLs so they remain visible
  // after the file is downloaded or moved to another computer.
  const imageUrls = new Set<string>([
    ...extractMarkdownImages(payload.markdown).map((image) => image.url),
    ...(payload.selectedImages ?? [])
      .map((image) => safeHttpUrl(image.url))
      .filter((url): url is string => Boolean(url)),
    ...(payload.selectedVideos ?? [])
      .map((video) => safeHttpUrl(video.thumbnailUrl || ""))
      .filter((url): url is string => Boolean(url)),
  ]);
  const embeddedSources = new Map<string, string>();
  await Promise.all(
    [...imageUrls].map(async (url) => {
      const asset = await fetchImageAsset(url);
      if (asset) {
        embeddedSources.set(
          url,
          `data:${asset.contentType};base64,${Buffer.from(asset.bytes).toString("base64")}`
        );
      }
    })
  );

  const bodyBlocks: string[] = [];
  const rawLines = payload.markdown.split("\n");
  let inList = false;

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      if (inList) {
        bodyBlocks.push("</ul>");
        inList = false;
      }
      continue;
    }

    if (trimmed.startsWith("- ")) {
      if (!inList) {
        bodyBlocks.push("<ul>");
        inList = true;
      }
      bodyBlocks.push(`<li>${formatInlineHtml(trimmed.slice(2), embeddedSources)}</li>`);
      continue;
    } else if (inList) {
      bodyBlocks.push("</ul>");
      inList = false;
    }

    if (trimmed.startsWith("# ")) {
      bodyBlocks.push(`<h1>${formatInlineHtml(trimmed.slice(2), embeddedSources)}</h1>`);
    } else if (trimmed.startsWith("## ")) {
      bodyBlocks.push(`<h2>${formatInlineHtml(trimmed.slice(3), embeddedSources)}</h2>`);
    } else if (trimmed.startsWith("### ")) {
      bodyBlocks.push(`<h3>${formatInlineHtml(trimmed.slice(4), embeddedSources)}</h3>`);
    } else if (trimmed.startsWith("> ")) {
      bodyBlocks.push(`<blockquote>${formatInlineHtml(trimmed.slice(2), embeddedSources)}</blockquote>`);
    } else if (trimmed.startsWith("![")) {
      bodyBlocks.push(formatInlineHtml(trimmed, embeddedSources));
    } else {
      bodyBlocks.push(`<p>${formatInlineHtml(trimmed, embeddedSources)}</p>`);
    }
  }
  if (inList) bodyBlocks.push("</ul>");

  const mediaSections = [
    supplementalImagesHtml(payload, embeddedSources),
    videosHtml(payload, embeddedSources),
    sourcesHtml(payload),
  ].filter(Boolean);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(payload.title)}</title>
  <style>
    :root { --bg:#FAF8F5; --card:#FFFFFF; --border:#E6E1D8; --ink:#18181B; --body:#27272A; --accent:#C84B31; --quote-bg:#FAF6F2; }
    html.dark { --bg:#0C0D10; --card:#14161B; --border:#262A34; --ink:#F4F4F6; --body:#D4D8E2; --accent:#E06348; --quote-bg:#1B1E26; }
    body { margin:0; padding:48px 20px; background:var(--bg); color:var(--ink); font-family:Georgia,'Times New Roman',serif; line-height:1.78; transition:background .2s ease,color .2s ease; }
    main { max-width:780px; margin:0 auto; background:var(--card); padding:56px 64px; border:1px solid var(--border); border-radius:16px; box-shadow:0 12px 32px rgba(0,0,0,.06); }
    .meta-bar { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px; font-family:system-ui,sans-serif; font-size:12px; text-transform:uppercase; letter-spacing:.08em; color:var(--accent); border-bottom:1px solid var(--border); padding-bottom:14px; margin-bottom:28px; }
    .theme-btn { cursor:pointer; padding:6px 12px; border-radius:999px; border:1px solid var(--border); background:var(--bg); color:var(--ink); font-size:11px; font-weight:600; }
    h1 { font-size:2.35rem; line-height:1.2; margin:0 0 18px; color:var(--ink); }
    h2 { font-size:1.55rem; margin-top:2.2rem; margin-bottom:.75rem; color:var(--ink); border-bottom:1px solid var(--border); padding-bottom:6px; }
    h3 { font-size:1.2rem; margin-top:1.5rem; margin-bottom:.5rem; color:var(--ink); }
    p,li { font-size:1.08rem; color:var(--body); }
    a { color:var(--accent); text-decoration:underline; }
    blockquote { margin:24px 0; padding:16px 22px; border-left:4px solid var(--accent); background:var(--quote-bg); border-radius:0 10px 10px 0; font-style:italic; }
    .article-figure { margin:28px 0; }
    .article-figure img { width:100%; max-height:520px; object-fit:cover; border-radius:10px; display:block; }
    figcaption { margin-top:8px; font:12px system-ui,sans-serif; color:#71717A; }
    .media-section { margin-top:48px; padding-top:20px; border-top:2px solid var(--border); }
    .media-intro { font:13px system-ui,sans-serif; color:#71717A; }
    .video-card { margin:20px 0; padding:16px; border:1px solid var(--border); border-radius:14px; background:var(--quote-bg); }
    .video-frame { width:100%; aspect-ratio:16/9; background:#08090b; border-radius:10px; overflow:hidden; }
    .video-frame iframe { width:100%; height:100%; border:0; }
    .video-thumb { display:inline-block; position:relative; margin-top:12px; max-width:240px; text-decoration:none; }
    .video-thumb img { display:block; max-width:100%; width:100%; border-radius:10px; }
    .video-thumb span { display:block; margin-top:5px; font:12px system-ui,sans-serif; }
    .video-meta,.source-domain { font:12px system-ui,sans-serif; color:#71717A; }
    .video-info p,.media-section li p { font:14px/1.6 system-ui,sans-serif; color:var(--body); }
    .watch-link { display:inline-block; margin-top:4px; font:600 13px system-ui,sans-serif; }
    .media-section ol { padding-left:22px; }
    .source-domain { display:block; margin-top:3px; }
    @media (max-width:640px) { body { padding:20px 10px; } main { padding:28px 22px; } h1 { font-size:1.8rem; } }
    @media print { body { padding:0; background:white; } main { border:0; box-shadow:none; padding:24px; } .theme-btn { display:none; } .video-frame { display:none; } }
  </style>
</head>
<body>
  <main>
    <div class="meta-bar">
      <span>${escapeHtml(payload.category)} &bull; Audience: ${escapeHtml(payload.audience)} &bull; Tone: ${escapeHtml(payload.tone)} &bull; ${payload.wordCount} Words</span>
      <button class="theme-btn" onclick="document.documentElement.classList.toggle('dark')">Toggle Dark / Light</button>
    </div>
    ${bodyBlocks.join("\n    ")}
    ${mediaSections.join("\n")}
  </main>
</body>
</html>`;
}

function docxInlineRuns(text: string): ParagraphChild[] {
  const runs: ParagraphChild[] = [];
  const regex = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let last = 0;
  let key = 0;
  for (const match of text.matchAll(regex)) {
    const index = match.index ?? 0;
    if (index > last) {
      runs.push(new TextRun({ text: text.slice(last, index), size: 23 }));
    }
    if (match[2] && match[3]) {
      const url = safeHttpUrl(match[3]);
      if (url) {
        runs.push(
          new ExternalHyperlink({
            children: [new TextRun({ text: match[2], style: "Hyperlink" })],
            link: url,
          })
        );
      } else {
        runs.push(new TextRun({ text: match[2], size: 23 }));
      }
    } else if (match[4]) {
      runs.push(new TextRun({ text: match[4], bold: true, size: 23 }));
    } else if (match[5]) {
      runs.push(new TextRun({ text: match[5], italics: true, size: 23 }));
    }
    last = index + match[0].length;
    key += 1;
  }
  if (last < text.length) {
    runs.push(new TextRun({ text: text.slice(last), size: 23 }));
  }
  return runs.length ? runs : [new TextRun({ text, size: 23 })];
}

function makeDocxImageRun(
  asset: ImageAsset,
  alt: string,
  sourceUrl: string
): ImageRun {
  const dimensions = imageDimensions(asset.bytes, asset.type);
  const scale = Math.min(520 / dimensions.width, 340 / dimensions.height, 1);
  return new ImageRun({
    data: asset.bytes,
    type: asset.type,
    transformation: {
      width: Math.max(1, Math.round(dimensions.width * scale)),
      height: Math.max(1, Math.round(dimensions.height * scale)),
    },
    altText: { name: alt || "Article image", title: alt, description: alt },
    link: safeHttpUrl(sourceUrl) || undefined,
  });
}

function pushDocxImage(
  paragraphs: Paragraph[],
  asset: ImageAsset | null,
  alt: string,
  url: string,
  caption?: string
): void {
  if (asset) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 60 },
        children: [makeDocxImageRun(asset, alt, url)],
      })
    );
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 180 },
        children: [
          new TextRun({ text: caption || alt, italics: true, size: 18, color: "666666" }),
        ],
      })
    );
  } else {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({ text: `Picture: ${caption || alt} `, italics: true, size: 20 }),
          new ExternalHyperlink({
            children: [new TextRun({ text: "Open picture", style: "Hyperlink" })],
            link: safeHttpUrl(url) || url,
          }),
        ],
      })
    );
  }
}

export async function buildDocxExport(payload: ExportPayload): Promise<Uint8Array> {
  const imageCache = new Map<string, Promise<ImageAsset | null>>();
  const loadImage = (url: string) => {
    if (!imageCache.has(url)) imageCache.set(url, fetchImageAsset(url));
    return imageCache.get(url)!;
  };

  // Fetch media in parallel so the export remains quick even with several images.
  const markdownImages = extractMarkdownImages(payload.markdown);
  const supplementalImages = selectedImagesNotInArticle(payload);
  const videos = selectedVideosNotInArticle(payload);
  await Promise.all([
    ...markdownImages.map((image) => loadImage(image.url)),
    ...supplementalImages.map((image) => loadImage(image.url)),
    ...videos.filter((video) => video.thumbnailUrl).map((video) => loadImage(video.thumbnailUrl)),
  ]);

  const paragraphs: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: `${payload.category.toUpperCase()}  •  AUDIENCE: ${payload.audience.toUpperCase()}  •  ${payload.wordCount} WORDS`,
          size: 18,
          color: "C84B31",
          bold: true,
        }),
      ],
    }),
  ];

  const lines = payload.markdown.split("\n");
  for (let index = 0; index < lines.length; index++) {
    const trimmed = lines[index].trim();
    if (!trimmed) continue;

    const markdownImage = imageUrlFromMarkdownLine(trimmed);
    if (markdownImage) {
      let caption = markdownImage.alt;
      if (
        index + 1 < lines.length &&
        lines[index + 1].trim().startsWith("*") &&
        lines[index + 1].trim().endsWith("*")
      ) {
        caption = cleanInlineMarkdown(lines[index + 1].trim());
        index += 1;
      }
      const asset = await loadImage(markdownImage.url);
      pushDocxImage(paragraphs, asset, markdownImage.alt, markdownImage.url, caption);
      continue;
    }

    if (trimmed.startsWith("# ")) {
      paragraphs.push(
        new Paragraph({
          text: cleanInlineMarkdown(trimmed.slice(2)),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 120, after: 240 },
        })
      );
    } else if (trimmed.startsWith("## ")) {
      paragraphs.push(
        new Paragraph({
          text: cleanInlineMarkdown(trimmed.slice(3)),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 280, after: 140 },
        })
      );
    } else if (trimmed.startsWith("### ")) {
      paragraphs.push(
        new Paragraph({
          text: cleanInlineMarkdown(trimmed.slice(4)),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      );
    } else if (trimmed.startsWith("- ")) {
      paragraphs.push(
        new Paragraph({
          children: docxInlineRuns(trimmed.slice(2)),
          bullet: { level: 0 },
          spacing: { after: 100 },
        })
      );
    } else if (trimmed.startsWith("> ")) {
      paragraphs.push(
        new Paragraph({
          indent: { left: 480 },
          spacing: { before: 140, after: 140 },
          children: docxInlineRuns(trimmed.slice(2)).map((run) => run),
        })
      );
    } else {
      paragraphs.push(
        new Paragraph({
          spacing: { after: 160, line: 340 },
          children: docxInlineRuns(trimmed),
        })
      );
    }
  }

  if (supplementalImages.length) {
    paragraphs.push(
      new Paragraph({
        text: "More pictures",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 360, after: 180 },
      })
    );
    for (const image of supplementalImages) {
      pushDocxImage(
        paragraphs,
        await loadImage(image.url),
        image.alt || image.caption,
        image.url,
        image.caption
      );
    }
  }

  if (videos.length) {
    paragraphs.push(
      new Paragraph({
        text: "Videos",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 360, after: 180 },
      })
    );
    for (const video of videos) {
      if (video.thumbnailUrl) {
        const asset = await loadImage(video.thumbnailUrl);
        if (asset) {
          paragraphs.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 100, after: 60 },
              children: [
                makeDocxImageRun(asset, video.title, getVideoWatchUrl(video) || video.thumbnailUrl),
              ],
            })
          );
        }
      }
      paragraphs.push(
        new Paragraph({
          spacing: { before: 80, after: 80 },
          children: [new TextRun({ text: video.title, bold: true, size: 24 })],
        })
      );
      paragraphs.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: `${video.channel}${video.duration ? ` · ${video.duration}` : ""}`,
              italics: true,
              size: 19,
              color: "666666",
            }),
          ],
        })
      );
      if (video.summary) {
        paragraphs.push(
          new Paragraph({
            spacing: { after: 80 },
            children: docxInlineRuns(video.summary),
          })
        );
      }
      const watchUrl = getVideoWatchUrl(video);
      if (watchUrl) {
        paragraphs.push(
          new Paragraph({
            spacing: { after: 220 },
            children: [
              new ExternalHyperlink({
                children: [new TextRun({ text: "Watch this video", style: "Hyperlink" })],
                link: watchUrl,
              }),
            ],
          })
        );
      }
    }
  }

  const sources = selectedLinksNotInArticle(payload);
  if (sources.length) {
    paragraphs.push(
      new Paragraph({
        text: "Sources and further reading",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 360, after: 180 },
      })
    );
    for (const source of sources) {
      const url = safeHttpUrl(source.url);
      paragraphs.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 130 },
          children: [
            ...(url
              ? [
                  new ExternalHyperlink({
                    children: [new TextRun({ text: source.title, style: "Hyperlink" })],
                    link: url,
                  }),
                ]
              : [new TextRun({ text: source.title, bold: true })]),
            new TextRun({
              text: ` — ${source.domain}${source.authorityType ? ` · ${source.authorityType}` : ""}${source.snippet ? `\n${source.snippet}` : ""}`,
              size: 20,
            }),
          ],
        })
      );
    }
  }

  const doc = new Document({
    title: payload.title,
    description: `${payload.category} article for ${payload.audience}`,
    sections: [{ properties: {}, children: paragraphs }],
  });

  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}

export async function buildPdfExport(payload: ExportPayload): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const serifRegular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const sansBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const sansRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const marginX = 56;
  const maxWidth = pageWidth - marginX * 2;
  const bottomMargin = 62;
  const imageCache = new Map<string, Promise<ImageAsset | null>>();
  const pdfImageCache = new Map<string, ReturnType<typeof pdfDoc.embedJpg> extends Promise<infer T> ? T : never>();
  const loadImage = (url: string) => {
    if (!imageCache.has(url)) imageCache.set(url, fetchImageAsset(url));
    return imageCache.get(url)!;
  };

  const markdownImages = extractMarkdownImages(payload.markdown);
  const extraImages = selectedImagesNotInArticle(payload);
  const videos = selectedVideosNotInArticle(payload);
  await Promise.all([
    ...markdownImages.map((image) => loadImage(image.url)),
    ...extraImages.map((image) => loadImage(image.url)),
    ...videos.filter((video) => video.thumbnailUrl).map((video) => loadImage(video.thumbnailUrl)),
  ]);

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let cursorY = pageHeight - 60;

  const ensureSpace = (needed: number) => {
    if (cursorY - needed < bottomMargin) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      cursorY = pageHeight - 56;
    }
  };

  const addLinkAnnotation = (x: number, y: number, width: number, height: number, url: string) => {
    const safeUrl = safeHttpUrl(url);
    if (!safeUrl) return;
    const annotation = pdfDoc.context.obj({
      Type: PDFName.of("Annot"),
      Subtype: PDFName.of("Link"),
      Rect: [x, y, x + width, y + height],
      Border: [0, 0, 0],
      A: {
        Type: PDFName.of("Action"),
        S: PDFName.of("URI"),
        URI: PDFString.of(safeUrl),
      },
    });
    page.node.addAnnot(pdfDoc.context.register(annotation));
  };

  const drawWrappedText = (
    rawText: string,
    font: typeof serifRegular,
    fontSize: number,
    lineHeight: number,
    color = rgb(0.12, 0.12, 0.14),
    indent = 0
  ) => {
    const safe = sanitizePdfText(rawText);
    if (!safe) return;
    const words = safe.split(/\s+/);
    let currentLine = "";
    const effectiveWidth = maxWidth - indent;

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(candidate, fontSize);
      if (width > effectiveWidth && currentLine) {
        ensureSpace(lineHeight);
        page.drawText(currentLine, {
          x: marginX + indent,
          y: cursorY,
          size: fontSize,
          font,
          color,
        });
        cursorY -= lineHeight;
        currentLine = word;
      } else {
        currentLine = candidate;
      }
    }

    if (currentLine) {
      ensureSpace(lineHeight);
      page.drawText(currentLine, {
        x: marginX + indent,
        y: cursorY,
        size: fontSize,
        font,
        color,
      });
      cursorY -= lineHeight;
    }
  };

  const drawClickableUrl = (rawUrl: string) => {
    const url = safeHttpUrl(rawUrl);
    if (!url) return;
    const fontSize = 8.5;
    const lineHeight = 12;
    const words = url.split(/(?<=\/)|(?<=\.)|(?<=\?)|(?<=&)/);
    let current = "";
    for (const part of words) {
      const candidate = current + part;
      if (sansRegular.widthOfTextAtSize(candidate, fontSize) > maxWidth && current) {
        ensureSpace(lineHeight);
        const x = marginX;
        const y = cursorY;
        page.drawText(current, { x, y, size: fontSize, font: sansRegular, color: rgb(0.72, 0.22, 0.14) });
        addLinkAnnotation(x, y - 2, Math.min(maxWidth, sansRegular.widthOfTextAtSize(current, fontSize) + 2), lineHeight, url);
        cursorY -= lineHeight;
        current = part;
      } else {
        current = candidate;
      }
    }
    if (current) {
      ensureSpace(lineHeight);
      const x = marginX;
      const y = cursorY;
      page.drawText(current, { x, y, size: fontSize, font: sansRegular, color: rgb(0.72, 0.22, 0.14) });
      addLinkAnnotation(x, y - 2, Math.min(maxWidth, sansRegular.widthOfTextAtSize(current, fontSize) + 2), lineHeight, url);
      cursorY -= lineHeight;
    }
  };

  const getPdfImage = async (url: string) => {
    if (pdfImageCache.has(url)) return pdfImageCache.get(url)!;
    const asset = await loadImage(url);
    if (!asset || !["jpg", "png"].includes(asset.type)) return null;
    try {
      const embedded = asset.type === "jpg"
        ? await pdfDoc.embedJpg(asset.bytes)
        : await pdfDoc.embedPng(asset.bytes);
      pdfImageCache.set(url, embedded);
      return embedded;
    } catch {
      return null;
    }
  };

  const drawImage = async (url: string, alt: string, caption = "") => {
    const embedded = await getPdfImage(url);
    if (!embedded) {
      drawWrappedText(`[Picture: ${caption || alt}]`, serifItalic, 9.5, 14, rgb(0.4, 0.4, 0.43));
      drawClickableUrl(url);
      cursorY -= 4;
      return;
    }

    const scale = Math.min(maxWidth / embedded.width, 280 / embedded.height, 1);
    const width = embedded.width * scale;
    const height = embedded.height * scale;
    ensureSpace(height + 40);
    page.drawImage(embedded, {
      x: marginX + (maxWidth - width) / 2,
      y: cursorY - height,
      width,
      height,
    });
    cursorY -= height + 8;
    drawWrappedText(caption || alt, serifItalic, 9.5, 14, rgb(0.4, 0.4, 0.43));
    cursorY -= 8;
  };

  const drawSectionHeading = (text: string) => {
    cursorY -= 8;
    drawWrappedText(text, sansBold, 14, 20, rgb(0.1, 0.1, 0.12));
    cursorY -= 4;
  };

  drawWrappedText(
    `${payload.category.toUpperCase()}  |  AUDIENCE: ${payload.audience.toUpperCase()}  |  ${payload.wordCount} WORDS`,
    sansBold,
    8.5,
    14,
    rgb(0.78, 0.29, 0.19)
  );
  cursorY -= 8;

  const lines = payload.markdown.split("\n");
  for (let index = 0; index < lines.length; index++) {
    const trimmed = lines[index].trim();
    if (!trimmed) {
      cursorY -= 6;
      continue;
    }

    const markdownImage = imageUrlFromMarkdownLine(trimmed);
    if (markdownImage) {
      let caption = markdownImage.alt;
      if (
        index + 1 < lines.length &&
        lines[index + 1].trim().startsWith("*") &&
        lines[index + 1].trim().endsWith("*")
      ) {
        caption = cleanInlineMarkdown(lines[index + 1].trim());
        index += 1;
      }
      await drawImage(markdownImage.url, markdownImage.alt, caption);
      continue;
    }

    if (trimmed.startsWith("# ")) {
      cursorY -= 4;
      drawWrappedText(cleanInlineMarkdown(trimmed.slice(2)), serifBold, 21, 27, rgb(0.08, 0.08, 0.1));
      cursorY -= 10;
    } else if (trimmed.startsWith("## ")) {
      drawSectionHeading(cleanInlineMarkdown(trimmed.slice(3)));
    } else if (trimmed.startsWith("### ")) {
      cursorY -= 5;
      drawWrappedText(cleanInlineMarkdown(trimmed.slice(4)), serifBold, 12, 17, rgb(0.18, 0.18, 0.2));
      cursorY -= 2;
    } else if (trimmed.startsWith("> ")) {
      drawWrappedText(cleanInlineMarkdown(trimmed.slice(2)), serifItalic, 11, 16, rgb(0.28, 0.25, 0.22), 14);
      cursorY -= 4;
    } else if (trimmed.startsWith("- ")) {
      drawWrappedText(`• ${cleanInlineMarkdown(trimmed.slice(2))}`, serifRegular, 11, 16, rgb(0.14, 0.14, 0.16), 10);
    } else if (trimmed.startsWith("*Figure") || trimmed.startsWith("*Category:")) {
      drawWrappedText(cleanInlineMarkdown(trimmed), serifItalic, 9.5, 14, rgb(0.4, 0.4, 0.43));
      cursorY -= 4;
    } else {
      drawWrappedText(cleanInlineMarkdown(trimmed), serifRegular, 11.2, 16.8, rgb(0.14, 0.14, 0.16));
      cursorY -= 4;
    }
  }

  if (extraImages.length) {
    drawSectionHeading("More pictures");
    for (const image of extraImages) {
      await drawImage(image.url, image.alt || image.caption, image.caption);
    }
  }

  if (videos.length) {
    drawSectionHeading("Videos and watch links");
    for (const video of videos) {
      ensureSpace(30);
      drawWrappedText(video.title, serifBold, 11, 16, rgb(0.12, 0.12, 0.14));
      drawWrappedText(
        `${video.channel}${video.duration ? ` · ${video.duration}` : ""}`,
        sansRegular,
        8.5,
        13,
        rgb(0.4, 0.4, 0.43)
      );
      if (video.summary) drawWrappedText(video.summary, serifRegular, 10, 15, rgb(0.2, 0.2, 0.22));
      if (video.thumbnailUrl) {
        await drawImage(video.thumbnailUrl, video.title, "Video preview image");
      }
      const watchUrl = getVideoWatchUrl(video);
      if (watchUrl) {
        drawWrappedText("Watch this video:", sansBold, 8.5, 12, rgb(0.72, 0.22, 0.14));
        drawClickableUrl(watchUrl);
      }
      cursorY -= 8;
    }
  }

  const sources = (payload.selectedLinks ?? []).filter((source) =>
    Boolean(safeHttpUrl(source.url))
  );
  if (sources.length) {
    drawSectionHeading("Sources and further reading");
    for (const source of sources) {
      drawWrappedText(source.title, serifBold, 10.5, 15, rgb(0.14, 0.14, 0.16));
      drawWrappedText(
        `${source.domain}${source.authorityType ? ` · ${source.authorityType}` : ""}`,
        sansRegular,
        8.5,
        12,
        rgb(0.4, 0.4, 0.43)
      );
      if (source.snippet) drawWrappedText(source.snippet, serifRegular, 10, 15, rgb(0.2, 0.2, 0.22));
      drawClickableUrl(source.url);
      cursorY -= 6;
    }
  }

  const pages = pdfDoc.getPages();
  pages.forEach((pdfPage, idx) => {
    pdfPage.drawText(`VerbaCraft AI  -  Page ${idx + 1} of ${pages.length}`, {
      x: marginX,
      y: 28,
      size: 8.5,
      font: serifItalic,
      color: rgb(0.5, 0.5, 0.52),
    });
  });

  return pdfDoc.save();
}

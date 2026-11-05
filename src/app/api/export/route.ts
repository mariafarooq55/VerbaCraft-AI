import { NextResponse } from "next/server";
import { getArticle } from "@/lib/article-store";
import type {
  ExternalReference,
  MediaImage,
  MediaVideo,
} from "@/types/article";
import { getCurrentUser } from "@/lib/auth";
import {
  buildDocxExport,
  buildHtmlExport,
  buildPdfExport,
  buildTxtExport,
  type ExportPayload,
} from "@/lib/export-builder";

export const dynamic = "force-dynamic";

function readArrayField<T>(value: FormDataEntryValue | null): T[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function readBodyArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

async function generateExportResponse(
  formatRaw: string,
  payload: ExportPayload
): Promise<Response> {
  const format = formatRaw.toLowerCase();
  const safeSlug =
    payload.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "verbacraft-article";

  const makeHeaders = (contentType: string, ext: string, byteLength: number) => ({
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${safeSlug}.${ext}"; filename*=UTF-8''${encodeURIComponent(
      safeSlug
    )}.${ext}`,
    "Content-Length": String(byteLength),
    "Cache-Control": "private, no-cache, no-store, must-revalidate",
    "X-Download-Options": "noopen",
  });

  if (format === "txt") {
    const txt = buildTxtExport(payload);
    const bytes = Buffer.from(txt, "utf-8");
    return new Response(bytes, {
      status: 200,
      headers: makeHeaders("text/plain; charset=utf-8", "txt", bytes.byteLength),
    });
  }

  if (format === "html") {
    const html = await buildHtmlExport(payload);
    const bytes = new Uint8Array(Buffer.from(html, "utf-8"));
    return new Response(bytes, {
      status: 200,
      headers: makeHeaders("text/html; charset=utf-8", "html", bytes.byteLength),
    });
  }

  if (format === "docx") {
    const raw = await buildDocxExport(payload);
    const bytes = Buffer.from(raw);
    return new Response(bytes, {
      status: 200,
      headers: makeHeaders(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "docx",
        bytes.byteLength
      ),
    });
  }

  // Default to PDF
  const raw = await buildPdfExport(payload);
  const bytes = Buffer.from(raw);
  return new Response(bytes, {
    status: 200,
    headers: makeHeaders("application/pdf", "pdf", bytes.byteLength),
  });
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in to download your articles." }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");
    const format = searchParams.get("format") || "pdf";

    if (!idParam) {
      return NextResponse.json(
        { error: "This download link is incomplete. Please try again from the app." },
        { status: 400 }
      );
    }

    const row = await getArticle(idParam, user.id);

    if (!row) {
      return NextResponse.json(
        { error: "We could not find that article." },
        { status: 404 }
      );
    }

    const markdown =
      row.finalContent || row.humanizedDraft || row.rawDraft || `# ${row.fixedTitle}`;

    return generateExportResponse(format, {
      title: row.fixedTitle,
      category: row.category,
      audience: row.audience,
      tone: row.tone,
      markdown,
      wordCount:
        row.afterAnalysis?.wordCount ||
        markdown.trim().split(/\s+/).filter(Boolean).length,
      readabilityScore: row.afterAnalysis?.fleschReadingEase,
      naturalnessScore: row.afterAnalysis?.humanNaturalnessScore,
      selectedImages: row.selectedImages ?? [],
      selectedVideos: row.selectedVideos ?? [],
      selectedLinks: row.selectedLinks ?? [],
    });
  } catch (err) {
    console.error("GET /api/export error:", err);
    return NextResponse.json(
      { error: "Could not create your download. Please try again." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!(await getCurrentUser())) {
    return NextResponse.json(
      { error: "Please sign in to download your articles." },
      { status: 401 }
    );
  }
  try {
    const contentType = request.headers.get("content-type") || "";
    let format = "pdf";
    let title = "Intelligent Article";
    let category = "Editorial";
    let audience = "General Readers";
    let tone = "Authoritative";
    let markdown = "";
    let wordCount = 0;
    let readabilityScore: number | undefined;
    let naturalnessScore: number | undefined;
    let selectedImages: MediaImage[] = [];
    let selectedVideos: MediaVideo[] = [];
    let selectedLinks: ExternalReference[] = [];

    if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const formData = await request.formData();
      format = String(formData.get("format") || "pdf");
      title = String(formData.get("title") || "Intelligent Article").trim();
      category = String(formData.get("category") || "Editorial");
      audience = String(formData.get("audience") || "General Readers");
      tone = String(formData.get("tone") || "Authoritative");
      markdown = String(formData.get("markdown") || "").trim();
      wordCount = Number(formData.get("wordCount") || 0);
      const rScore = formData.get("readabilityScore");
      const nScore = formData.get("naturalnessScore");
      if (rScore) readabilityScore = Number(rScore);
      if (nScore) naturalnessScore = Number(nScore);
      selectedImages = readArrayField<MediaImage>(formData.get("selectedImages"));
      selectedVideos = readArrayField<MediaVideo>(formData.get("selectedVideos"));
      selectedLinks = readArrayField<ExternalReference>(formData.get("selectedLinks"));
    } else {
      const body = await request.json();
      format = String(body.format || "pdf");
      title = String(body.title || "Intelligent Article").trim();
      category = String(body.category || "Editorial");
      audience = String(body.audience || "General Readers");
      tone = String(body.tone || "Authoritative");
      markdown = String(body.markdown || "").trim();
      wordCount = Number(body.wordCount) || 0;
      readabilityScore = body.readabilityScore
        ? Number(body.readabilityScore)
        : undefined;
      naturalnessScore = body.naturalnessScore
        ? Number(body.naturalnessScore)
        : undefined;
      selectedImages = readBodyArray<MediaImage>(body.selectedImages);
      selectedVideos = readBodyArray<MediaVideo>(body.selectedVideos);
      selectedLinks = readBodyArray<ExternalReference>(body.selectedLinks);
    }

    if (!markdown) {
      return NextResponse.json(
        { error: "Your article is empty. Write something first, then download it." },
        { status: 400 }
      );
    }

    if (!wordCount) {
      wordCount = markdown.split(/\s+/).filter(Boolean).length;
    }

    return generateExportResponse(format, {
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
    });
  } catch (err) {
    console.error("POST /api/export error:", err);
    return NextResponse.json(
      { error: "Could not create your download. Please try again." },
      { status: 500 }
    );
  }
}

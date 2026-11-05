import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import {
  mongoListArticles,
  mongoGetArticle,
  mongoSaveArticle,
  mongoDeleteArticle,
  type MongoArticleInput,
} from "@/lib/mongodb-store";
import type { ArticleRecord } from "@/types/article";
import { analyzeArticleContent } from "./nlp-analyzer";

export interface ArticleInput {
  id?: string;
  userId?: string;
  slug?: string;
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
  outline: import("@/types/article").OutlineSection[];
  faqs: import("@/types/article").FaqItem[];
  selectedImages: import("@/types/article").MediaImage[];
  selectedVideos: import("@/types/article").MediaVideo[];
  selectedLinks: import("@/types/article").ExternalReference[];
  rawDraft: string;
  humanizedDraft: string;
  finalContent: string;
  beforeAnalysis?: import("@/types/article").ArticleAnalysis | null;
  afterAnalysis?: import("@/types/article").ArticleAnalysis | null;
  humanizationStyle?: string;
  storageBackend?: string;
}

export type StorageMode = "database" | "file";

interface StorageInfo {
  mode: StorageMode;
  label: string;
  note: string;
}

const LOCAL_DATA_DIR = path.join(process.cwd(), ".data");
const LOCAL_FILE = path.join(LOCAL_DATA_DIR, "articles.json");

const globalForStore = globalThis as typeof globalThis & {
  __verbacraftLocalArticles?: ArticleRecord[];
  __verbacraftDbBroken?: boolean;
};

let dbBroken = globalForStore.__verbacraftDbBroken ?? false;

function markDbBroken(error: unknown) {
  if (!dbBroken) {
    console.warn(
      "Database unavailable — saving articles to the local .data folder instead:",
      error instanceof Error ? error.message : error
    );
  }
  dbBroken = true;
  globalForStore.__verbacraftDbBroken = true;
}

function shouldUseMongo(): boolean {
  return Boolean(process.env.MONGODB_URI && process.env.MONGODB_URI.trim()) && !dbBroken;
}

export async function storageInfo(): Promise<StorageInfo> {
  if (shouldUseMongo()) {
    return {
      mode: "database",
      label: "MongoDB Atlas",
      note: "Your articles are stored in MongoDB Atlas.",
    };
  }
  return {
    mode: "file",
    label: "This computer",
    note: "No database is connected, so articles are saved to a local file in the project's .data folder.",
  };
}

function toIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
    return value;
  }
  return new Date().toISOString();
}

async function normalise(input: ArticleInput): Promise<ArticleInput> {
  const finalContent = input.finalContent.trim();
  const keywords = [...(input.aiKeywords ?? []), ...(input.userKeywords ?? [])];
  const beforeAnalysis =
    input.beforeAnalysis ??
    analyzeArticleContent(input.rawDraft || finalContent, keywords);
  const afterAnalysis =
    input.afterAnalysis ?? analyzeArticleContent(finalContent, keywords);
  const slug =
    input.slug ||
    input.fixedTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) ||
    `article-${Date.now()}`;

  return {
    ...input,
    slug,
    finalContent,
    rawDraft: input.rawDraft || finalContent,
    humanizedDraft: input.humanizedDraft || finalContent,
    beforeAnalysis,
    afterAnalysis,
    aiKeywords: input.aiKeywords ?? [],
    userKeywords: input.userKeywords ?? [],
    guidedAnswers: input.guidedAnswers ?? {},
    outline: input.outline ?? [],
    faqs: input.faqs ?? [],
    selectedImages: input.selectedImages ?? [],
    selectedVideos: input.selectedVideos ?? [],
    selectedLinks: input.selectedLinks ?? [],
    humanizationStyle: input.humanizationStyle || "Natural Editorial",
    storageBackend: input.storageBackend || "Saved in this app",
  };
}

/* ---------------------------- Local file store ---------------------------- */

async function readLocal(): Promise<ArticleRecord[]> {
  try {
    const raw = await readFile(LOCAL_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as ArticleRecord[];
  } catch {
    // No file yet — start with an empty list.
  }
  return [];
}

async function writeLocal(rows: ArticleRecord[]): Promise<void> {
  try {
    await mkdir(LOCAL_DATA_DIR, { recursive: true });
    await writeFile(LOCAL_FILE, JSON.stringify(rows, null, 2), "utf8");
  } catch (err) {
    console.warn(
      "Could not write the local articles file. Articles stay available in memory for this session:",
      err instanceof Error ? err.message : err
    );
  }
}

/* -------------------------------- Public API ------------------------------ */

export async function listArticles(userId?: string): Promise<ArticleRecord[]> {
  if (shouldUseMongo()) {
    try {
      return await mongoListArticles(userId ?? "");
    } catch (err) {
      markDbBroken(err);
    }
  }
  const local = await readLocal();
  return [...local]
    .filter((article) => userId === undefined || article.userId === userId)
    .sort((a, b) => {
      const diff = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      return diff !== 0 ? diff : b.id.localeCompare(a.id);
    });
}

export async function getArticle(
  id: string,
  userId?: string,
): Promise<ArticleRecord | null> {
  if (!id) return null;

  if (shouldUseMongo()) {
    try {
      return await mongoGetArticle(id, userId ?? "");
    } catch (err) {
      markDbBroken(err);
    }
  }

  const local = await readLocal();
  return local.find((item) => item.id === id && (userId === undefined || item.userId === userId)) ?? null;
}

export async function saveArticle(input: ArticleInput): Promise<{
  article: ArticleRecord;
  mode: "created" | "updated";
}> {
  const prepared = await normalise(input);
  const now = new Date().toISOString();

  if (shouldUseMongo()) {
    try {
      const mongoInput: MongoArticleInput = {
        id: prepared.id,
        ownerEmail: prepared.userId ?? "",
        slug: prepared.slug as string,
        topic: prepared.topic,
        fixedTitle: prepared.fixedTitle,
        category: prepared.category,
        audience: prepared.audience,
        tone: prepared.tone,
        purpose: prepared.purpose,
        targetWordCount: prepared.targetWordCount,
        guidedAnswers: prepared.guidedAnswers,
        aiKeywords: prepared.aiKeywords,
        userKeywords: prepared.userKeywords,
        outline: prepared.outline,
        faqs: prepared.faqs,
        selectedImages: prepared.selectedImages,
        selectedVideos: prepared.selectedVideos,
        selectedLinks: prepared.selectedLinks,
        rawDraft: prepared.rawDraft,
        humanizedDraft: prepared.humanizedDraft,
        finalContent: prepared.finalContent,
        beforeAnalysis: prepared.beforeAnalysis ?? undefined,
        afterAnalysis: prepared.afterAnalysis ?? undefined,
        humanizationStyle: prepared.humanizationStyle ?? "Natural Editorial",
        storageBackend: prepared.storageBackend ?? "Saved in this app",
      };
      return await mongoSaveArticle(mongoInput);
    } catch (err) {
      markDbBroken(err);
    }
  }

  // Local file fallback, scoped to the signed-in account.
  const local = await readLocal();
  const existingIndex = prepared.id
    ? local.findIndex(
        (item) =>
          item.id === prepared.id &&
          (prepared.userId === undefined
            ? item.userId === undefined
            : item.userId === prepared.userId)
      )
    : -1;

  if (existingIndex >= 0) {
    const existing = local[existingIndex];
    const updated: ArticleRecord = {
      ...existing,
      ...prepared,
      id: existing.id,
      userId: prepared.userId,
      slug: prepared.slug as string,
      beforeAnalysis: prepared.beforeAnalysis!,
      afterAnalysis: prepared.afterAnalysis!,
      humanizationStyle: prepared.humanizationStyle as string,
      storageBackend: prepared.storageBackend as string,
      createdAt: existing.createdAt,
      updatedAt: now,
    } as ArticleRecord;
    local[existingIndex] = updated;
    await writeLocal(local);
    return { article: updated, mode: "updated" };
  }

  const created: ArticleRecord = {
    ...prepared,
    id: prepared.id ?? `article-${Date.now()}`,
    userId: prepared.userId,
    slug: prepared.slug as string,
    beforeAnalysis: prepared.beforeAnalysis!,
    afterAnalysis: prepared.afterAnalysis!,
    humanizationStyle: prepared.humanizationStyle as string,
    storageBackend: prepared.storageBackend as string,
    createdAt: now,
    updatedAt: now,
  } as ArticleRecord;
  local.unshift(created);
  await writeLocal(local);
  return { article: created, mode: "created" };
}

export async function deleteArticle(id: string, userId?: string): Promise<boolean> {
  if (!id) return false;

  if (shouldUseMongo()) {
    try {
      return await mongoDeleteArticle(id, userId ?? "");
    } catch (err) {
      markDbBroken(err);
    }
  }

  const local = await readLocal();
  const remaining = local.filter(
    (item) => !(item.id === id && (userId === undefined || item.userId === userId))
  );
  if (remaining.length === local.length) return false;
  await writeLocal(remaining);
  return true;
}

export async function countArticles(userId?: string): Promise<number> {
  const rows = await listArticles(userId);
  return rows.length;
}

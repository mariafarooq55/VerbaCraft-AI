import { MongoClient, ObjectId } from "mongodb";
import { hashPassword, verifyPassword } from "./password";
import type { ArticleRecord } from "@/types/article";

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || "verbacraft_ai";

let clientPromise: Promise<MongoClient> | null = null;

async function getClient(): Promise<MongoClient | null> {
  if (!uri) return null;
  if (!clientPromise) {
    clientPromise = (async () => {
      const client = new MongoClient(uri);
      await client.connect();
      return client;
    })();
  }
  return clientPromise;
}

async function getDb() {
  const client = await getClient();
  if (!client) return null;
  return client.db(dbName);
}

export async function ensureMongoCollections() {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.collection("users").createIndex({ email: 1 }, { unique: true });
    await db.collection("articles").createIndex({ ownerEmail: 1, updatedAt: -1 });
    return true;
  } catch {
    return false;
  }
}

export function mongoPublicUser(doc: {
  _id: ObjectId;
  name: string;
  email: string;
  createdAt?: Date | string;
}): PublicUser {
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    createdAt:
      doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt ?? ""),
  };
}

/* -------------------------------------------- Users -------------------------------------------- */

export async function mongoRegisterUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<PublicUser> {
  const name = input.name.trim().replace(/\s+/g, " ");
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (name.length < 2 || name.length > 70) {
    const err: any = new Error("Please enter your name (2 to 70 characters).");
    err.status = 400;
    throw err;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    const err: any = new Error("Please enter a valid email address.");
    err.status = 400;
    throw err;
  }
  if (password.length < 8) {
    const err: any = new Error("Choose a password with at least 8 characters.");
    err.status = 400;
    throw err;
  }
  if (password.length > 128) {
    const err: any = new Error("Your password must be 128 characters or fewer.");
    err.status = 400;
    throw err;
  }

  const db = await getDb();
  if (!db) {
    const err: any = new Error("MongoDB Atlas is not configured.");
    err.status = 500;
    throw err;
  }

  const existing = await db.collection("users").findOne({ email });
  if (existing) {
    const err: any = new Error("An account with this email already exists. Please sign in.");
    err.status = 409;
    throw err;
  }

  const passwordHash = await hashPassword(password);
  const result = await db.collection("users").insertOne({
    name,
    email,
    passwordHash,
    createdAt: new Date(),
  });

  return {
    id: result.insertedId.toString(),
    name,
    email,
    createdAt: new Date().toISOString(),
  };
}

export async function mongoLoginUser(emailInput: string, password: string): Promise<PublicUser> {
  const email = emailInput.trim().toLowerCase();
  if (!email || !password) {
    const err: any = new Error("Enter your email address and password.");
    err.status = 400;
    throw err;
  }

  const db = await getDb();
  if (!db) {
    const err: any = new Error("MongoDB Atlas is not configured.");
    err.status = 500;
    throw err;
  }

  const user = await db.collection("users").findOne({ email });
  if (!user || !(await verifyPassword(password, String(user.passwordHash)))) {
    const err: any = new Error("That email and password do not match.");
    err.status = 401;
    throw err;
  }

  return mongoPublicUser(user as any);
}

export async function mongoGetUserById(id: string): Promise<PublicUser | null> {
  if (!ObjectId.isValid(id)) return null;
  const db = await getDb();
  if (!db) return null;
  const user = await db.collection("users").findOne({ _id: new ObjectId(id) });
  if (!user) return null;
  return mongoPublicUser(user as any);
}

/* -------------------------------------------- Articles -------------------------------------------- */

export interface MongoArticleInput {
  id?: string;
  ownerEmail: string;
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
  outline: unknown[];
  faqs: unknown[];
  selectedImages: unknown[];
  selectedVideos: unknown[];
  selectedLinks: unknown[];
  rawDraft: string;
  humanizedDraft: string;
  finalContent: string;
  beforeAnalysis?: unknown;
  afterAnalysis?: unknown;
  humanizationStyle?: string;
  storageBackend?: string;
}

export async function mongoListArticles(ownerEmail: string): Promise<ArticleRecord[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    const docs = await db
      .collection("articles")
      .find({ ownerEmail })
      .sort({ updatedAt: -1 })
      .toArray();
    return docs.map((doc) => mongoDocToRecord(doc as any));
  } catch {
    return [];
  }
}

export async function mongoGetArticle(
  id: string,
  ownerEmail: string,
): Promise<ArticleRecord | null> {
  if (!ObjectId.isValid(id)) return null;
  const db = await getDb();
  if (!db) return null;
  try {
    const doc = await db.collection("articles").findOne({
      _id: new ObjectId(id),
      ownerEmail,
    });
    if (!doc) return null;
    return mongoDocToRecord(doc as any);
  } catch {
    return null;
  }
}

export async function mongoSaveArticle(input: MongoArticleInput): Promise<{
  article: ArticleRecord;
  mode: "created" | "updated";
}> {
  const db = await getDb();
  if (!db) {
    const err: any = new Error("MongoDB Atlas is not configured.");
    err.status = 500;
    throw err;
  }

  const now = new Date();
  const finalContent = input.finalContent.trim();
  const keywords = [...(input.aiKeywords ?? []), ...(input.userKeywords ?? [])];

  const baseDoc: any = {
    ownerEmail: input.ownerEmail,
    slug: input.slug,
    topic: input.topic,
    fixedTitle: input.fixedTitle,
    category: input.category,
    audience: input.audience,
    tone: input.tone,
    purpose: input.purpose,
    targetWordCount: input.targetWordCount,
    guidedAnswers: input.guidedAnswers ?? {},
    aiKeywords: input.aiKeywords ?? [],
    userKeywords: input.userKeywords ?? [],
    outline: input.outline ?? [],
    faqs: input.faqs ?? [],
    selectedImages: input.selectedImages ?? [],
    selectedVideos: input.selectedVideos ?? [],
    selectedLinks: input.selectedLinks ?? [],
    rawDraft: input.rawDraft || finalContent,
    humanizedDraft: input.humanizedDraft || finalContent,
    finalContent,
    beforeAnalysis: input.beforeAnalysis ?? null,
    afterAnalysis: input.afterAnalysis ?? null,
    humanizationStyle: input.humanizationStyle ?? "Natural Editorial",
    storageBackend: input.storageBackend ?? "MongoDB Atlas",
    updatedAt: now,
  };

  const filter = input.id && ObjectId.isValid(input.id)
    ? { _id: new ObjectId(input.id), ownerEmail: input.ownerEmail }
    : null;

  if (filter) {
    const existing = await db.collection("articles").findOne(filter);
    if (existing) {
      await db.collection("articles").updateOne(filter, { $set: baseDoc });
      const updated = await db.collection("articles").findOne(filter);
      return { article: mongoDocToRecord(updated as any), mode: "updated" };
    }
  }

  baseDoc.createdAt = now;
  const result = await db.collection("articles").insertOne(baseDoc);
  const inserted = await db.collection("articles").findOne({
    _id: result.insertedId,
  });
  return { article: mongoDocToRecord(inserted as any), mode: "created" };
}

export async function mongoDeleteArticle(id: string, ownerEmail: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const db = await getDb();
  if (!db) return false;
  const result = await db.collection("articles").deleteOne({
    _id: new ObjectId(id),
    ownerEmail,
  });
  return result.deletedCount > 0;
}

function mongoDocToRecord(doc: any): ArticleRecord {
  return {
    id: doc._id.toString(),
    userId: undefined,
    slug: doc.slug,
    topic: doc.topic,
    fixedTitle: doc.fixedTitle,
    category: doc.category,
    audience: doc.audience,
    tone: doc.tone,
    purpose: doc.purpose,
    targetWordCount: doc.targetWordCount,
    guidedAnswers: doc.guidedAnswers ?? {},
    aiKeywords: doc.aiKeywords ?? [],
    userKeywords: doc.userKeywords ?? [],
    outline: doc.outline ?? [],
    faqs: doc.faqs ?? [],
    selectedImages: doc.selectedImages ?? [],
    selectedVideos: doc.selectedVideos ?? [],
    selectedLinks: doc.selectedLinks ?? [],
    rawDraft: doc.rawDraft,
    humanizedDraft: doc.humanizedDraft,
    finalContent: doc.finalContent,
    beforeAnalysis: doc.beforeAnalysis,
    afterAnalysis: doc.afterAnalysis,
    humanizationStyle: doc.humanizationStyle,
    storageBackend: doc.storageBackend,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt ?? ""),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt ?? ""),
  };
}

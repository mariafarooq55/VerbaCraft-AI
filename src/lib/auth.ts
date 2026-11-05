import { cookies } from "next/headers";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { PublicUser } from "@/lib/auth-store";

export const SESSION_COOKIE = "verbacraft_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

const DATA_DIR = path.join(process.cwd(), ".data");
const SECRET_FILE = path.join(DATA_DIR, "session-secret.key");

let cachedSecret: string | null = null;

async function getSessionSecret(): Promise<string> {
  if (process.env.AUTH_SECRET?.trim()) {
    return process.env.AUTH_SECRET.trim();
  }

  if (cachedSecret) return cachedSecret;

  await mkdir(DATA_DIR, { recursive: true });

  try {
    cachedSecret = (await readFile(SECRET_FILE, "utf8")).trim();
  } catch {
    const generated = randomBytes(48).toString("base64url");

    try {
      await writeFile(SECRET_FILE, generated, {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600,
      });

      cachedSecret = generated;
    } catch {
      cachedSecret = (await readFile(SECRET_FILE, "utf8")).trim();
    }
  }

  if (!cachedSecret) {
    throw new Error("Could not create a secure sign-in session.");
  }

  return cachedSecret;
}

interface SessionPayload {
  id: string;
  name: string;
  email: string;
  exp: number;
}

async function signature(payload: string): Promise<string> {
  const secret = await getSessionSecret();

  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export async function createSessionToken(user: PublicUser): Promise<string> {
  const payload: SessionPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
  };

  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");

  return `${encoded}.${await signature(encoded)}`;
}

export async function readSessionToken(
  token?: string | null,
): Promise<PublicUser | null> {
  if (!token) return null;

  const [encoded, sentSignature] = token.split(".");

  if (!encoded || !sentSignature) return null;

  try {
    const expectedSignature = await signature(encoded);

    const expected = Buffer.from(expectedSignature);
    const actual = Buffer.from(sentSignature);

    if (
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    ) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as SessionPayload;

    // User IDs are strings, not numbers.
    if (
      typeof payload.id !== "string" ||
      !payload.id.trim() ||
      typeof payload.name !== "string" ||
      !payload.name.trim() ||
      typeof payload.email !== "string" ||
      !payload.email.trim() ||
      typeof payload.exp !== "number" ||
      !Number.isFinite(payload.exp) ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return {
      id: payload.id,
      name: payload.name,
      email: payload.email,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  try {
    const cookieStore = await cookies();

    return readSessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  };
}

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import {
  mongoRegisterUser,
  mongoLoginUser,
  mongoGetUserById,
  type PublicUser as MongoPublicUser,
} from "@/lib/mongodb-store";
import { hashPassword, verifyPassword } from "./password";

const DATA_DIR = path.join(process.cwd(), ".data");
const USER_FILE = path.join(DATA_DIR, "users.json");

const globalForAuth = globalThis as typeof globalThis & {
  __verbacraftUsers?: StoredUser[];
  __verbacraftAuthDbBroken?: boolean;
};

let authDbBroken = globalForAuth.__verbacraftAuthDbBroken ?? false;

function markAuthDbBroken(err: unknown) {
  authDbBroken = true;
  globalForAuth.__verbacraftAuthDbBroken = true;
  console.warn(
    "User database is unavailable; using local accounts instead:",
    err instanceof Error ? err.message : err
  );
}

interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
}

export class AuthStoreError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "AuthStoreError";
    this.status = status;
  }
}

async function readLocalUsers(): Promise<StoredUser[]> {
  if (globalForAuth.__verbacraftUsers) return globalForAuth.__verbacraftUsers;
  try {
    const data = JSON.parse(await readFile(USER_FILE, "utf8"));
    if (Array.isArray(data)) {
      globalForAuth.__verbacraftUsers = data as StoredUser[];
      return data as StoredUser[];
    }
  } catch {
    // First run: no local users file yet.
  }
  globalForAuth.__verbacraftUsers = [];
  return [];
}

async function writeLocalUsers(items: StoredUser[]): Promise<void> {
  globalForAuth.__verbacraftUsers = items;
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(USER_FILE, JSON.stringify(items, null, 2), {
      encoding: "utf8",
      mode: 0o600,
    });
  } catch (err) {
    console.error(
      "Could not save local account file:",
      err instanceof Error ? err.message : err
    );
    throw new AuthStoreError("Could not save your account. Please try again.", 500);
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toPublicUser(user: StoredUser): PublicUser {
  return {
    id: user.id.toString(),
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<PublicUser> {
  const name = input.name.trim().replace(/\s+/g, " ");
  const email = normalizeEmail(input.email);
  const password = input.password;

  if (name.length < 2 || name.length > 70) {
    throw new AuthStoreError("Please enter your name (2 to 70 characters).", 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new AuthStoreError("Please enter a valid email address.", 400);
  }
  if (password.length < 8) {
    throw new AuthStoreError("Choose a password with at least 8 characters.", 400);
  }
  if (password.length > 128) {
    throw new AuthStoreError("Your password must be 128 characters or fewer.", 400);
  }

  const uri = process.env.MONGODB_URI;
  if (uri && uri.trim()) {
    try {
      return await mongoRegisterUser({ name, email, password });
    } catch (err) {
      if (err instanceof AuthStoreError) throw err;
      markAuthDbBroken(err);
    }
  }

  const local = await readLocalUsers();
  if (local.some((user) => user.email === email)) {
    throw new AuthStoreError("An account with this email already exists. Please sign in.", 409);
  }

  const passwordHash = await hashPassword(password);
  const created: StoredUser = {
    id: `local-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    name,
    email,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  local.push(created);
  await writeLocalUsers(local);
  return toPublicUser(created);
}

export async function loginUser(emailInput: string, password: string): Promise<PublicUser> {
  const email = normalizeEmail(emailInput);
  if (!email || !password) {
    throw new AuthStoreError("Enter your email address and password.", 400);
  }

  const uri = process.env.MONGODB_URI;
  if (uri && uri.trim()) {
    try {
      return await mongoLoginUser(email, password);
    } catch (err) {
      if (err instanceof AuthStoreError) throw err;
      markAuthDbBroken(err);
    }
  }

  const local = await readLocalUsers();
  const user = local.find((item) => item.email === email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new AuthStoreError("That email and password do not match.", 401);
  }
  return toPublicUser(user);
}

export async function getStoredUserById(id: string): Promise<PublicUser | null> {
  if (!id) return null;

  const uri = process.env.MONGODB_URI;
  if (uri && uri.trim()) {
    try {
      return await mongoGetUserById(id);
    } catch (err) {
      markAuthDbBroken(err);
    }
  }

  const local = await readLocalUsers();
  const user = local.find((item) => item.id === id);
  return user ? toPublicUser(user) : null;
}

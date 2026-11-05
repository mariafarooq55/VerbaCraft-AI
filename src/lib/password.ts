import { promisify } from "node:util";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const scrypt = promisify(scryptCallback);
const PASSWORD_BYTES = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, PASSWORD_BYTES)) as Buffer;
  return `scrypt$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export async function verifyPassword(password: string, savedHash: string): Promise<boolean> {
  try {
    const [algorithm, saltString, hashString] = savedHash.split("$");
    if (algorithm !== "scrypt" || !saltString || !hashString) return false;
    const salt = Buffer.from(saltString, "base64url");
    const expected = Buffer.from(hashString, "base64url");
    const actual = (await scrypt(password, salt, expected.length)) as Buffer;
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

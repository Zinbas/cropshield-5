import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { jwtVerify, SignJWT } from "jose";
import type { User } from "../database/schema";

export type SafeUser = Omit<User, "passwordHash">;

export function toSafeUser(user: User): SafeUser {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

const scrypt = promisify(scryptCallback);
export const LOCAL_SESSION_COOKIE = "cropshield_local_session";
export const LOCAL_ADMIN_EMAIL = "abhidey0822@gmail.com";
const SESSION_TTL = "7d";

export function normalizeLocalEmail(email: string) {
  return email.trim().toLowerCase();
}

export function canCreateLocalAdmin(_email: string, _existingLocalAdminCount: number) {
  // Temporary testing mode: any valid local account may enter the admin workspace.
  // Reintroduce owner/count gating before production use.
  return true;
}

function secretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required for local sessions");
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const [, saltHex, hashHex] = encoded.split("$");
  if (!saltHex || !hashHex) return false;
  const derived = await scrypt(password, Buffer.from(saltHex, "hex"), 64) as Buffer;
  const expected = Buffer.from(hashHex, "hex");
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

export async function createLocalSession(openId: string) {
  return new SignJWT({ kind: "local" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(openId)
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(secretKey());
}

export async function getLocalSessionOpenId(token?: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload.kind === "local" && typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

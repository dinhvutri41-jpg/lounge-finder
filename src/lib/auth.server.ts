import { jwtVerify, SignJWT } from "jose";

const COOKIE_NAME = "linkcare_session";
const SESSION_MAX_AGE = 60 * 60 * 8;

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET?.trim() || "local-linkcare-auth-secret-change-me";
  return new TextEncoder().encode(secret);
}

export function authCookieName(): string {
  return COOKIE_NAME;
}

export function configuredCredentials(): { email: string; password: string } {
  return {
    email: process.env.ADMIN_EMAIL?.trim() || "admin@linkcare.vn",
    password: process.env.ADMIN_PASSWORD || "LinkCare@2026",
  };
}

export async function createSession(email: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined): Promise<{ email: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return typeof payload.email === "string" ? { email: payload.email } : null;
  } catch {
    return null;
  }
}

export function readCookie(request: Request): string | undefined {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookie = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  return cookie?.slice(COOKIE_NAME.length + 1);
}

export function sessionCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}; ${process.env.NODE_ENV === "production" ? "Secure; " : ""}`;
}

export function clearedSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; ${process.env.NODE_ENV === "production" ? "Secure; " : ""}`;
}

/**
 * Unified server-side session resolver.
 *
 * Tries auth.getSession() (cookie-based) first.
 * Falls back to verifying an Authorization: Bearer JWT if cookies are absent
 * (happens on HTTP localhost where __Secure- cookies can't be set).
 */
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { verifyBearerToken } from "@/lib/auth/verify-token";

export interface ResolvedUser {
  id: string;
  email?: string;
  name?: string;
}

export async function getSessionUser(): Promise<ResolvedUser | null> {
  // 1. Try cookie-based session (works on HTTPS / production)
  try {
    const { data: session } = await auth.getSession();
    if (session?.user) {
      return {
        id: session.user.id,
        email: session.user.email ?? undefined,
        name: session.user.name ?? undefined,
      };
    }
  } catch {
    // cookie session unavailable — fall through to Bearer token
  }

  // 2. Fall back to Bearer token in Authorization header
  try {
    const headerStore = await headers();
    const authHeader = headerStore.get("authorization");
    const user = await verifyBearerToken(authHeader);
    if (user) return user;
  } catch {
    // no header available
  }

  // 3. Fall back to reading session cookie directly from headers and checking DB
  try {
    const headerStore = await headers();
    const cookieHeader = headerStore.get("cookie") || "";
    const match =
      cookieHeader.match(/(?:__Secure-)?neon-auth\.session_token=([^;]+)/) ||
      cookieHeader.match(/(?:__Secure-)?session_token=([^;]+)/);

    if (match?.[1]) {
      const token = decodeURIComponent(match[1].trim());
      const { getDb } = await import("@/lib/db");
      const sql = getDb();
      const rows = await sql`
        SELECT s."userId", u.email, u.name
        FROM neon_auth.session s
        LEFT JOIN neon_auth.user u ON u.id = s."userId"
        WHERE s.token = ${token} AND s."expiresAt" > NOW()
        LIMIT 1
      `;
      if (rows[0]?.userId) {
        return {
          id: rows[0].userId,
          email: rows[0].email ?? undefined,
          name: rows[0].name ?? undefined,
        };
      }
    }
  } catch {
    // cookie parsing or DB error
  }

  return null;
}

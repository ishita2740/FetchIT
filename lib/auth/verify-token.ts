/**
 * Server-side session verification using the Neon Auth upstream.
 * Used as fallback when cookie-based auth fails (e.g. on HTTP localhost).
 *
 * Forwards the Bearer token as a session cookie to the Neon Auth upstream
 * and returns the user if valid.
 */

export interface JWTUser {
  id: string;
  email?: string;
  name?: string;
}

/**
 * Verify a Bearer token by proxying it to Neon Auth upstream as a session cookie.
 */
export async function verifyBearerToken(
  authHeader: string | null
): Promise<JWTUser | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;

  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  if (!baseUrl) return null;

  try {
    const sessionCookieName = "__Secure-neon-auth.session_token";
    const sessionUrl = `${baseUrl.replace(/\/$/, "")}/api/auth/get-session`;

    const res = await fetch(sessionUrl, {
      method: "GET",
      headers: {
        Cookie: `${sessionCookieName}=${token}`,
        "x-neon-auth-proxy": "nextjs",
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.user?.id) {
        return {
          id: data.user.id,
          email: data.user.email ?? undefined,
          name: data.user.name ?? undefined,
        };
      }
    }
  } catch {
    // Upstream timed out or failed — fall through to direct DB lookup
  }

  // 3. Fallback: Query the neon_auth session table directly
  try {
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
  } catch {
    // Database query failed
  }

  return null;
}

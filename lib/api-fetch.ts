'use client'
/**
 * Authenticated fetch wrapper.
 * Gets the session token from authClient.getSession() and forwards it
 * as an Authorization: Bearer header so server routes can verify identity
 * even on HTTP localhost where __Secure- cookies can't be sent.
 */
import { authClient } from '@/lib/auth/client'

let _cachedToken: string | null = null
let _tokenExpiry = 0

async function getSessionToken(): Promise<string | null> {
  // Use cache if not expired (cache for 50 seconds)
  if (_cachedToken && Date.now() < _tokenExpiry) return _cachedToken

  try {
    const { data } = await authClient.getSession()
    // Better Auth session token is in data.session.token
    const token = (data as any)?.session?.token ?? null
    if (token) {
      _cachedToken = token
      _tokenExpiry = Date.now() + 50_000
      return token
    }
  } catch { /* ignore */ }

  return null
}

export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getSessionToken()

  const existingHeaders = options.headers as Record<string, string> | undefined
  const headers: Record<string, string> = { ...existingHeaders }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return fetch(url, { credentials: 'include', ...options, headers })
}

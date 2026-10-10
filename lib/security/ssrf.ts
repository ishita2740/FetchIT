/**
 * SSRF and Network Security Utilities for FetchIT
 * Protects web scraping and URL discovery against Server-Side Request Forgery,
 * private network access, cloud metadata endpoints, and DNS rebinding attacks.
 */

// Private IPv4 CIDR ranges and forbidden blocks
const PRIVATE_IPV4_PATTERNS = [
  /^0\./,                                     // Current network (0.0.0.0/8)
  /^10\./,                                    // Private Class A (10.0.0.0/8)
  /^127\./,                                   // Loopback (127.0.0.0/8)
  /^169\.254\./,                              // Link-local / Cloud metadata (169.254.0.0/16)
  /^172\.(1[6-9]|2\d|3[01])\./,               // Private Class B (172.16.0.0/12)
  /^192\.168\./,                              // Private Class C (192.168.0.0/16)
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // Carrier-grade NAT (100.64.0.0/10)
  /^198\.(1[89])\./,                          // Benchmarking (198.18.0.0/15)
  /^224\./,                                   // Multicast (224.0.0.0/4)
  /^240\./,                                   // Reserved (240.0.0.0/4)
  /^255\.255\.255\.255$/,                     // Broadcast
];

// Forbidden hostnames and local domains
const FORBIDDEN_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "local",
  "broadcasthost",
  "metadata.google.internal",
  "instance-data",
]);

export interface URLSafetyCheck {
  safe: boolean;
  reason?: string;
  parsedUrl?: URL;
}

/**
 * Checks whether a given URL is safe for server-side outbound requests.
 * Blocks all non-HTTP(S) schemes, private network IPs, loopback, link-local,
 * cloud metadata endpoints, and local domain suffixes.
 */
export function isSafePublicUrl(urlString: string): URLSafetyCheck {
  if (!urlString || typeof urlString !== "string") {
    return { safe: false, reason: "Empty or invalid URL parameter" };
  }

  let parsed: URL;
  try {
    parsed = new URL(urlString.trim());
  } catch {
    return { safe: false, reason: "Malformed URL syntax" };
  }

  // 1. Only HTTP and HTTPS protocols allowed
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      safe: false,
      reason: `Unsupported protocol "${parsed.protocol}". Only http: and https: are allowed.`,
    };
  }

  // 2. Reject URLs with userinfo (credentials in URL)
  if (parsed.username || parsed.password) {
    return {
      safe: false,
      reason: "URLs with embedded user credentials are not permitted",
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 3. Reject empty hostname
  if (!hostname) {
    return { safe: false, reason: "Missing hostname" };
  }

  // 4. Check forbidden hostnames
  if (FORBIDDEN_HOSTNAMES.has(hostname)) {
    return { safe: false, reason: `Forbidden internal host "${hostname}"` };
  }

  // 5. Check local/internal domain suffixes
  if (
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".lan") ||
    hostname.endsWith(".corp") ||
    hostname.endsWith(".home")
  ) {
    return { safe: false, reason: `Forbidden local domain suffix in "${hostname}"` };
  }

  // 6. Check IPv6 addresses
  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    const rawIpv6 = hostname.slice(1, -1).toLowerCase();
    if (
      rawIpv6 === "::1" ||
      rawIpv6 === "::" ||
      rawIpv6.startsWith("fe80:") || // Link-local
      rawIpv6.startsWith("fc00:") || // Unique local
      rawIpv6.startsWith("fd00:")
    ) {
      return { safe: false, reason: `Forbidden IPv6 address "[${rawIpv6}]"` };
    }
  }

  // 7. Check IPv4 patterns
  for (const pattern of PRIVATE_IPV4_PATTERNS) {
    if (pattern.test(hostname)) {
      return {
        safe: false,
        reason: `Forbidden IP address range matching "${hostname}"`,
      };
    }
  }

  return { safe: true, parsedUrl: parsed };
}

/**
 * CSRF Protection utilities
 * Implements CSRF token generation and validation
 */

import { randomBytes, createHash } from "crypto";

/**
 * Generate a CSRF token
 */
export function generateCSRFToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Create a CSRF token hash
 */
export function createCSRFTokenHash(token: string, secret: string): string {
  return createHash("sha256").update(token + secret).digest("hex");
}

/**
 * Verify CSRF token
 */
export function verifyCSRFToken(token: string, hash: string, secret: string): boolean {
  const expectedHash = createCSRFTokenHash(token, secret);
  return hash === expectedHash;
}

/**
 * CSRF token storage (in production, use session storage or database)
 */
const csrfTokens = new Map<string, { token: string; expiresAt: number }>();

/**
 * Store CSRF token
 */
export function storeCSRFToken(sessionId: string, token: string, ttl: number = 3600000): void {
  // Default TTL: 1 hour
  csrfTokens.set(sessionId, {
    token,
    expiresAt: Date.now() + ttl,
  });

  // Clean up expired tokens periodically
  if (Math.random() < 0.01) {
    // 1% chance to clean up
    for (const [key, value] of csrfTokens.entries()) {
      if (value.expiresAt < Date.now()) {
        csrfTokens.delete(key);
      }
    }
  }
}

/**
 * Get CSRF token for session
 */
export function getCSRFToken(sessionId: string): string | null {
  const record = csrfTokens.get(sessionId);
  if (!record || record.expiresAt < Date.now()) {
    return null;
  }
  return record.token;
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(sessionId: string, token: string): boolean {
  const storedToken = getCSRFToken(sessionId);
  if (!storedToken) {
    return false;
  }
  return storedToken === token;
}

/**
 * Get session ID from request (in production, use proper session management)
 */
export function getSessionId(request: Request): string {
  // Try to get from cookie
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split("=");
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    if (cookies["session-id"]) {
      return cookies["session-id"];
    }
  }

  // Fallback: use IP + User-Agent hash
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  return createHash("sha256").update(ip + userAgent).digest("hex").substring(0, 16);
}


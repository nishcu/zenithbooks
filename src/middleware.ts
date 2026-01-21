import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit, getClientIdentifier } from "@/lib/security/validation";

/**
 * Security middleware
 * Applies rate limiting and security headers to all requests
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  // Note: X-Frame-Options removed - CSP frame-src handles iframe policy
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // CSP: Ensure Cashfree SDK can load
  // Next.js Script component needs 'unsafe-inline' for dynamically injected scripts
  // Also allow 'unsafe-eval' for SDK initialization
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://sdk.cashfree.com https://vercel.live https://www.googletagmanager.com https://www.google-analytics.com https://googleads.g.doubleclick.net https://www.googleadservices.com https://www.googlesyndication.com; " + // Added Google Tag Manager, Analytics, and Ads
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com; " +
    "frame-src 'self' https://sdk.cashfree.com https://www.googletagmanager.com https://googleads.g.doubleclick.net; " + // Added Google Tag Manager and Ads iframes
    "connect-src 'self' https://*.firebase.com https://*.googleapis.com https://api.cashfree.com https://sandbox.cashfree.com https://sdk.cashfree.com https://www.google-analytics.com https://www.googletagmanager.com https://googleads.g.doubleclick.net https://www.googleadservices.com;"
  );

  // Rate limiting for API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const identifier = getClientIdentifier(request);
    const rateLimitResult = checkRateLimit(identifier, {
      maxRequests: 100, // 100 requests
      windowMs: 60000, // per minute
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests",
          message: "Rate limit exceeded. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
            "X-RateLimit-Limit": "100",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimitResult.resetTime.toString(),
          },
        }
      );
    }

    // Add rate limit headers
    response.headers.set("X-RateLimit-Limit", "100");
    response.headers.set("X-RateLimit-Remaining", rateLimitResult.remaining.toString());
    response.headers.set("X-RateLimit-Reset", rateLimitResult.resetTime.toString());
  }

  return response;
}

/**
 * Configure which routes the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};


import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { checkRateLimit, resetRateLimit } from "@/lib/vault-security";
import { extractUserPrefixFromCode } from "@/lib/vault-user-code";
import { createHash } from "crypto";

// CRITICAL: Ensure this route is included in the build
// Build timestamp: 2025-12-03-16-30 - Force fresh rebuild
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Health check - GET handler for testing route availability
 * Route: GET /api/vault/validate-code
 */
export async function GET(request: NextRequest) {
  console.log('[validate-code] GET request received - Route is accessible');
  return NextResponse.json({
    status: "ok",
    message: "Validate code endpoint is operational",
    method: "GET",
    timestamp: new Date().toISOString(),
  });
}

/**
 * Validate a share code and return access information
 * This is a public API endpoint (no auth required for validation)
 * 
 * Route: POST /api/vault/validate-code
 */
export async function POST(request: NextRequest) {
  // Log for debugging (remove in production if needed)
  console.log('[validate-code] POST request received');
  
  try {
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Share code is required." },
        { status: 400 }
      );
    }

    // Get client IP for rate limiting
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0] || 
                     request.headers.get("x-real-ip") || 
                     request.ip || 
                     "unknown";

    // Validation uses a public capability index:
    // `vaultShareCodeIndex/{codeHash}`, where codeHash = SHA-256(fullCodeWithPrefix).

    // Hash function (prefer WebCrypto, fallback to Node crypto)
    const hashString = async (input: string): Promise<string> => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const c: any = (globalThis as any).crypto;
        if (c?.subtle?.digest) {
          const encoder = new TextEncoder();
          const data = encoder.encode(input);
          const hashBuffer = await c.subtle.digest("SHA-256", data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
        }
      } catch {
        // fall through to Node crypto
      }
      return createHash("sha256").update(input, "utf8").digest("hex");
    };
    
    const trimmedCode = code.trim().toUpperCase();
    
    // Require prefix format for capability-based lookup
    const extracted = extractUserPrefixFromCode(trimmedCode);
    if (!extracted) {
      return NextResponse.json(
        { error: "Invalid share code format. Please enter the full code including the prefix (e.g., ABC123-XXXXXXXXXX)." },
        { status: 400 }
      );
    }

    const codeHash = await hashString(trimmedCode);
    const indexSnap = await getDoc(doc(db, "vaultShareCodeIndex", codeHash));

    if (!indexSnap.exists()) {
      // Invalid code - check and apply rate limiting for FAILED attempts only
      const rateLimitCheck = await checkRateLimit(clientIp);
      if (!rateLimitCheck.allowed) {
        return NextResponse.json(
          { 
            error: "Too many failed attempts. Please try again later.",
            lockoutUntil: rateLimitCheck.lockoutUntil?.toISOString(),
          },
          { status: 429 }
        );
      }
      
      return NextResponse.json(
        { error: "Invalid or expired share code." },
        { status: 404 }
      );
    }

    const shareCodeData = indexSnap.data() as any;

    // Check expiry
    const expiresAt = shareCodeData.expiresAt?.toDate 
      ? shareCodeData.expiresAt.toDate() 
      : new Date(shareCodeData.expiresAt);
    
    if (expiresAt < new Date()) {
      // Expired code - check and apply rate limiting for FAILED attempts only
      const rateLimitCheck = await checkRateLimit(clientIp);
      if (!rateLimitCheck.allowed) {
        return NextResponse.json(
          { 
            error: "Too many failed attempts. Please try again later.",
            lockoutUntil: rateLimitCheck.lockoutUntil?.toISOString(),
          },
          { status: 429 }
        );
      }
      
      return NextResponse.json(
        { error: "Share code has expired." },
        { status: 403 }
      );
    }

    // Success! Reset rate limit on successful validation
    await resetRateLimit(clientIp);
    
    // Return share code info (without sensitive data)
    return NextResponse.json({
      shareCodeId: String(shareCodeData.shareCodeId || ""),
      codeName: shareCodeData.codeName,
      categories: shareCodeData.categories || [],
      expiresAt: expiresAt.toISOString(),
      userId: shareCodeData.userId,
      codeHash,
    });
  } catch (error) {
    console.error("[validate-code] Error validating share code:", error);
    // Log more details for debugging
    if (error instanceof Error) {
      console.error("[validate-code] Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    }
    return NextResponse.json(
      { 
        error: "Failed to validate share code.",
        details: process.env.NODE_ENV === "development" ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    );
  }
}


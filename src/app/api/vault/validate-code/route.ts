import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { checkRateLimit, resetRateLimit } from "@/lib/vault-security";

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

    // CRITICAL SECURITY FIX: Hash includes userId to prevent collisions between users
    // We need to check all active codes since we don't know userId yet
    const codesRef = collection(db, "vaultShareCodes");
    const activeCodesQuery = query(codesRef, where("isActive", "==", true));
    const allActiveCodes = await getDocs(activeCodesQuery);
    
    // Hash functions
    const hashString = async (input: string): Promise<string> => {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    };
    
    // Find the matching code by checking hash for each user
    let matchingCode = null;
    const trimmedCode = code.trim();
    
    for (const doc of allActiveCodes.docs) {
      const codeData = doc.data();
      const userId = codeData.userId;
      const storedHash = codeData.codeHash;
      
      if (!storedHash) continue;
      
      // Try new format: H(code + userId) - SECURE, prevents collisions
      const codeWithUserId = `${trimmedCode}:${userId}`;
      const newFormatHash = await hashString(codeWithUserId);
      
      if (storedHash === newFormatHash) {
        matchingCode = { doc, data: codeData };
        break;
      }
      
      // Backward compatibility: Try old format H(code) for existing codes
      // This allows old codes to still work, but new codes will use secure format
      const oldFormatHash = await hashString(trimmedCode);
      if (storedHash === oldFormatHash) {
        matchingCode = { doc, data: codeData };
        break;
      }
    }
    
    const snapshot = matchingCode 
      ? { empty: false, docs: [matchingCode.doc] } 
      : { empty: true, docs: [] };

    if (snapshot.empty) {
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

    const shareCodeDoc = snapshot.docs[0];
    const shareCodeData = shareCodeDoc.data();

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
      shareCodeId: shareCodeDoc.id,
      codeName: shareCodeData.codeName,
      categories: shareCodeData.categories || [],
      expiresAt: expiresAt.toISOString(),
      userId: shareCodeData.userId,
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


import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { checkRateLimit, resetRateLimit } from "@/lib/vault-security";
import { extractUserPrefixFromCode, generateUserCodePrefix } from "@/lib/vault-user-code";

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

    // NEW APPROACH: User-based prefix system
    // Codes now have format: "PREFIX-CODE" (e.g., "A3B9C2-SMRAEAFORCA")
    // This makes codes unique per user and prevents collisions
    
    const codesRef = collection(db, "vaultShareCodes");
    const activeCodesQuery = query(codesRef, where("isActive", "==", true));
    const allActiveCodes = await getDocs(activeCodesQuery);
    
    // Hash function
    const hashString = async (input: string): Promise<string> => {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    };
    
    const trimmedCode = code.trim().toUpperCase();
    
    // Extract prefix if present (new format)
    const extracted = extractUserPrefixFromCode(trimmedCode);
    const hasPrefix = extracted !== null;
    
    let matchingCode = null;
    const potentialOldFormatMatches: Array<{ doc: any; data: any }> = [];
    
    // Hash the input code (with prefix if present)
    const inputCodeHash = await hashString(trimmedCode);
    
    // First: Try to match with new prefix format (PREFIX-CODE)
    if (hasPrefix && extracted) {
      // Find codes by matching the full hash (prefix + code)
      for (const doc of allActiveCodes.docs) {
        const codeData = doc.data();
        const storedHash = codeData.codeHash;
        
        if (!storedHash) continue;
        
        // Direct hash match (new format stores hash of "PREFIX-CODE")
        if (storedHash === inputCodeHash) {
          matchingCode = { doc, data: codeData };
          break;
        }
      }
    }
    
    // If no match with new format, try old formats for backward compatibility
    if (!matchingCode) {
      // Try old format 1: H(code + userId) - from previous security fix
      for (const doc of allActiveCodes.docs) {
        const codeData = doc.data();
        const userId = codeData.userId;
        const storedHash = codeData.codeHash;
        
        if (!storedHash) continue;
        
        // Old format: H(code + userId)
        const codeWithUserId = `${trimmedCode}:${userId}`;
        const oldFormatHash = await hashString(codeWithUserId);
        
        if (storedHash === oldFormatHash) {
          matchingCode = { doc, data: codeData };
          break;
        }
        
        // Old format 2: H(code) - original format (no user identifier)
        const plainHash = await hashString(trimmedCode);
        if (storedHash === plainHash) {
          potentialOldFormatMatches.push({ doc, data: codeData });
        }
      }
      
      // Handle old format without prefix (potential collisions)
      if (!matchingCode && potentialOldFormatMatches.length > 0) {
        if (potentialOldFormatMatches.length > 1) {
          // Multiple codes with same hash - collision!
          return NextResponse.json(
            { 
              error: "Code collision detected. This code exists for multiple users. Please ask the document owner to recreate the share code.",
              requiresRecreation: true
            },
            { status: 409 }
          );
        }
        // Only one match - safe to use
        matchingCode = potentialOldFormatMatches[0];
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


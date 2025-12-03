import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { checkRateLimit, resetRateLimit } from "@/lib/vault-security";

// Ensure this route is included in the build
// Build timestamp: 2025-12-03-16-00 - Force fresh rebuild
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    // Hash the provided code using SHA-256 (same as client)
    const encoder = new TextEncoder();
    const data = encoder.encode(code.trim());
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const codeHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    // Find matching share code
    const codesRef = collection(db, "vaultShareCodes");
    const q = query(codesRef, where("codeHash", "==", codeHash), where("isActive", "==", true));
    const snapshot = await getDocs(q);

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
    console.error("Error validating share code:", error);
    return NextResponse.json(
      { error: "Failed to validate share code." },
      { status: 500 }
    );
  }
}


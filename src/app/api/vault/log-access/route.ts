import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { checkSuspiciousActivity } from "@/lib/vault-security";

// Ensure this route is included in the build
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Log document access/download for share code
 * This tracks when third parties access documents
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shareCodeId, codeHash, documentId, documentName, documentCategory, action } = body;

    if (!codeHash || !documentId || !action) {
      return NextResponse.json(
        { error: "codeHash, documentId, and action are required." },
        { status: 400 }
      );
    }

    // Resolve owner from public share index
    const indexSnap = await getDoc(doc(db, "vaultShareCodeIndex", String(codeHash)));
    if (!indexSnap.exists()) {
      return NextResponse.json({ error: "Share code not found." }, { status: 404 });
    }
    const indexData = indexSnap.data() as any;
    const userId = indexData.userId;
    const codeName = indexData.codeName || "Share Code";
    const effectiveShareCodeId = String(shareCodeId || indexData.shareCodeId || String(codeHash));

    // Get client IP (if available)
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0] || 
                     request.headers.get("x-real-ip") || 
                     request.ip ||
                     "unknown";

    // Check for suspicious activity
    const suspiciousCheck = await checkSuspiciousActivity(userId, effectiveShareCodeId, clientIp);
    
    // Create access log entry
    await addDoc(collection(db, "vaultAccessLogs"), {
      userId,
      shareCodeId: effectiveShareCodeId,
      documentId,
      documentName: documentName || "Document",
      documentCategory: documentCategory || "Unknown",
      action, // "view" or "download"
      accessedAt: serverTimestamp(),
      clientIp,
      userAgent: request.headers.get("user-agent") || "unknown",
      suspicious: suspiciousCheck.suspicious || false,
      suspiciousReason: suspiciousCheck.reason || null,
    });

    return NextResponse.json({
      success: true,
      message: "Access logged successfully.",
    });
  } catch (error) {
    console.error("Error logging access:", error);
    return NextResponse.json(
      { error: "Failed to log access." },
      { status: 500 }
    );
  }
}


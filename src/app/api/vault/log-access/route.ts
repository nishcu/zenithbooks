import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc } from "firebase/firestore";
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
    const { shareCodeId, documentId, action } = body;

    if (!shareCodeId || !documentId || !action) {
      return NextResponse.json(
        { error: "shareCodeId, documentId, and action are required." },
        { status: 400 }
      );
    }

    // Get share code info
    const shareCodeRef = doc(db, "vaultShareCodes", shareCodeId);
    const shareCodeDoc = await getDoc(shareCodeRef);

    if (!shareCodeDoc.exists()) {
      return NextResponse.json(
        { error: "Share code not found." },
        { status: 404 }
      );
    }

    const shareCodeData = shareCodeDoc.data();
    const userId = shareCodeData.userId;

    // Get document info
    const documentRef = doc(db, "vaultDocuments", documentId);
    const documentDoc = await getDoc(documentRef);

    if (!documentDoc.exists()) {
      return NextResponse.json(
        { error: "Document not found." },
        { status: 404 }
      );
    }

    const documentData = documentDoc.data();

    // Get client IP (if available)
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0] || 
                     request.headers.get("x-real-ip") || 
                     request.ip ||
                     "unknown";

    // Check for suspicious activity
    const suspiciousCheck = await checkSuspiciousActivity(userId, shareCodeId, clientIp);
    
    // Create access log entry
    await addDoc(collection(db, "vaultAccessLogs"), {
      userId,
      shareCodeId,
      documentId,
      documentName: documentData.fileName,
      documentCategory: documentData.category,
      action, // "view" or "download"
      accessedAt: serverTimestamp(),
      clientIp,
      userAgent: request.headers.get("user-agent") || "unknown",
      suspicious: suspiciousCheck.suspicious || false,
      suspiciousReason: suspiciousCheck.reason || null,
    });

    // Update share code access count
    const currentAccessCount = shareCodeData.accessCount || 0;
    await updateDoc(shareCodeRef, {
      accessCount: currentAccessCount + 1,
      lastAccessedAt: serverTimestamp(),
    });

    // Create notification for document owner (use main notifications collection)
    const { notifyDocumentAccess } = await import("@/lib/vault-notifications");
    await notifyDocumentAccess(
      userId,
      documentData.fileName,
      shareCodeData.codeName,
      action as "view" | "download"
    );

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


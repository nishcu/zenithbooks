import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";

// Ensure this route is included in the build
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Get shared documents for a user based on categories
 * This endpoint is used by third parties accessing via share code
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const codeHash = searchParams.get("codeHash");
    const userId = searchParams.get("userId");
    const categoriesParam = searchParams.get("categories");

    // New flow (public): codeHash -> read snapshot docs from vaultShareCodeIndex/{codeHash}/documents
    if (codeHash) {
      const indexRef = doc(db, "vaultShareCodeIndex", codeHash);
      const indexSnap = await getDoc(indexRef);
      if (!indexSnap.exists()) {
        return NextResponse.json({ error: "Invalid or expired share code." }, { status: 404 });
      }
      const data = indexSnap.data() as any;
      const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
      if (expiresAt < new Date() || data.isActive === false) {
        return NextResponse.json({ error: "Share code has expired or was revoked." }, { status: 403 });
      }

      const docsSnap = await getDocs(collection(db, "vaultShareCodeIndex", codeHash, "documents"));
      const documents = docsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      return NextResponse.json({ documents, count: documents.length });
    }

    // Backward compatibility (legacy): userId + categories (requires Firestore access to vaultDocuments)
    if (!userId || !categoriesParam) {
      return NextResponse.json(
        { error: "codeHash OR (userId and categories) are required." },
        { status: 400 }
      );
    }

    const categories = categoriesParam.split(",").filter(Boolean);

    // Fetch documents that belong to the user and are in the shared categories
    const documentsRef = collection(db, "vaultDocuments");
    const q = query(
      documentsRef,
      where("userId", "==", userId),
      where("category", "in", categories)
    );

    const snapshot = await getDocs(q);
    const documents = snapshot.docs.map((doc) => {
      const data = doc.data();
      const latestVersion = data.versions?.[data.currentVersion];
      
      return {
        id: doc.id,
        fileName: data.fileName,
        category: data.category,
        fileSize: data.fileSize || latestVersion?.fileSize || 0,
        uploadedAt: data.uploadedAt,
        currentVersion: data.currentVersion || 1,
        // Only return the latest version URL
        fileUrl: latestVersion?.fileUrl || data.fileUrl,
      };
    });

    return NextResponse.json({
      documents,
      count: documents.length,
    });
  } catch (error) {
    console.error("Error fetching shared documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents." },
      { status: 500 }
    );
  }
}


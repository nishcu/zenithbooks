import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";

/**
 * Get shared documents for a user based on categories
 * This endpoint is used by third parties accessing via share code
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const categoriesParam = searchParams.get("categories");

    if (!userId || !categoriesParam) {
      return NextResponse.json(
        { error: "userId and categories are required." },
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


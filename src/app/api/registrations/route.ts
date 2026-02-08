/**
 * API Route: List business registrations for the authenticated user
 * GET /api/registrations
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { getAdminFirestore, FIREBASE_ADMIN_NOT_CONFIGURED_MESSAGE } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serializeRegistration(doc: QueryDocumentSnapshot): Record<string, unknown> {
  const data = doc.data();
  const id = doc.id;
  const createdAt = data.createdAt?.toDate?.() ?? data.createdAt;
  const updatedAt = data.updatedAt?.toDate?.() ?? data.updatedAt;
  const completedAt = data.completedAt?.toDate?.() ?? data.completedAt;
  const documents = (data.documents || []).map((d: { uploadedAt?: { toDate?: () => Date }; [k: string]: unknown }) => ({
    ...d,
    uploadedAt: d.uploadedAt?.toDate?.() ?? d.uploadedAt,
  }));
  return {
    id,
    ...data,
    createdAt: createdAt instanceof Date ? createdAt.toISOString() : createdAt,
    updatedAt: updatedAt instanceof Date ? updatedAt.toISOString() : updatedAt,
    completedAt: completedAt instanceof Date ? completedAt.toISOString() : completedAt ?? null,
    documents: documents.map((d: { uploadedAt?: Date | string; [k: string]: unknown }) => ({
      ...d,
      uploadedAt: d.uploadedAt instanceof Date ? d.uploadedAt.toISOString() : d.uploadedAt,
    })),
  };
}

export async function GET(request: NextRequest) {
  try {
    const adminDb = getAdminFirestore();
    if (!adminDb) {
      return NextResponse.json(
        { error: FIREBASE_ADMIN_NOT_CONFIGURED_MESSAGE },
        { status: 503 }
      );
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const auth = getAuth();
    const decoded = await auth.verifyIdToken(token);
    const uid = decoded.uid;

    const snapshot = await adminDb
      .collection("business_registrations")
      .where("userId", "==", uid)
      .orderBy("createdAt", "desc")
      .get();

    const registrations = snapshot.docs.map((doc) => serializeRegistration(doc));
    return NextResponse.json(registrations);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load registrations";
    if (message.includes("auth/") || message.includes("Decoding")) {
      return NextResponse.json({ error: "Unauthorized", message }, { status: 401 });
    }
    console.error("Error listing registrations:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

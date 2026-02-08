/**
 * API Route: Get Business Registration by ID
 * GET /api/registrations/[id]
 * Uses Firebase Admin to read the document (bypasses client Firestore rules).
 * Returns 403 if the registration does not belong to the authenticated user.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import type { DocumentSnapshot } from "firebase-admin/firestore";
import { getAdminFirestore, FIREBASE_ADMIN_NOT_CONFIGURED_MESSAGE } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serializeRegistration(doc: DocumentSnapshot): Record<string, unknown> {
  const data = doc.data();
  if (!data) return {};
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: registrationId } = await params;
    if (!registrationId) {
      return NextResponse.json({ error: "Registration ID required" }, { status: 400 });
    }

    const docRef = adminDb.collection("business_registrations").doc(registrationId);
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    const data = snap.data();
    const ownerId = data?.userId ?? data?.createdBy;
    if (ownerId !== uid) {
      return NextResponse.json(
        { error: "Forbidden", message: "You do not have access to this registration" },
        { status: 403 }
      );
    }

    const registration = serializeRegistration(snap);
    return NextResponse.json(registration);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load registration";
    if (message.includes("auth/") || message.includes("Decoding")) {
      return NextResponse.json({ error: "Unauthorized", message }, { status: 401 });
    }
    console.error("Error loading registration:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { SUPER_ADMIN_UID } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const superAdminUid = process.env.SUPER_ADMIN_UID || SUPER_ADMIN_UID;

function assertSuperAdmin(request: NextRequest): NextResponse | null {
  const userId = request.headers.get("x-user-id");
  if (!userId || userId !== superAdminUid) {
    return NextResponse.json(
      { error: "Forbidden - Admin access required" },
      { status: 403 }
    );
  }
  return null;
}

/**
 * GET - Fetch all professionals (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const denied = assertSuperAdmin(request);
    if (denied) return denied;

    const db = getAdminFirestore();
    const snap = await getDocs(collection(db, "professionals"));
    const professionals = snap.docs.map((d) => {
      const data: any = d.data();
      return {
        id: d.id,
        ownerUid: data.ownerUid || data.userId || "",
        name: data.name || "",
        title: data.title || "",
        firm: data.firm || "",
        location: data.location || "",
        specialties: data.specialties || [],
        status: data.status || "pending", // pending | approved | rejected
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null,
      };
    });

    return NextResponse.json({ professionals });
  } catch (error) {
    console.error("Error fetching professionals:", error);
    return NextResponse.json(
      { error: "Failed to fetch professionals" },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a professional (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const denied = assertSuperAdmin(request);
    if (denied) return denied;

    const body = await request.json();
    const {
      name,
      title = "",
      firm = "",
      location = "",
      specialties = [],
      status = "approved",
      ownerUid = "",
    } = body || {};

    if (!name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const ref = await addDoc(collection(db, "professionals"), {
      ownerUid,
      name: String(name).trim(),
      title: String(title || "").trim(),
      firm: String(firm || "").trim(),
      location: String(location || "").trim(),
      specialties: Array.isArray(specialties) ? specialties : [],
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: superAdminUid,
      updatedBy: superAdminUid,
    });

    return NextResponse.json({ success: true, id: ref.id });
  } catch (error) {
    console.error("Error creating professional:", error);
    return NextResponse.json(
      { error: "Failed to create professional" },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update professional (admin only): status and/or basic fields
 */
export async function PUT(request: NextRequest) {
  try {
    const denied = assertSuperAdmin(request);
    if (denied) return denied;

    const { targetProfessionalId, updates } = await request.json();
    if (!targetProfessionalId || !updates) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    await updateDoc(doc(db, "professionals", targetProfessionalId), {
      ...updates,
      updatedAt: new Date(),
      updatedBy: superAdminUid,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating professional:", error);
    return NextResponse.json(
      { error: "Failed to update professional" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete professional (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const denied = assertSuperAdmin(request);
    if (denied) return denied;

    const { targetProfessionalId } = await request.json();
    if (!targetProfessionalId) {
      return NextResponse.json(
        { error: "Missing targetProfessionalId" },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    await deleteDoc(doc(db, "professionals", targetProfessionalId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting professional:", error);
    return NextResponse.json(
      { error: "Failed to delete professional" },
      { status: 500 }
    );
  }
}



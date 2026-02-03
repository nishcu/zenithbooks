import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore, FIREBASE_ADMIN_NOT_CONFIGURED_MESSAGE } from "@/lib/firebase-admin";
import { SUPER_ADMIN_UID } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const superAdminUid = process.env.SUPER_ADMIN_UID || SUPER_ADMIN_UID;

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId || userId !== superAdminUid) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const db = getAdminFirestore();
    if (!db) {
      return NextResponse.json(
        { error: FIREBASE_ADMIN_NOT_CONFIGURED_MESSAGE },
        { status: 503 }
      );
    }

    const [usersSnap, professionalsSnap, pendingCertSnap, subscriptionsSnap] =
      await Promise.all([
        db.collection("users").get(),
        db.collection("professionals").get(),
        db.collection("certificationRequests").where("status", "==", "Pending").get(),
        db.collection("compliance_subscriptions").where("status", "in", ["active", "paused"]).get(),
      ]);

    return NextResponse.json({
      totalUsers: usersSnap.size,
      totalProfessionals: professionalsSnap.size,
      pendingCertifications: pendingCertSnap.size,
      activeSubscriptions: subscriptionsSnap.size,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}

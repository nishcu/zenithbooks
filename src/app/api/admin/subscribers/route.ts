import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore, FIREBASE_ADMIN_NOT_CONFIGURED_MESSAGE } from "@/lib/firebase-admin";
import { SUPER_ADMIN_UID } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const superAdminUid = process.env.SUPER_ADMIN_UID || SUPER_ADMIN_UID;

function toISO(date: unknown): string | null {
  if (!date) return null;
  if (typeof (date as { toDate?: () => Date }).toDate === "function") {
    return (date as { toDate: () => Date }).toDate().toISOString();
  }
  const d = date as { seconds?: number; _seconds?: number };
  if (d.seconds != null || d._seconds != null) {
    return new Date((d.seconds ?? d._seconds ?? 0) * 1000).toISOString();
  }
  if (typeof date === "string") return date;
  return null;
}

function planTierLabel(tier: string): string {
  const t = (tier || "").toLowerCase();
  if (t === "core") return "Core";
  if (t === "statutory") return "Statutory";
  if (t === "complete") return "Complete";
  return tier || "—";
}

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

    const snap = await db.collection("compliance_subscriptions").get();
    const subscribers: Array<{
      id: string;
      userId: string;
      userName: string;
      plan: string;
      startDate: string | null;
      status: string;
    }> = [];

    for (const doc of snap.docs) {
      const data = doc.data();
      const subUserId = data.userId as string;
      let userName = subUserId;
      try {
        const userSnap = await db.collection("users").doc(subUserId).get();
        if (userSnap.exists) {
          const u = userSnap.data();
          userName = (u?.companyName as string) || (u?.email as string) || subUserId;
        }
      } catch {
        // keep userId as fallback
      }
      const startDate = toISO(data.startDate) ?? toISO(data.createdAt);
      const status = (data.status as string) || "active";
      subscribers.push({
        id: doc.id,
        userId: subUserId,
        userName,
        plan: planTierLabel(data.planTier as string),
        startDate,
        status: status === "active" || status === "paused" ? "Active" : "Cancelled",
      });
    }

    return NextResponse.json({ subscribers });
  } catch (error) {
    console.error("Error fetching subscribers:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscribers" },
      { status: 500 }
    );
  }
}

/** PUT - Update subscription (e.g. cancel). Body: { subscriptionId, status: 'cancelled' } */
export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { subscriptionId, status: newStatus } = body as { subscriptionId?: string; status?: string };
    if (!subscriptionId || !newStatus) {
      return NextResponse.json(
        { error: "Missing subscriptionId or status" },
        { status: 400 }
      );
    }
    if (newStatus !== "cancelled" && newStatus !== "paused" && newStatus !== "active") {
      return NextResponse.json(
        { error: "Invalid status. Use cancelled, paused, or active" },
        { status: 400 }
      );
    }

    await db.collection("compliance_subscriptions").doc(subscriptionId).update({
      status: newStatus,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating subscriber:", error);
    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500 }
    );
  }
}

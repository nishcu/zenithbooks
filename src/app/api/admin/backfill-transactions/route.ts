/**
 * Admin-only: backfill paymentTransactions for a user from existing Firestore data.
 * Use when payments were made before paymentTransactions was written (e.g. missing rules).
 * Run once per user; safe to re-run (merge: true).
 *
 * Example (replace SUPER_ADMIN_UID and base URL):
 *   curl -X POST https://www.zenithbooks.in/api/admin/backfill-transactions \
 *     -H "Content-Type: application/json" -H "x-user-id: YOUR_SUPER_ADMIN_UID" \
 *     -d '{"userId":"WHloKR70F0e6WfYrb2G1ebAe1qF2"}'
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { SUPER_ADMIN_UID } from "@/lib/constants";
import { FieldValue } from "firebase-admin/firestore";

const superAdminUid = process.env.SUPER_ADMIN_UID || SUPER_ADMIN_UID;

/**
 * GET ?userId=xxx - List paymentTransactions for that user (admin only). Use to verify backfill.
 */
export async function GET(request: NextRequest) {
  try {
    const authUserId = request.headers.get("x-user-id");
    if (!authUserId || authUserId !== superAdminUid) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }
    const userId = request.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json(
        { error: "Bad request", message: "Query param userId is required" },
        { status: 400 }
      );
    }
    const db = getAdminFirestore();
    if (!db) {
      return NextResponse.json({ error: "Firebase Admin not configured" }, { status: 503 });
    }
    const snap = await db.collection("paymentTransactions").where("userId", "==", userId).get();
    const transactions = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.userId,
        orderId: data.orderId,
        planId: data.planId,
        amount: data.amount,
        status: data.status,
        source: data.source,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt,
      };
    });
    return NextResponse.json({ userId, count: transactions.length, transactions });
  } catch (e) {
    console.error("List transactions error:", e);
    return NextResponse.json(
      { error: "List failed", message: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUserId = request.headers.get("x-user-id");
    if (!authUserId || authUserId !== superAdminUid) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const userId = typeof body.userId === "string" ? body.userId.trim() : null;
    if (!userId) {
      return NextResponse.json(
        { error: "Bad request", message: "Body must include { userId: string }" },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    if (!db) {
      return NextResponse.json(
        { error: "Firebase Admin not configured" },
        { status: 503 }
      );
    }

    const created: string[] = [];

    // 1) User doc: subscription payment (cashfreeOrderId)
    const userRef = db.collection("users").doc(userId);
    const userSnap = await userRef.get();
    if (userSnap.exists()) {
      const u = userSnap.data()!;
      const orderId = u.cashfreeOrderId || u.demoOrderId;
      if (orderId) {
        const docId = orderId.startsWith("cf_") ? orderId : `cf_${orderId}`;
        await db.collection("paymentTransactions").doc(docId).set(
          {
            userId,
            provider: "cashfree",
            orderId: orderId.replace(/^cf_/, ""),
            paymentId: u.cashfreePaymentId || u.demoPaymentId || null,
            planId: u.subscriptionPlan || "business",
            amount: Number(u.paymentAmount) ?? 0,
            status: u.paymentStatus || "SUCCESS",
            source: "backfill_user",
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        created.push(docId);
      }
    }

    // 2) certificationRequests
    const certSnap = await db.collection("certificationRequests").where("userId", "==", userId).get();
    for (const d of certSnap.docs) {
      const data = d.data();
      const orderId = data.cashfreeOrderId;
      if (!orderId) continue;
      const docId = orderId.startsWith("cf_") ? orderId : `cf_${orderId}`;
      if (created.includes(docId)) continue;
      created.push(docId);
      await db.collection("paymentTransactions").doc(docId).set(
        {
          userId,
          provider: "cashfree",
          orderId: String(orderId).replace(/^cf_/, ""),
          paymentId: data.cashfreePaymentId || null,
          planId: data.serviceId || data.reportType || null,
          amount: Number(data.amount) ?? 0,
          status: "SUCCESS",
          source: "backfill_cert",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    // 3) noticeRequests (payment.orderId)
    const noticeSnap = await db.collection("noticeRequests").where("userId", "==", userId).get();
    for (const d of noticeSnap.docs) {
      const data = d.data();
      const orderId = data.payment?.orderId;
      if (!orderId) continue;
      const docId = orderId.startsWith("cf_") ? orderId : `cf_${orderId}`;
      if (created.includes(docId)) continue;
      created.push(docId);
      await db.collection("paymentTransactions").doc(docId).set(
        {
          userId,
          provider: "cashfree",
          orderId: String(orderId).replace(/^cf_/, ""),
          paymentId: data.payment?.paymentId || null,
          planId: data.payment?.planId || "notice",
          amount: Number(data.payment?.amount) ?? 0,
          status: "SUCCESS",
          source: "backfill_notice",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    // 4) userDocuments (payment.orderId)
    const userDocsSnap = await db.collection("userDocuments").where("userId", "==", userId).get();
    for (const d of userDocsSnap.docs) {
      const data = d.data();
      const orderId = data.payment?.orderId;
      if (!orderId) continue;
      const docId = orderId.startsWith("cf_") ? orderId : `cf_${orderId}`;
      if (created.includes(docId)) continue;
      created.push(docId);
      await db.collection("paymentTransactions").doc(docId).set(
        {
          userId,
          provider: "cashfree",
          orderId: String(orderId).replace(/^cf_/, ""),
          paymentId: data.payment?.paymentId || null,
          planId: data.payment?.planId || null,
          amount: Number(data.payment?.amount) ?? 0,
          status: "SUCCESS",
          source: "backfill_user_doc",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    // 5) business_registrations: we don't store order_id, only paymentId. Create synthetic doc so user sees the payment (use registration id as stable id)
    const regSnap = await db
      .collection("business_registrations")
      .where("userId", "==", userId)
      .get();
    const regSnap2 = await db
      .collection("business_registrations")
      .where("createdBy", "==", userId)
      .get();
    const regIds = new Set<string>();
    regSnap.docs.forEach((d) => regIds.add(d.id));
    regSnap2.docs.forEach((d) => regIds.add(d.id));
    for (const regId of regIds) {
      const regRef = db.collection("business_registrations").doc(regId);
      const regSnapDoc = await regRef.get();
      if (!regSnapDoc.exists() || !regSnapDoc.data()?.feePaid) continue;
      const data = regSnapDoc.data()!;
      // Synthetic doc id so it doesn't clash with real cf_* ids; transactions page will still show it
      const docId = `backfill_biz_${regId}`;
      if (created.includes(docId)) continue;
      created.push(docId);
      await db.collection("paymentTransactions").doc(docId).set(
        {
          userId,
          provider: "cashfree",
          orderId: regId,
          paymentId: data.paymentId || null,
          planId: `business_registration_${regId}`,
          amount: Number(data.feeAmount) ?? 0,
          status: "SUCCESS",
          source: "backfill_biz_reg",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    return NextResponse.json({
      success: true,
      userId,
      created: created.length,
      ids: created,
    });
  } catch (e) {
    console.error("Backfill transactions error:", e);
    return NextResponse.json(
      { error: "Backfill failed", message: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

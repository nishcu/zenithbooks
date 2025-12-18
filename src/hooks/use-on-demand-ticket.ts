"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  doc as docRef,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type OnDemandTicket = {
  id: string; // firestore doc id, usually cf_<orderId>
  orderId: string;
  planId: string | null;
  createdAt?: any;
};

export function useOnDemandTicket(params: { userId?: string | null; planId: string | null }) {
  const { userId, planId } = params;
  const [ticket, setTicket] = useState<OnDemandTicket | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canQuery = useMemo(() => Boolean(userId && planId), [userId, planId]);

  const refresh = useCallback(async () => {
    if (!canQuery || !userId || !planId) return;
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, "paymentTransactions"),
        where("userId", "==", userId),
        where("planId", "==", planId),
        where("status", "==", "SUCCESS"),
        where("consumedAt", "==", null),
        orderBy("createdAt", "desc"),
        limit(1)
      );
      const snap = await getDocs(q);
      const first = snap.docs[0];
      if (!first) {
        setTicket(null);
        return;
      }
      const data: any = first.data();
      setTicket({
        id: first.id,
        orderId: data?.orderId || first.id?.replace(/^cf_/, ""),
        planId: data?.planId ?? null,
        createdAt: data?.createdAt,
      });
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to load payment ticket");
    } finally {
      setLoading(false);
    }
  }, [canQuery, userId, planId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const consume = useCallback(
    async (ticketId: string) => {
      await updateDoc(docRef(db, "paymentTransactions", ticketId), {
        consumedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    },
    []
  );

  return { ticket, loading, error, refresh, consume };
}



"use client";

import React, { useCallback, useEffect } from "react";
import { CashfreeCheckout } from "@/components/payment/cashfree-checkout";
import { ShareButtons } from "@/components/documents/share-buttons";
import { useOnDemandUnlock } from "@/hooks/use-on-demand-unlock";
import { useOnDemandTicket } from "@/hooks/use-on-demand-ticket";
import { useToast } from "@/hooks/use-toast";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function OnDemandPayAndUseActions({
  userId,
  userEmail,
  userName,
  planId,
  planName,
  amount,
  fileName,
  contentRef,
  documentType,
  documentName,
  metadata,
  showDocument,
  setShowDocument,
}: {
  userId: string;
  userEmail: string;
  userName: string;
  planId: string;
  planName: string;
  amount: number;
  fileName: string;
  contentRef: React.RefObject<HTMLDivElement>;
  documentType: string;
  documentName: string;
  metadata?: any;
  showDocument: boolean;
  setShowDocument: (v: boolean) => void;
}) {
  const { toast } = useToast();
  const { ticket, error: ticketError, refresh, consume } = useOnDemandTicket({
    userId,
    planId,
  });

  // After /payment/success redirects back, we get an unlock token.
  // We refresh tickets and show the document (download UI) immediately.
  useOnDemandUnlock(planId, () => {
    void refresh();
    setShowDocument(true);
  });

  useEffect(() => {
    if (ticketError) {
      toast({
        variant: "destructive",
        title: "Could not verify payment ticket",
        description: ticketError,
      });
    }
  }, [ticketError, toast]);

  // If we discover an unconsumed ticket, allow the download UI (without setState during render)
  useEffect(() => {
    if (ticket?.id && !showDocument) {
      setShowDocument(true);
    }
  }, [ticket?.id, showDocument, setShowDocument]);

  const beforeDownload = useCallback(async () => {
    // If this is a paid service, require an unconsumed ticket.
    if (amount > 0) {
      if (!ticket?.id) {
        throw new Error("Payment required. Please complete payment to download.");
      }
    }

    // Save to My Documents (HTML snapshot) so user can re-download unlimited times later.
    // For paid services, we use the ticket id as a stable doc id (cf_<orderId>).
    const htmlSnapshot = contentRef.current?.innerHTML || "";
    if (!htmlSnapshot.trim()) {
      throw new Error("Document is not ready yet. Please try again in a moment.");
    }

    const docId = ticket?.id || `manual_${Date.now()}`;
    await setDoc(
      doc(db, "userDocuments", docId),
      {
        userId,
        documentType,
        documentName,
        status: amount > 0 ? "Paid" : "Free",
        htmlSnapshot,
        metadata: metadata ?? null,
        payment: ticket
          ? {
              provider: "cashfree",
              orderId: ticket.orderId,
              planId,
              amount,
            }
          : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Consume ticket AFTER we saved the document (1 payment = 1 use).
    if (amount > 0 && ticket?.id) {
      await consume(ticket.id);
      // After consumption, hide again until next payment
      setShowDocument(false);
      await refresh();
      toast({
        title: "Ticket used",
        description: "This payment ticket has been consumed (1 payment = 1 use). Your document is saved in My Documents.",
      });
    } else {
      toast({
        title: "Saved to My Documents",
        description: "Your document has been saved.",
      });
    }
  }, [amount, ticket, contentRef, userId, documentType, documentName, metadata, planId, consume, refresh, toast, setShowDocument]);

  const requiresPayment = amount > 0 && !showDocument && !ticket?.id;

  if (requiresPayment) {
    return (
      <CashfreeCheckout
        amount={amount}
        planId={planId}
        planName={planName}
        userId={userId}
        userEmail={userEmail}
        userName={userName}
        onSuccess={() => {
          // In practice Cashfree redirects; we still set this for demo mode / non-redirect flows
          setShowDocument(true);
          void refresh();
        }}
      />
    );
  }

  // If free service, showDocument can be used as "has generated preview" flag.
  if (!showDocument) {
    return null;
  }

  return (
    <ShareButtons
      contentRef={contentRef}
      fileName={fileName}
      beforeDownload={beforeDownload}
    />
  );
}



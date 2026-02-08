"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { addDoc, collection, doc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const [user, authLoading] = useAuthState(auth);
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    const orderIdParam = searchParams.get('order_id');
    const paymentIdParam = searchParams.get('payment_id');
    const orderStatus = searchParams.get('order_status');
    
    setOrderId(orderIdParam);
    setPaymentId(paymentIdParam);

      if (!orderIdParam) {
        setStatus('failed');
        toast({
          variant: 'default',
          title: 'Payment Information Missing',
          description: 'We couldn\'t find your order information. Please contact support with your payment details.',
        });
        return;
      }

    if (!user?.uid) {
      // User must be logged in to complete post-payment actions (save to My Documents, etc.)
      setStatus('failed');
      toast({
        variant: 'default',
        title: 'Please Sign In',
        description: 'Please sign in again and refresh this page to complete your purchase and save the document.',
      });
      return;
    }

    // Verify payment with backend
    const verifyPayment = async () => {
      try {
        // Extract planId from order tags if available, or use a default
        const planId = localStorage.getItem('pending_plan_id') || 'unknown';
        const orderAmount = Number(searchParams.get("order_amount") || 0) || null;

        // Persist transaction record immediately so it always appears in Transaction History
        // (even if verify fails or is slow – e.g. business registration, any payment)
        if (user?.uid && orderIdParam) {
          try {
            await setDoc(
              doc(db, "paymentTransactions", `cf_${orderIdParam}`),
              {
                userId: user.uid,
                provider: "cashfree",
                orderId: orderIdParam,
                paymentId: paymentIdParam || null,
                planId: planId || null,
                amount: orderAmount,
                status: "SUCCESS",
                consumedAt: null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                source: "payment_success",
              },
              { merge: true }
            );
          } catch (e) {
            console.error("Failed to write paymentTransactions from /payment/success:", e);
          }
        }

        const response = await fetch('/api/payment/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId: orderIdParam,
            paymentId: paymentIdParam,
            userId: user?.uid,
            planId: planId,
            amount: orderAmount ?? 0,
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setStatus('success');
          toast({
            title: 'Payment Successful!',
            description: 'Your payment has been verified and subscription activated.',
          });

          // Decide where to redirect after success (default dashboard)
          let redirectTo: string = '/dashboard';

          // If this payment came from a CA certificate purchase, finalize the flow here
          // (Cashfree checkout typically redirects, so the originating page may not run callbacks).
          try {
            const raw = localStorage.getItem("pending_ca_certificate");
            if (raw && user?.uid && orderIdParam) {
              const pending = JSON.parse(raw);
              if (pending?.type === "ca_certificate") {
                const now = new Date();
                const baseId = `cf_${orderIdParam}`;

                // 1) Autosave into My Documents (userDocuments)
                await setDoc(
                  doc(db, "userDocuments", baseId),
                  {
                    userId: user.uid,
                    documentType: pending.documentType || "ca-certificate",
                    documentName: pending.documentName || pending.reportType || "CA Certificate",
                    status: "Paid",
                    formData: pending.formData || {},
                    payment: {
                      provider: "cashfree",
                      orderId: orderIdParam,
                      paymentId: paymentIdParam || null,
                      amount: pending.amount ?? null,
                      planId: pending.planId || null,
                    },
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                  },
                  { merge: true }
                );

                // 2) Send certification request to admin
                await setDoc(
                  doc(db, "certificationRequests", baseId),
                  {
                    reportType: pending.reportType || "CA Certificate",
                    clientName: pending.clientName || "",
                    requestedBy: user.displayName || user.email,
                    userId: user.uid,
                    requestDate: serverTimestamp(),
                    status: "Pending",
                    draftUrl: "#",
                    signedDocumentUrl: null,
                    formData: pending.formData || {},
                    cashfreeOrderId: orderIdParam,
                    cashfreePaymentId: paymentIdParam || null,
                    amount: pending.amount ?? null,
                    serviceId: pending.planId || null,
                    source: "payment_success",
                    createdAt: serverTimestamp(),
                  },
                  { merge: true }
                );

                // 3) Consume ticket immediately (service request has been created)
                try {
                  await updateDoc(doc(db, "paymentTransactions", baseId), {
                    consumedAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    consumedBy: "payment_success:ca_certificate",
                  } as any);
                } catch (e) {
                  console.error("Failed to consume payment ticket for CA certificate:", e);
                }

                // Clear after successful writes
                localStorage.removeItem("pending_ca_certificate");
              }
            }
          } catch (e) {
            console.error("Post-payment CA certificate finalization failed:", e);
            // Do not fail the payment success screen; user can retry by contacting admin/support.
          }

          // Rental Receipts is "pay first -> fill -> download once".
          // So we DO NOT save a userDocument here (fields aren't filled yet).

          // If this payment came from ITR filing, redirect back to ITR form with payment completion
          try {
            const itrRaw = localStorage.getItem("pending_itr_payment");
            if (itrRaw && orderIdParam) {
              const itrPending = JSON.parse(itrRaw);
              if (itrPending?.type === "itr_filing" && itrPending?.formType) {
                // Store payment completion token for ITR page to consume
                localStorage.setItem(
                  "itr_payment_completed",
                  JSON.stringify({
                    formType: itrPending.formType,
                    financialYear: itrPending.financialYear,
                    orderId: orderIdParam,
                    paymentId: paymentIdParam || null,
                    planId: planId,
                    amount: itrPending.amount,
                    at: Date.now(),
                  })
                );
                localStorage.removeItem("pending_itr_payment");
                // Redirect to ITR new page with payment completion params
                redirectTo = `/itr-filing/new?order_status=PAID&plan_id=${encodeURIComponent(planId || '')}&payment_completed=true&form_type=${encodeURIComponent(itrPending.formType)}`;
              }
            }
          } catch (e) {
            console.error("Post-payment ITR handling failed:", e);
          }

          // If this payment came from compliance plan subscription
          try {
            const complianceRaw = localStorage.getItem("pending_compliance_subscription");
            if (complianceRaw && orderIdParam) {
              const compliancePending = JSON.parse(complianceRaw);
              if (compliancePending?.type === "compliance_plan") {
                // Subscription activation handled by webhook
                // Just redirect to compliance subscription page
                localStorage.removeItem("pending_compliance_subscription");
                redirectTo = "/compliance-plans/my-subscription";
              }
            }
          } catch (e) {
            console.error("Post-payment compliance subscription handling failed:", e);
          }

          // If this payment came from business registration
          try {
            const regRaw = localStorage.getItem("pending_business_registration");
            if (regRaw && orderIdParam) {
              const regPending = JSON.parse(regRaw);
              if (regPending?.type === "business_registration" && regPending?.registrationId) {
                localStorage.removeItem("pending_business_registration");
                redirectTo = `/business-registrations/${regPending.registrationId}`;
              }
            }
          } catch (e) {
            console.error("Post-payment business registration redirect failed:", e);
          }

          // If this payment came from an on-demand action (e.g., Form 16), unlock it and redirect back
          try {
            const raw = localStorage.getItem("pending_on_demand_action");
            if (raw && orderIdParam) {
              const pending = JSON.parse(raw);
              // Always record the last successful on-demand payment (used for generic resume/UX)
              try {
                localStorage.setItem(
                  "on_demand_last_payment",
                  JSON.stringify({
                    planId,
                    orderId: orderIdParam,
                    paymentId: paymentIdParam || null,
                    at: Date.now(),
                    pendingType: pending?.type || "unknown",
                  })
                );
              } catch {}

              if (pending?.type === "form16") {
                // Store an unlock token for the Form 16 page to consume
                localStorage.setItem(
                  "on_demand_unlock",
                  JSON.stringify({
                    type: "form16",
                    mode: pending.mode, // "single" | "bulk"
                    orderId: orderIdParam,
                    paymentId: paymentIdParam || null,
                    planId,
                    at: Date.now(),
                  })
                );
                localStorage.removeItem("pending_on_demand_action");
                redirectTo = pending.returnTo || "/income-tax/form-16";
              } else if (pending?.type === "cma_report") {
                // Store an unlock token for CMA report page to consume + auto-generate
                localStorage.setItem(
                  "on_demand_unlock",
                  JSON.stringify({
                    type: "cma_report",
                    orderId: orderIdParam,
                    paymentId: paymentIdParam || null,
                    planId,
                    at: Date.now(),
                    payload: pending.payload || null,
                  })
                );
                // Consume ticket now (this purchase is considered used; the CMA page will still generate/download)
                try {
                  await updateDoc(doc(db, "paymentTransactions", `cf_${orderIdParam}`), {
                    consumedAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    consumedBy: "payment_success:cma_report",
                  } as any);
                } catch (e) {
                  console.error("Failed to consume payment ticket for CMA report:", e);
                }
                localStorage.removeItem("pending_on_demand_action");
                redirectTo = pending.returnTo || "/reports/cma-report";
              } else if (pending?.type === "notice_request") {
                // Create the notice request after payment (can't rely on originating page callbacks due to redirect)
                if (user?.uid) {
                  const n = pending?.payload || {};
                  await addDoc(collection(db, "noticeRequests"), {
                    userId: user.uid,
                    noticeType: n.noticeType || "UNKNOWN",
                    fileName: n.fileName || null,
                    fileType: n.fileType || null,
                    dueDate: n.dueDate ? new Date(n.dueDate) : null,
                    description: n.description || "",
                    status: "Pending Assignment",
                    requestedAt: serverTimestamp(),
                    payment: {
                      provider: "cashfree",
                      orderId: orderIdParam,
                      paymentId: paymentIdParam || null,
                      amount: n.amount ?? null,
                      planId: planId || null,
                    },
                    source: "payment_success",
                  });
                }
                // Consume ticket now (service request has been created)
                try {
                  await updateDoc(doc(db, "paymentTransactions", `cf_${orderIdParam}`), {
                    consumedAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    consumedBy: "payment_success:notice_request",
                  } as any);
                } catch (e) {
                  console.error("Failed to consume payment ticket for notice request:", e);
                }
                localStorage.removeItem("pending_on_demand_action");
                redirectTo = pending.returnTo || "/notices";
              } else if (pending?.returnTo) {
                // Generic: just send the user back to where they initiated the payment
                try {
                  if (pending?.planId) {
                    localStorage.setItem(
                      "on_demand_unlock",
                      JSON.stringify({
                        type: "plan",
                        planId: pending.planId,
                        orderId: orderIdParam,
                        paymentId: paymentIdParam || null,
                        at: Date.now(),
                      })
                    );

                    // Special-case: some legacy pages don't use ShareButtons.beforeDownload yet.
                    // For these, we treat "unlock" as the single use.
                    if (pending.planId === "partnership_deed_download") {
                      try {
                        await updateDoc(doc(db, "paymentTransactions", `cf_${orderIdParam}`), {
                          consumedAt: serverTimestamp(),
                          updatedAt: serverTimestamp(),
                          consumedBy: "payment_success:plan_unlock(partnership_deed_download)",
                        } as any);
                      } catch (e) {
                        console.error("Failed to consume payment ticket for partnership deed unlock:", e);
                      }
                    }
                  }
                } catch {}
                localStorage.removeItem("pending_on_demand_action");
                redirectTo = pending.returnTo;
              }
            }
          } catch (e) {
            console.error("Post-payment on-demand finalization failed:", e);
          }

          // Fallback: if we still haven't decided a destination, use pending_return_to + pending_plan_id
          // This fixes cases where pending_on_demand_action wasn't persisted (or was cleared) but the user paid.
          try {
            if (redirectTo === "/dashboard") {
              const returnTo = localStorage.getItem("pending_return_to");
              const pendingPlanId = localStorage.getItem("pending_plan_id");
              if (returnTo) {
                if (pendingPlanId) {
                  try {
                    localStorage.setItem(
                      "on_demand_unlock",
                      JSON.stringify({
                        type: "plan",
                        planId: pendingPlanId,
                        orderId: orderIdParam,
                        paymentId: paymentIdParam || null,
                        at: Date.now(),
                      })
                    );
                  } catch {}
                }
                redirectTo = returnTo;
              }
              localStorage.removeItem("pending_return_to");
            }
          } catch (e) {
            console.error("Post-payment fallback resume failed:", e);
          }
          
          // Clear pending plan ID
          localStorage.removeItem('pending_plan_id');
          
          // Redirect after 3 seconds
          setTimeout(() => {
            router.push(redirectTo);
          }, 3000);
        } else {
          setStatus('failed');
          toast({
            variant: 'default',
            title: 'Payment Verification Pending',
            description: data.message || 'We\'re having trouble verifying your payment. If you were charged, please contact our support team with your order details.',
          });
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setStatus('failed');
        toast({
          variant: 'default',
          title: 'Verification Issue',
          description: 'We couldn\'t verify your payment right now. If you were charged, please contact our support team with your order ID.',
        });
      }
    };

    verifyPayment();
  }, [searchParams, user, authLoading, router, toast]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            {status === 'loading' && 'Verifying Payment...'}
            {status === 'success' && 'Payment Successful!'}
            {status === 'failed' && 'Payment Failed'}
          </CardTitle>
          <CardDescription className="text-center">
            {status === 'loading' && 'Please wait while we verify your payment'}
            {status === 'success' && 'Your payment has been processed successfully'}
            {status === 'failed' && 'There was an issue with your payment'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            {status === 'loading' && <Loader2 className="h-16 w-16 animate-spin text-primary" />}
            {status === 'success' && <CheckCircle2 className="h-16 w-16 text-green-500" />}
            {status === 'failed' && <XCircle className="h-16 w-16 text-red-500" />}
          </div>

          {orderId && (
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                <strong>Order ID:</strong> {orderId}
              </p>
              {paymentId && (
                <p className="text-sm text-muted-foreground">
                  <strong>Payment ID:</strong> {paymentId}
                </p>
              )}
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Redirecting to dashboard...
              </p>
              <Button onClick={() => router.push('/dashboard')} className="w-full">
                Go to Dashboard
              </Button>
            </div>
          )}

          {status === 'failed' && (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                If you have been charged, please contact support with your order ID.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => router.push('/pricing')} className="flex-1">
                  Try Again
                </Button>
                <Button onClick={() => router.push('/dashboard')} className="flex-1">
                  Go to Dashboard
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}


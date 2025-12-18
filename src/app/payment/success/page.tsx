"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const [user] = useAuthState(auth);
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  useEffect(() => {
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

    // Verify payment with backend
    const verifyPayment = async () => {
      try {
        // Extract planId from order tags if available, or use a default
        // You might want to store this in localStorage or pass it differently
        const planId = localStorage.getItem('pending_plan_id') || 'unknown';
        
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
            amount: parseFloat(searchParams.get('order_amount') || '0'),
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setStatus('success');
          toast({
            title: 'Payment Successful!',
            description: 'Your payment has been verified and subscription activated.',
          });

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

                // Clear after successful writes
                localStorage.removeItem("pending_ca_certificate");
              }
            }
          } catch (e) {
            console.error("Post-payment CA certificate finalization failed:", e);
            // Do not fail the payment success screen; user can retry by contacting admin/support.
          }
          
          // Clear pending plan ID
          localStorage.removeItem('pending_plan_id');
          
          // Redirect to dashboard after 3 seconds
          setTimeout(() => {
            router.push('/dashboard');
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
  }, [searchParams, user, router, toast]);

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


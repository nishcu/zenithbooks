"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';

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
        variant: 'destructive',
        title: 'Invalid Payment',
        description: 'Order ID not found in payment response.',
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
          
          // Clear pending plan ID
          localStorage.removeItem('pending_plan_id');
          
          // Redirect to dashboard after 3 seconds
          setTimeout(() => {
            router.push('/dashboard');
          }, 3000);
        } else {
          setStatus('failed');
          toast({
            variant: 'destructive',
            title: 'Payment Verification Failed',
            description: data.message || 'Could not verify payment. Please contact support.',
          });
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setStatus('failed');
        toast({
          variant: 'destructive',
          title: 'Verification Error',
          description: 'Failed to verify payment. Please contact support.',
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


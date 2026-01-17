"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CashfreeCheckout } from '@/components/payment/cashfree-checkout';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    setLoading(false);
  }, [user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const type = searchParams.get('type');
  const amount = parseFloat(searchParams.get('amount') || '0');
  const planId = searchParams.get('planId') || searchParams.get('plan');
  const planName = searchParams.get('planName') || 'Plan';
  const billingPeriod = searchParams.get('billingPeriod') || 'monthly';
  const compliancePlanTier = searchParams.get('planTier');

  // For compliance plans
  if (type === 'compliance_plan' && compliancePlanTier) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Payment</CardTitle>
            <CardDescription>
              Subscribe to {planName} - Monthly Compliance Services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan:</span>
                <span className="font-medium">{planName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Billing:</span>
                <span className="font-medium capitalize">{billingPeriod}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-4 border-t">
                <span>Total Amount:</span>
                <span>₹{amount.toLocaleString('en-IN')}</span>
              </div>
            </div>
            <CashfreeCheckout
              amount={amount}
              planId={`compliance_${compliancePlanTier}`}
              planName={planName}
              userId={user?.uid || ''}
              userEmail={user?.email || undefined}
              userName={user?.displayName || undefined}
              postPaymentContext={{
                key: 'pending_compliance_subscription',
                payload: {
                  type: 'compliance_plan',
                  planTier: compliancePlanTier,
                  planName,
                  billingPeriod,
                  amount,
                },
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // For regular subscriptions
  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Complete Your Payment</CardTitle>
          <CardDescription>
            Subscribe to {planName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-6">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan:</span>
              <span className="font-medium">{planName}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-4 border-t">
              <span>Total Amount:</span>
              <span>₹{amount.toLocaleString('en-IN')}</span>
            </div>
          </div>
          <CashfreeCheckout
            amount={amount}
            planId={planId || 'unknown'}
            planName={planName}
            userId={user?.uid || ''}
            userEmail={user?.email || undefined}
            userName={user?.displayName || undefined}
          />
        </CardContent>
      </Card>
    </div>
  );
}



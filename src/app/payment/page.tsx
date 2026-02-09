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

  // For Virtual CFO (₹2,999/month)
  if (type === 'virtual_cfo') {
    const virtualCfoAmount = amount > 0 ? amount : 2999;
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Payment</CardTitle>
            <CardDescription>
              Subscribe to Virtual CFO – ₹2,999/month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan:</span>
                <span className="font-medium">Virtual CFO (Monthly)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Billing:</span>
                <span className="font-medium">Monthly</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-4 border-t">
                <span>Total Amount:</span>
                <span>₹{virtualCfoAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
            <CashfreeCheckout
              amount={virtualCfoAmount}
              planId="virtual_cfo_monthly"
              planName="Virtual CFO (Monthly)"
              userId={user?.uid || ''}
              userEmail={user?.email || undefined}
              userName={user?.displayName || undefined}
              postPaymentContext={{
                key: 'pending_virtual_cfo',
                payload: {
                  type: 'virtual_cfo',
                  planName: 'Virtual CFO (Monthly)',
                  amount: virtualCfoAmount,
                  billingPeriod: 'monthly',
                },
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // For Once-in-a-Lifetime Business Control Program (₹4,999 + Stock Audit as applicable)
  if (type === 'business_control_program') {
    const bcpAmount = amount > 0 ? amount : 4999;
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Payment</CardTitle>
            <CardDescription>
              Once-in-a-Lifetime Business Control Program – 7-day system reset
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Product:</span>
                <span className="font-medium">Business Control Program</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration:</span>
                <span className="font-medium">7 days</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-4 border-t">
                <span>Program fee:</span>
                <span>₹{bcpAmount.toLocaleString('en-IN')}</span>
              </div>
              <p className="text-xs text-muted-foreground">Stock Audit charges as applicable will be communicated separately.</p>
            </div>
            <CashfreeCheckout
              amount={bcpAmount}
              planId="business_control_program"
              planName="Once-in-a-Lifetime Business Control Program"
              userId={user?.uid || ''}
              userEmail={user?.email || undefined}
              userName={user?.displayName || undefined}
              postPaymentContext={{
                key: 'pending_business_control_program',
                payload: {
                  type: 'business_control_program',
                  planName: 'Once-in-a-Lifetime Business Control Program',
                  amount: bcpAmount,
                },
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // For Business Driven Applications (₹14,999 one-time)
  if (type === 'business_driven_applications') {
    const bdaAmount = amount > 0 ? amount : 14999;
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Payment</CardTitle>
            <CardDescription>
              Business Driven Applications – One app made only for your business
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Product:</span>
                <span className="font-medium">Business Driven Applications</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Offer:</span>
                <span className="font-medium">One business = One application (one-time)</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-4 border-t">
                <span>Total:</span>
                <span>₹{bdaAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
            <CashfreeCheckout
              amount={bdaAmount}
              planId="business_driven_applications"
              planName="Business Driven Applications"
              userId={user?.uid || ''}
              userEmail={user?.email || undefined}
              userName={user?.displayName || undefined}
              postPaymentContext={{
                key: 'pending_business_driven_applications',
                payload: {
                  type: 'business_driven_applications',
                  planName: 'Business Driven Applications',
                  amount: bdaAmount,
                },
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // For Founder Control Week (₹9,999 one-time)
  if (type === 'founder_control_week') {
    const fcwAmount = amount > 0 ? amount : 9999;
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Payment</CardTitle>
            <CardDescription>
              Founder Control Week – One-Week Startup Operating System
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Product:</span>
                <span className="font-medium">Founder Control Week</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration:</span>
                <span className="font-medium">7 days (1 full week)</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-4 border-t">
                <span>Total Amount:</span>
                <span>₹{fcwAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
            <CashfreeCheckout
              amount={fcwAmount}
              planId="founder_control_week"
              planName="Founder Control Week"
              userId={user?.uid || ''}
              userEmail={user?.email || undefined}
              userName={user?.displayName || undefined}
              postPaymentContext={{
                key: 'pending_founder_control_week',
                payload: {
                  type: 'founder_control_week',
                  planName: 'Founder Control Week',
                  amount: fcwAmount,
                },
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // For Inventory Audit (1/2/3 days – service fee; travel/TA/DA separate)
  if (type === 'inventory_audit') {
    const auditAmount = amount > 0 ? amount : 1999;
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Payment</CardTitle>
            <CardDescription>
              Inventory Audit – Service fee (Travelling, TA & DA separate)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service:</span>
                <span className="font-medium">{planName || "Inventory Audit"}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-4 border-t">
                <span>Service fee:</span>
                <span>₹{auditAmount.toLocaleString('en-IN')}</span>
              </div>
              <p className="text-xs text-muted-foreground">Travelling, TA & DA will be as per actuals / agreed terms.</p>
            </div>
            <CashfreeCheckout
              amount={auditAmount}
              planId={planId || 'inventory_audit_1day'}
              planName={planName || "Inventory Audit"}
              userId={user?.uid || ''}
              userEmail={user?.email || undefined}
              userName={user?.displayName || undefined}
              postPaymentContext={{
                key: 'pending_inventory_audit',
                payload: {
                  type: 'inventory_audit',
                  planId: planId || 'inventory_audit_1day',
                  planName: planName || "Inventory Audit",
                  amount: auditAmount,
                },
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

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



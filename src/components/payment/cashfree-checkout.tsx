"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { loadCashfree } from '@/lib/cashfree';

interface CashfreeCheckoutProps {
  amount: number;
  planId: string;
  planName: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  /**
   * Optional payload to persist before redirecting to Cashfree.
   * This lets /payment/success complete post-payment actions (e.g., autosave document).
   */
  postPaymentContext?: {
    key: string; // localStorage key
    payload: any; // JSON-serializable payload
  };
  onSuccess?: (paymentId: string) => void;
  onFailure?: () => void;
}

declare global {
  interface Window {
    Cashfree: any;
  }
}

export function CashfreeCheckout({
  amount,
  planId,
  planName,
  userId,
  userEmail,
  userName,
  postPaymentContext,
  onSuccess,
  onFailure,
}: CashfreeCheckoutProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handlePayment = async () => {
    setIsLoading(true);

    try {
      // Validate user is authenticated
      if (!userId || !userEmail) {
        toast({
          variant: 'default',
          title: 'Please Sign In',
          description: 'You need to sign in to your account to proceed with payment.',
        });
        setIsLoading(false);
        return;
      }

      console.log('Creating payment order for:', { amount, planId, userId, userEmail, userName });
      
      // Store planId in localStorage for payment success page
      localStorage.setItem('pending_plan_id', planId);

      // Always store a return-to URL for post-redirect resume (used as fallback if other keys are missing)
      try {
        localStorage.setItem(
          "pending_return_to",
          `${window.location.pathname}${window.location.search || ""}`
        );
      } catch (e) {
        console.warn("Failed to persist pending_return_to:", e);
      }

      // Always persist a generic "returnTo" context so /payment/success can send the user back
      // even if the originating page relies on onSuccess callbacks (Cashfree typically redirects).
      if (!postPaymentContext?.key) {
        try {
          localStorage.setItem(
            "pending_on_demand_action",
            JSON.stringify({
              type: "generic",
              planId,
              planName,
              amount,
              returnTo: `${window.location.pathname}${window.location.search || ""}`,
              at: Date.now(),
            })
          );
        } catch (e) {
          console.warn("Failed to persist pending_on_demand_action:", e);
        }
      }

      // Store optional post-payment context for the success page to finish the flow
      if (postPaymentContext?.key) {
        try {
          localStorage.setItem(postPaymentContext.key, JSON.stringify(postPaymentContext.payload ?? {}));
        } catch (e) {
          console.warn('Failed to persist postPaymentContext:', e);
        }
      }

      // Prepare customer details
      const customerDetailsPayload = {
        customer_id: userId,
        customer_email: userEmail || '',
        customer_phone: '9999999999', // Default phone - update with user phone if available
        customer_name: userName || '',
      };

      // DEBUG: Log what we're sending to the API
      console.log('DEBUG - customerDetails being sent to API:', customerDetailsPayload);
      console.log('DEBUG - userEmail value:', userEmail);
      console.log('DEBUG - userName value:', userName);

      // Extract compliance plan details from postPaymentContext
      let paymentType = 'subscription';
      let compliancePlanTier: string | undefined;
      let billingPeriod: string | undefined;

      if (postPaymentContext?.key === 'pending_compliance_subscription') {
        const complianceData = postPaymentContext.payload;
        if (complianceData?.type === 'compliance_plan') {
          paymentType = 'compliance_plan';
          compliancePlanTier = complianceData.planTier;
          billingPeriod = complianceData.billingPeriod;
        }
      }

      const requestBody = {
        amount,
        currency: 'INR',
        userId,
        planId,
        customerDetails: customerDetailsPayload,
        orderMeta: {
          return_url: `${window.location.origin}/payment/success?order_id={order_id}`,
          notify_url: `${window.location.origin}/api/payment/webhook`,
          payment_methods: 'cc,dc,nb,upi', // Cashfree payment methods
        },
        userEmail: userEmail, // Pass as fallback
        userName: userName,   // Pass as fallback
        paymentType,
        ...(compliancePlanTier ? { compliancePlanTier } : {}),
        ...(billingPeriod ? { billingPeriod } : {}),
      };

      console.log('DEBUG - Full request body:', requestBody);

      // Create order on server
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log('PAYMENT API DATA:', data);

      if (!response.ok) {
        // Provide more specific error messages
        let errorMessage = 'Failed to create payment order';
        
        if (response.status === 400) {
          errorMessage = data.message || data.error || 'Invalid payment request. Please check your information and try again.';
        } else if (response.status === 401 || response.status === 403) {
          // 401/403 from our API means user auth issue
          errorMessage = data.message || 'Authentication required. Please log in and try again.';
        } else if (response.status === 500 || response.status === 503) {
          // 500/503 means Cashfree API or server error
          errorMessage = data.message || data.error || 'Payment gateway error. Please try again later or contact support.';
          console.error('Payment API error details:', data);
          
          // Special handling for missing Cashfree credentials
          if (data.error === 'Cashfree keys missing' || data.message?.includes('CASHFREE_APP_ID')) {
            errorMessage = 'Payment gateway is not configured. Please contact support or check your environment configuration.';
            console.error('Cashfree credentials missing - ensure CASHFREE_APP_ID and CASHFREE_SECRET_KEY are set in environment variables.');
          }
          
          // Log additional details for debugging
          if (data.details && process.env.NODE_ENV === 'development') {
            console.error('Cashfree API error details:', data.details);
            if (data.details.missingKeys) {
              console.error('Missing environment variables:', data.details.missingKeys);
            }
          }
        } else {
          errorMessage = data.message || data.error || `Payment error (${response.status}). Please try again.`;
        }
        
        throw new Error(errorMessage);
      }

      // Check if this is demo mode (no real API keys configured)
      if (data.demoMode === true) {
        console.log('Running in demo mode - payment UI will show but transactions won\'t process');
        toast({
          title: 'Demo Mode',
          description: 'Payment gateway is in demo mode. Configure CASHFREE_APP_ID and CASHFREE_SECRET_KEY for real payments.',
          duration: 5000,
        });
        return;
      }

      console.log('✅ Payment gateway is in LIVE mode - real transactions will be processed');

      // Extract paymentSessionId from backend response
      // Backend returns payment_session_id (snake_case) - MUST match backend exactly
      const paymentSessionId = data.payment_session_id;
      
      if (!paymentSessionId) {
        console.error('❌ paymentSessionId missing from BACKEND');
        console.error('Response keys:', Object.keys(data));
        console.error('Full response:', data);
        toast({
          variant: 'default',
          title: 'Payment Setup Issue',
          description: 'We couldn\'t set up your payment session. Please refresh the page and try again.',
        });
        setIsLoading(false);
        onFailure?.();
              return;
            }

      console.log('SDK LOADED - paymentSessionId:', paymentSessionId.substring(0, 40) + '...');

      // Load Cashfree SDK dynamically
      try {
        await loadCashfree();
        console.log('✅ Cashfree SDK loaded and ready');
      } catch (error) {
        console.error('❌ Failed to load Cashfree SDK:', error);
        toast({
          variant: 'default',
          title: 'Payment Gateway Loading',
          description: 'The payment gateway is taking a moment to load. Please refresh the page and try again.',
        });
        setIsLoading(false);
        onFailure?.();
        return;
      }

      // Verify SDK is ready
      if (!window.Cashfree) {
        console.error('❌ Cashfree SDK not available on window object');
        toast({
          variant: 'default',
          title: 'Payment Gateway Not Ready',
          description: 'The payment gateway needs a moment to initialize. Please wait a second and try again.',
        });
        setIsLoading(false);
        onFailure?.();
        return;
      }

      // Cashfree SDK v3 API pattern:
      // 1. window.Cashfree({ mode: "production" | "sandbox" }) - factory function (NOT constructor)
      // 2. cashfree.checkout({ paymentSessionId: "..." }) - launches checkout
      // Note: Determine mode from API response
      
      // Determine mode from API response (LIVE = production, TEST = sandbox)
      const mode = data.mode === 'LIVE' ? 'production' : 'sandbox';
      console.log('Initializing Cashfree SDK with mode:', mode);

      try {
        // Step 1: Initialize Cashfree SDK with mode
        // window.Cashfree is a factory function, NOT a constructor
        // DO NOT use: new Cashfree()
        // DO use: window.Cashfree({ mode: "production" })
        const cashfreeSDK = await loadCashfree();
        const cashfree = cashfreeSDK({
          mode: mode,
        });
        console.log('✅ Cashfree SDK initialized');
        
        // Step 2: Launch checkout with paymentSessionId
        // checkout() method receives { paymentSessionId: "..." }
        console.log('Launching Cashfree checkout with paymentSessionId:', paymentSessionId.substring(0, 40) + '...');
        const result = await cashfree.checkout({
          paymentSessionId: paymentSessionId,
            });
        
        console.log('✅ Cashfree checkout completed:', result);
        // Checkout will redirect - don't reset loading state as user is being redirected

      } catch (cashfreeError) {
        console.error('❌ Cashfree checkout error:', cashfreeError);

        let errorMessage = 'We couldn\'t process your payment right now. Please try again.';
        let errorTitle = 'Payment Issue';

        if (cashfreeError instanceof Error) {
          if (cashfreeError.message.includes('Invalid') || cashfreeError.message.includes('session')) {
            errorTitle = 'Payment Session Expired';
            errorMessage = 'Your payment session has expired. Please start the payment process again.';
          } else if (cashfreeError.message.includes('Network')) {
            errorTitle = 'Connection Issue';
            errorMessage = 'There seems to be a network issue. Please check your internet connection and try again.';
          } else {
            errorMessage = cashfreeError.message || errorMessage;
          }
        }

        toast({
          variant: 'default',
          title: errorTitle,
          description: errorMessage,
        });
        setIsLoading(false);
        onFailure?.();
      }

    } catch (error) {
      console.error('Payment initialization error:', error);

      let errorMessage = 'We couldn\'t start your payment right now. Please try again in a moment.';
      let errorTitle = 'Payment Setup Issue';
      
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
        
        // Set specific titles based on error type
        if (error.message.includes('Authentication required') || error.message.includes('log in')) {
          errorTitle = 'Please Sign In';
          errorMessage = 'You need to sign in to your account to proceed with payment.';
        } else if (error.message.includes('Payment gateway not configured')) {
          errorTitle = 'Payment Setup Required';
          errorMessage = 'The payment system is currently being set up. Please contact our support team for assistance.';
        } else if (error.message.includes('Failed to load Cashfree script')) {
          errorTitle = 'Loading Issue';
          errorMessage = 'The payment gateway is taking longer than usual to load. Please check your internet connection and try again.';
        } else if (error.message.includes('temporarily unavailable')) {
          errorTitle = 'Service Temporarily Unavailable';
          errorMessage = 'Our payment service is temporarily unavailable. Please try again in a few minutes.';
        }
      }

      toast({
        variant: 'default',
        title: errorTitle,
        description: errorMessage,
      });
      onFailure?.();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={isLoading}
      className="w-full"
      size="lg"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        `Pay ₹${amount.toLocaleString('en-IN')}`
      )}
    </Button>
  );
}

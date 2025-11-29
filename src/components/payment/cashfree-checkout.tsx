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
          variant: 'destructive',
          title: 'Authentication Required',
          description: 'Please log in to proceed with payment.',
        });
        setIsLoading(false);
        return;
      }

      console.log('Creating payment order for:', { amount, planId, userId, userEmail, userName });
      
      // Store planId in localStorage for payment success page
      localStorage.setItem('pending_plan_id', planId);

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
          
          // Log additional details for debugging
          if (data.details && process.env.NODE_ENV === 'development') {
            console.error('Cashfree API error details:', data.details);
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
          variant: 'destructive',
          title: 'Payment Error',
          description: 'Payment session ID is missing from server response. Please try again.',
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
          variant: 'destructive',
          title: 'Payment Gateway Error',
          description: 'Failed to load payment gateway. Please refresh the page and try again.',
        });
        setIsLoading(false);
        onFailure?.();
        return;
      }

      // Verify SDK is ready
      if (!window.Cashfree) {
        console.error('❌ Cashfree SDK not available on window object');
        toast({
          variant: 'destructive',
          title: 'Payment Gateway Error',
          description: 'Payment gateway is not properly initialized. Please try again.',
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

        let errorMessage = 'Failed to process payment. Please try again.';
        let errorTitle = 'Payment Error';

        if (cashfreeError instanceof Error) {
          if (cashfreeError.message.includes('Invalid') || cashfreeError.message.includes('session')) {
            errorTitle = 'Invalid Payment Session';
            errorMessage = 'The payment session is invalid or expired. Please try again.';
          } else if (cashfreeError.message.includes('Network')) {
            errorTitle = 'Network Error';
            errorMessage = 'Network connectivity issue. Please check your internet connection.';
          } else {
            errorMessage = cashfreeError.message || errorMessage;
          }
        }

        toast({
          variant: 'destructive',
          title: errorTitle,
          description: errorMessage,
        });
        setIsLoading(false);
        onFailure?.();
      }

    } catch (error) {
      console.error('Payment initialization error:', error);

      let errorMessage = 'Failed to initialize payment. Please try again.';
      let errorTitle = 'Payment Failed';
      
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
        
        // Set specific titles based on error type
        if (error.message.includes('Authentication required') || error.message.includes('log in')) {
          errorTitle = 'Authentication Required';
        } else if (error.message.includes('Payment gateway not configured')) {
          errorTitle = 'Configuration Error';
          errorMessage = 'Payment gateway is not configured. Please contact support or set up your Cashfree keys.';
        } else if (error.message.includes('Failed to load Cashfree script')) {
          errorTitle = 'Network Error';
          errorMessage = 'Failed to load payment gateway. Please check your internet connection and try again.';
        } else if (error.message.includes('temporarily unavailable')) {
          errorTitle = 'Service Unavailable';
        }
      }

      toast({
        variant: 'destructive',
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

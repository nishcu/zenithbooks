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

      const orderData = await response.json();
      console.log('Payment order response:', orderData);

      if (!response.ok) {
        // Provide more specific error messages
        let errorMessage = 'Failed to create payment order';
        
        if (response.status === 400) {
          errorMessage = orderData.message || orderData.error || 'Invalid payment request. Please check your information and try again.';
        } else if (response.status === 401 || response.status === 403) {
          // 401/403 from our API means user auth issue
          errorMessage = orderData.message || 'Authentication required. Please log in and try again.';
        } else if (response.status === 500 || response.status === 503) {
          // 500/503 means Cashfree API or server error
          errorMessage = orderData.message || orderData.error || 'Payment gateway error. Please try again later or contact support.';
          console.error('Payment API error details:', orderData);
          
          // Log additional details for debugging
          if (orderData.details && process.env.NODE_ENV === 'development') {
            console.error('Cashfree API error details:', orderData.details);
          }
        } else {
          errorMessage = orderData.message || orderData.error || `Payment error (${response.status}). Please try again.`;
        }
        
        throw new Error(errorMessage);
      }

      // Check if this is demo mode (no real API keys configured)
      if (orderData.demoMode === true) {
        console.log('Running in demo mode - payment UI will show but transactions won\'t process');
        toast({
          title: 'Demo Mode',
          description: 'Payment gateway is in demo mode. Configure CASHFREE_APP_ID and CASHFREE_SECRET_KEY for real payments.',
          duration: 5000,
        });
        return;
      }

      console.log('✅ Payment gateway is in LIVE mode - real transactions will be processed');

      // Load Cashfree SDK dynamically (CSP-safe approach)
      let Cashfree;
      try {
        Cashfree = await loadCashfree();
        console.log('✅ Cashfree SDK loaded and ready');
      } catch (error) {
        console.error('❌ Failed to load Cashfree SDK:', error);
        toast({
          variant: 'destructive',
          title: 'Payment Gateway Error',
          description: 'Failed to load payment gateway. Please refresh the page and try again.',
        });
        onFailure?.();
        return;
      }

      // Verify SDK is ready
      if (!Cashfree || typeof Cashfree !== 'function') {
        console.error('❌ Cashfree SDK is not a function');
        toast({
          variant: 'destructive',
          title: 'Payment Gateway Error',
          description: 'Payment gateway is not properly initialized. Please try again.',
        });
        onFailure?.();
        return;
      }
      
      // Determine mode from API response
      // API returns mode: 'LIVE' or 'TEST' based on Cashfree keys
      // IMPORTANT: Mode must match the environment that created the paymentSessionId
      const mode = orderData.mode;
      
      if (!mode) {
        console.error('Mode not provided in API response, cannot proceed with checkout');
        toast({
          variant: 'destructive',
          title: 'Payment Error',
          description: 'Payment configuration error. Please try again.',
        });
        onFailure?.();
        return;
      }

      // Build checkout options for Cashfree SDK v3
      // In v3, window.Cashfree is the function you call directly
      const checkoutOptions = {
        paymentSessionId: orderData.paymentSessionId,
        mode: mode, // Must match the environment: 'LIVE' for production, 'TEST' for sandbox
        redirectTarget: "_self",
        onSuccess: (data: any) => {
          console.log('✅ Cashfree payment success:', data);
          // Payment successful - Cashfree will redirect, but we can also handle it here
          if (onSuccess) {
            onSuccess(data.payment_id || data.order_id || 'payment_success');
          }
        },
        onFailure: (error: any) => {
          console.error('❌ Cashfree payment failed:', error);
          toast({
            variant: 'destructive',
            title: 'Payment Failed',
            description: error?.message || 'Payment could not be processed. Please try again.',
          });
          onFailure?.();
        },
      };

      console.log('Initializing Cashfree checkout (v3 API):', {
        paymentSessionId: checkoutOptions.paymentSessionId.substring(0, 30) + '...',
        mode: checkoutOptions.mode,
        redirectTarget: checkoutOptions.redirectTarget,
      });

      try {
        // Cashfree SDK v3: Call Cashfree directly with options
        // window.Cashfree IS the function - no .checkout() method in v3
        // Use the loaded Cashfree function
        Cashfree(checkoutOptions);
        
        console.log('✅ Cashfree checkout initiated successfully');
        // Payment will redirect or show modal - Cashfree SDK handles it
        setIsLoading(false); // SDK handles redirect, but reset loading state

      } catch (cashfreeError) {
        console.error('Cashfree initialization error:', cashfreeError);

        let errorMessage = 'Failed to initialize payment gateway.';
        let errorTitle = 'Payment Gateway Error';

        if (cashfreeError instanceof Error) {
          if (cashfreeError.message.includes('Invalid')) {
            errorTitle = 'Invalid Configuration';
            errorMessage = 'The Cashfree configuration is invalid. Please check your setup.';
          } else if (cashfreeError.message.includes('Network')) {
            errorTitle = 'Network Error';
            errorMessage = 'Network connectivity issue. Please check your internet connection.';
          }
        }

        toast({
          variant: 'destructive',
          title: errorTitle,
          description: errorMessage,
        });
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

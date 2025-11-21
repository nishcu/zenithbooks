"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface RazorpayCheckoutProps {
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
    Razorpay: any;
  }
}

export function RazorpayCheckout({
  amount,
  planId,
  planName,
  userId,
  userEmail,
  userName,
  onSuccess,
  onFailure,
}: RazorpayCheckoutProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handlePayment = async () => {
    setIsLoading(true);

    try {
      // Create order on server
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency: 'INR',
          userId,
          planId,
          notes: {
            planName,
            description: `Payment for ${planName} plan`,
          },
        }),
      });

      const orderData = await response.json();

      if (!response.ok) {
        throw new Error(orderData.error || 'Failed to create payment order');
      }

      // Load Razorpay script if not already loaded
      if (!window.Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);

        await new Promise((resolve) => {
          script.onload = resolve;
        });
      }

      // Initialize Razorpay
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.orderId,
        name: 'ZenithBooks',
        description: `Payment for ${planName}`,
        prefill: {
          name: userName || '',
          email: userEmail || '',
        },
        notes: {
          userId,
          planId,
          planName,
        },
        theme: {
          color: '#2563eb',
        },
        handler: async function (response: any) {
          try {
            // Verify payment on server
            const verifyResponse = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                userId,
                planId,
                amount,
              }),
            });

            const verifyData = await verifyResponse.json();

            if (verifyResponse.ok) {
              toast({
                title: 'Payment Successful!',
                description: `Your payment for ${planName} has been processed successfully.`,
              });

              onSuccess?.(response.razorpay_payment_id);
            } else {
              throw new Error(verifyData.error || 'Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            toast({
              variant: 'destructive',
              title: 'Payment Verification Failed',
              description: 'Payment was successful but verification failed. Please contact support.',
            });
            onFailure?.();
          }
        },
        modal: {
          ondismiss: function () {
            toast({
              title: 'Payment Cancelled',
              description: 'Payment was cancelled by the user.',
            });
            onFailure?.();
          },
        },
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.open();

    } catch (error) {
      console.error('Payment initialization error:', error);
      toast({
        variant: 'destructive',
        title: 'Payment Failed',
        description: 'Failed to initialize payment. Please try again.',
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

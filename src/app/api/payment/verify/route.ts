import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch((error) => {
      console.error('Failed to parse request body:', error);
      throw new Error('Invalid request body');
    });

    const {
      orderId,
      paymentId,
      signature,
      userId,
      planId,
      amount
    } = body;

    // Validate required fields
    if (!orderId || typeof orderId !== 'string' || orderId.trim() === '') {
      return NextResponse.json(
        { error: 'Order ID is required and must be a valid string' },
        { status: 400 }
      );
    }

    // Initialize Cashfree for verification
    const appId = process.env.CASHFREE_APP_ID?.trim();
    const secretKey = process.env.CASHFREE_SECRET_KEY?.trim();
    
    // For demo mode, skip verification if keys are not configured
    if (!appId || !secretKey) {
      console.log('Demo mode: Skipping payment verification - missing Cashfree credentials');

      // Update user's subscription status in Firestore for demo
      if (userId) {
        try {
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, {
            subscriptionStatus: 'active',
            subscriptionPlan: planId,
            lastPaymentDate: serverTimestamp(),
            demoPaymentId: paymentId || `demo_${Date.now()}`,
            demoOrderId: orderId || `demo_order_${Date.now()}`,
            paymentAmount: Number(amount) || 0,
          });
        } catch (firestoreError) {
          console.error('Firestore update error in demo mode:', firestoreError);
          // Still return success for demo mode even if Firestore fails
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Demo payment verified successfully',
        paymentId: paymentId || `demo_${Date.now()}`,
        demoMode: true,
      });
    }

    // Determine if we should use production environment
    // IMPORTANT: APP_ID and SECRET_KEY must be from the SAME Cashfree project/environment
    const isAppIdTest = appId && (appId.startsWith('TEST_') || appId.startsWith('CFTEST_'));
    const isSecretKeyTest = secretKey && (secretKey.startsWith('TEST_') || secretKey.startsWith('CFTEST_'));
    const isProductionKey = appId && !isAppIdTest;
    
    console.log('Payment verification request:', {
      orderId,
      paymentId,
      userId,
      planId,
      isProductionKey,
    });
    
    // Warn if keys appear to be from different environments
    if (isAppIdTest !== isSecretKeyTest) {
      console.warn('⚠️ WARNING: APP_ID and SECRET_KEY appear to be from different environments!');
      console.warn('APP_ID is', isAppIdTest ? 'TEST' : 'PRODUCTION');
      console.warn('SECRET_KEY is', isSecretKeyTest ? 'TEST' : 'PRODUCTION');
    }
    
    // Determine Cashfree API base URL based on environment
    const cashfreeBaseUrl = isProductionKey 
      ? 'https://api.cashfree.com/pg' 
      : 'https://sandbox.cashfree.com/pg';

    // Verify payment using Cashfree order status API
    try {
      // Make direct API call to Cashfree with proper headers
      // Use correct header names: x-client-id and x-secret-key
      let cashfreeResponse;
      try {
        cashfreeResponse = await fetch(`${cashfreeBaseUrl}/orders/${orderId}`, {
          method: 'GET',
          headers: {
            'x-client-id': appId!,
            'x-client-secret': secretKey!, // Correct header name (matches payment route)
            'x-api-version': '2022-09-01',
            'Content-Type': 'application/json',
          },
        });
      } catch (fetchError: any) {
        console.error('Network error calling Cashfree API:', fetchError);
        throw {
          message: `Network error: ${fetchError?.message || 'Failed to connect to Cashfree API'}`,
          isNetworkError: true,
        };
      }

      if (!cashfreeResponse.ok) {
        const errorData = await cashfreeResponse.json().catch(() => ({}));
        
        // Log authentication errors with more detail
        if (cashfreeResponse.status === 401) {
          console.error('Cashfree authentication failed:', {
            status: cashfreeResponse.status,
            error: errorData,
            hasAppId: !!appId,
            hasSecretKey: !!secretKey,
            appIdPrefix: appId?.substring(0, 10),
            secretKeyPrefix: secretKey?.substring(0, 10),
            baseUrl: cashfreeBaseUrl,
          });
        }
        
        throw {
          response: {
            status: cashfreeResponse.status,
            data: errorData,
          },
          message: errorData.message || `Cashfree API returned ${cashfreeResponse.status}`,
        };
      }

      const responseText = await cashfreeResponse.text();
      let orderDetails;
      
      try {
        orderDetails = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse Cashfree verification response:', responseText);
        throw new Error('Invalid response from Cashfree API');
      }

      // Cashfree returns data directly (not nested in data object)
      // Check both possible structures: direct or nested
      const orderStatus = orderDetails.order_status || orderDetails.data?.order_status;
      
      // Also check payments array for payment status
      const payments = orderDetails.payments || orderDetails.data?.payments;
      const paymentStatus = payments && payments.length > 0 ? payments[0]?.payment_status : null;
      
      console.log('Cashfree order verification:', {
        orderId: orderId,
        orderStatus: orderStatus,
        paymentStatus: paymentStatus,
        hasData: !!orderDetails.data,
        directStatus: orderDetails.order_status,
        nestedStatus: orderDetails.data?.order_status,
        paymentsCount: payments?.length || 0,
        fullResponse: JSON.stringify(orderDetails, null, 2).substring(0, 500), // First 500 chars
      });

      // Check if payment was successful
      // Cashfree order_status can be: ACTIVE, PAID, EXPIRED, CANCELLED
      // Payment status in payments array can be: SUCCESS, PENDING, FAILED
      const isPaid = orderStatus === 'PAID' || paymentStatus === 'SUCCESS';
      
      if (!isPaid) {
        console.warn('Payment not successful:', {
          orderStatus,
          paymentStatus,
          message: `Order status: ${orderStatus}, Payment status: ${paymentStatus || 'N/A'}`,
        });
        return NextResponse.json(
          { 
            error: 'Payment not completed successfully',
            orderStatus: orderStatus,
            paymentStatus: paymentStatus,
            message: `Payment status: ${orderStatus || paymentStatus || 'UNKNOWN'}. Payment may still be processing or failed.`,
          },
          { status: 400 }
        );
      }

      // Verify signature if provided (Cashfree may provide signature in webhook)
      if (signature) {
        const sign = orderId + '|' + paymentId;
        const expectedSign = createHmac('sha256', process.env.CASHFREE_SECRET_KEY!)
          .update(sign.toString())
          .digest('hex');

        if (signature !== expectedSign) {
          return NextResponse.json(
            { error: 'Payment signature verification failed' },
            { status: 400 }
          );
        }
      }

      // Update user's subscription status in Firestore
      if (userId) {
        try {
          // Prefer the verified amount from Cashfree order details (more reliable than client-provided query params)
          const verifiedAmount = Number(
            orderDetails?.order_amount ??
              orderDetails?.data?.order_amount ??
              amount ??
              0
          ) || 0;

          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, {
            subscriptionStatus: 'active',
            subscriptionPlan: planId,
            lastPaymentDate: serverTimestamp(),
            cashfreePaymentId: paymentId,
            cashfreeOrderId: orderId,
            paymentAmount: verifiedAmount,
            paymentStatus: orderStatus || paymentStatus || 'SUCCESS',
          });
        } catch (firestoreError) {
          console.error('Firestore update error:', firestoreError);
          // Don't fail the entire request if Firestore update fails
          // Payment is already verified, just log the error
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Payment verified successfully',
        paymentId: paymentId,
        orderStatus: orderStatus,
      });

    } catch (cashfreeError: any) {
      console.error('Cashfree verification error:', cashfreeError);

      // Fallback: still update the user if we have the payment details
      // This is more lenient than Razorpay's strict verification
      if (userId && paymentId) {
        try {
          const fallbackAmount = Number(amount) || 0;
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, {
            subscriptionStatus: 'active',
            subscriptionPlan: planId,
            lastPaymentDate: serverTimestamp(),
            cashfreePaymentId: paymentId,
            cashfreeOrderId: orderId,
            paymentAmount: fallbackAmount,
            paymentStatus: 'VERIFICATION_FAILED',
          });

          return NextResponse.json({
            success: true,
            message: 'Payment recorded but verification failed - please contact support',
            paymentId: paymentId,
            warning: 'Verification failed but payment recorded',
          });
        } catch (firestoreError) {
          console.error('Firestore update failed in fallback:', firestoreError);
          // Continue to throw the original Cashfree error
        }
      }

      // If we can't update Firestore or don't have userId/paymentId, throw the original error
      throw cashfreeError;
    }

  } catch (error: any) {
    console.error('Error verifying payment:', error);
    
    // Provide more detailed error information
    const errorMessage = error?.message || 'Payment verification failed';
    const errorDetails = process.env.NODE_ENV === 'development' 
      ? { 
          message: errorMessage,
          stack: error?.stack,
          name: error?.name,
        }
      : { message: errorMessage };

    return NextResponse.json(
      { 
        error: 'Payment verification failed',
        details: errorDetails,
      },
      { status: 500 }
    );
  }
}

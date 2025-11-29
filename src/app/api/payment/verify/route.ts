import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const {
      orderId,
      paymentId,
      signature,
      userId,
      planId,
      amount
    } = await request.json();

    // Initialize Cashfree for verification
    const appId = process.env.CASHFREE_APP_ID?.trim();
    const secretKey = process.env.CASHFREE_SECRET_KEY?.trim();
    
    // For demo mode, skip verification if keys are not configured
    if (!appId || !secretKey) {
      console.log('Demo mode: Skipping payment verification - missing Cashfree credentials');

      // Update user's subscription status in Firestore for demo
      if (userId) {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          subscriptionStatus: 'active',
          subscriptionPlan: planId,
          lastPaymentDate: serverTimestamp(),
          demoPaymentId: paymentId || `demo_${Date.now()}`,
          demoOrderId: orderId || `demo_order_${Date.now()}`,
          paymentAmount: amount,
        });
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
      const cashfreeResponse = await fetch(`${cashfreeBaseUrl}/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'x-client-id': appId!,
          'x-secret-key': secretKey!, // Correct header name
          'x-api-version': '2022-09-01',
          'Content-Type': 'application/json',
        },
      });

      if (!cashfreeResponse.ok) {
        const errorData = await cashfreeResponse.json().catch(() => ({}));
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
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          subscriptionStatus: 'active',
          subscriptionPlan: planId,
          lastPaymentDate: serverTimestamp(),
          cashfreePaymentId: paymentId,
          cashfreeOrderId: orderId,
          paymentAmount: amount,
          paymentStatus: orderDetails.orderStatus,
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Payment verified successfully',
        paymentId: paymentId,
        orderStatus: orderStatus,
      });

    } catch (cashfreeError) {
      console.error('Cashfree verification error:', cashfreeError);

      // Fallback: still update the user if we have the payment details
      // This is more lenient than Razorpay's strict verification
      if (userId && paymentId) {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          subscriptionStatus: 'active',
          subscriptionPlan: planId,
          lastPaymentDate: serverTimestamp(),
          cashfreePaymentId: paymentId,
          cashfreeOrderId: orderId,
          paymentAmount: amount,
          paymentStatus: 'VERIFICATION_FAILED',
        });

        return NextResponse.json({
          success: true,
          message: 'Payment recorded but verification failed - please contact support',
          paymentId: paymentId,
          warning: 'Verification failed but payment recorded',
        });
      }

      throw cashfreeError;
    }

  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: 'Payment verification failed' },
      { status: 500 }
    );
  }
}

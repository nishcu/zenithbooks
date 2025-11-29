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
      const cashfreeResponse = await fetch(`${cashfreeBaseUrl}/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'x-client-id': appId!,
          'x-secret-key': secretKey!,
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

      const orderDetails = await cashfreeResponse.json();

      // Check if payment was successful
      if (orderDetails.data.order_status !== 'PAID') {
        return NextResponse.json(
          { error: 'Payment not completed successfully' },
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
        orderStatus: orderDetails.data.order_status,
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

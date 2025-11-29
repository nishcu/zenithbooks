import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Cashfree } from 'cashfree-pg';

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

    // For demo mode, skip verification
    if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) {
      console.log('Demo mode: Skipping payment verification');

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
      });
    }

    // Initialize Cashfree for verification
    Cashfree.XClientId = process.env.CASHFREE_APP_ID || 'TEST_APP_ID'; // Use test credentials if not set
    Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY || 'TEST_SECRET_KEY'; // Use test credentials if not set
    Cashfree.XEnvironment = process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'TEST';

    // Verify payment using Cashfree order status API
    try {
      const orderDetails = await Cashfree.PGFetchOrder('2023-08-01', orderId);

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

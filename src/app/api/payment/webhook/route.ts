import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createHmac } from 'crypto';

/**
 * Cashfree Webhook Handler
 * 
 * This endpoint receives payment status updates from Cashfree
 * Cashfree will POST to this URL when payment status changes
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Cashfree webhook received:', {
      orderId: body.order?.order_id,
      paymentId: body.payment?.payment_id,
      status: body.payment?.payment_status,
      timestamp: new Date().toISOString(),
    });

    // Extract order and payment information
    const orderId = body.order?.order_id || body.order_id;
    const paymentId = body.payment?.payment_id || body.payment_id;
    const paymentStatus = body.payment?.payment_status || body.payment_status;
    const orderStatus = body.order?.order_status || body.order_status;
    const amount = body.order?.order_amount || body.order_amount;
    
    // Extract user information from order tags
    const userId = body.order?.order_tags?.userId || body.order_tags?.userId;
    const planId = body.order?.order_tags?.planId || body.order_tags?.planId;
    const paymentType = body.order?.order_tags?.paymentType || body.order_tags?.paymentType || 'subscription'; // 'subscription', 'compliance_plan', or 'associate_registration'
    const compliancePlanTier = body.order?.order_tags?.compliancePlanTier || body.order_tags?.compliancePlanTier;
    const billingPeriod = body.order?.order_tags?.billingPeriod || body.order_tags?.billingPeriod;
    const associateId = body.order?.order_tags?.associateId || body.order_tags?.associateId;

    // Verify webhook signature if provided
    const signature = request.headers.get('x-cashfree-signature');
    if (signature) {
      const secretKey = process.env.CASHFREE_SECRET_KEY;
      if (secretKey) {
        const payload = JSON.stringify(body);
        const expectedSignature = createHmac('sha256', secretKey)
          .update(payload)
          .digest('hex');
        
        if (signature !== expectedSignature) {
          console.error('Webhook signature verification failed');
          return NextResponse.json(
            { error: 'Invalid signature' },
            { status: 401 }
          );
        }
      }
    }

    // Update user subscription if payment is successful
    if (paymentStatus === 'SUCCESS' || orderStatus === 'PAID') {
      if (userId) {
        try {
          // Handle associate registration payment
          if (paymentType === 'associate_registration' && associateId) {
            const { updateAssociatePaymentStatus } = await import('@/lib/compliance-associates/firestore');
            
            await updateAssociatePaymentStatus(associateId, paymentId, orderId);
            
            console.log('Associate registration payment processed via webhook:', {
              associateId,
              orderId,
              paymentId,
            });
          }
          // Handle compliance plan subscription
          else if (paymentType === 'compliance_plan' && compliancePlanTier) {
            const { createOrUpdateComplianceSubscription, generateMonthlyComplianceTasks } = await import('@/lib/compliance-plans/firestore');
            const { getDoc, Timestamp } = await import('firebase/firestore');
            
            // Get user data to extract firmId
            const userRef = doc(db, 'users', userId);
            const userSnap = await getDoc(userRef);
            const userData = userSnap.exists() ? userSnap.data() : {};
            const firmId = userData?.firmId || userId;
            
            // Calculate dates
            const now = new Date();
            const renewalDate = new Date(now);
            if (billingPeriod === 'annual') {
              renewalDate.setFullYear(renewalDate.getFullYear() + 1);
            } else {
              renewalDate.setMonth(renewalDate.getMonth() + 1);
            }
            
            // Create or activate compliance subscription
            const subscriptionId = await createOrUpdateComplianceSubscription({
              userId,
              firmId,
              planTier: compliancePlanTier as any,
              status: 'active',
              startDate: Timestamp.fromDate(now),
              renewalDate: Timestamp.fromDate(renewalDate),
              autoRenew: true,
              paymentMethodId: paymentId,
            });
            
            // Get subscription to pass to generateMonthlyComplianceTasks
            const { getComplianceSubscriptionByUserId } = await import('@/lib/compliance-plans/firestore');
            const subscription = await getComplianceSubscriptionByUserId(userId);
            
            if (subscription) {
              await generateMonthlyComplianceTasks(subscriptionId, subscription);
            }
            
            console.log('Compliance subscription activated via webhook:', {
              userId,
              subscriptionId,
              planTier: compliancePlanTier,
              orderId,
              paymentId,
            });
          } else {
            // Handle regular subscription (existing logic)
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
              subscriptionStatus: 'active',
              subscriptionPlan: planId || null,
              lastPaymentDate: serverTimestamp(),
              cashfreePaymentId: paymentId,
              cashfreeOrderId: orderId,
              paymentAmount: amount,
              paymentStatus: paymentStatus || orderStatus || 'SUCCESS',
              webhookReceivedAt: serverTimestamp(),
            });
            
            console.log('User subscription updated via webhook:', {
              userId,
              planId,
              orderId,
              paymentId,
            });
          }
        } catch (firestoreError) {
          console.error('Firestore update error in webhook:', firestoreError);
          // Don't fail the webhook - Cashfree expects 200 response
        }
      }
    }

    // Always return 200 to acknowledge receipt
    // Cashfree will retry if we return an error
    return NextResponse.json({
      success: true,
      message: 'Webhook received',
      orderId,
      paymentId,
      status: paymentStatus || orderStatus,
    });

  } catch (error: any) {
    console.error('Error processing webhook:', error);
    
    // Still return 200 to prevent Cashfree from retrying
    // Log the error for investigation
    return NextResponse.json({
      success: false,
      error: 'Webhook processing failed',
      message: error?.message || 'Unknown error',
    }, { status: 200 }); // Return 200 even on error to prevent retries
  }
}

// Handle GET requests (for testing/verification)
export async function GET() {
  return NextResponse.json({
    message: 'Cashfree webhook endpoint is active',
    method: 'POST',
    timestamp: new Date().toISOString(),
  });
}


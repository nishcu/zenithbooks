import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(request: NextRequest) {
  try {
    const { amount, currency = 'INR', receipt, notes, userId, planId } = await request.json();

    // Validate required fields
    if (!amount || !userId) {
      return NextResponse.json(
        { error: 'Amount and userId are required' },
        { status: 400 }
      );
    }

    // Check if environment variables are set
    const hasValidKeys = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET &&
                        process.env.RAZORPAY_KEY_ID.startsWith('rzp_') &&
                        process.env.RAZORPAY_KEY_SECRET.length > 20;

    if (!hasValidKeys) {
      console.error('❌ Razorpay environment variables not properly set:', {
        keyId: !!process.env.RAZORPAY_KEY_ID,
        keySecret: !!process.env.RAZORPAY_KEY_SECRET,
        keyIdValid: process.env.RAZORPAY_KEY_ID?.startsWith('rzp_'),
        keySecretValid: (process.env.RAZORPAY_KEY_SECRET?.length || 0) > 20,
        keyIdValue: process.env.RAZORPAY_KEY_ID?.substring(0, 10) + '...',
        keySecretLength: process.env.RAZORPAY_KEY_SECRET?.length || 0,
      });

      // Return a demo response for testing - this will show the payment UI but won't process real payments
      return NextResponse.json({
        orderId: `demo_order_${Date.now()}`,
        amount: amount * 100,
        currency: 'INR',
        key: 'rzp_test_demo_key', // This will cause Razorpay to show an error, but demonstrates the flow
        demoMode: true,
        message: 'Demo mode - configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET for real payments.'
      });
    }

    // Initialize Razorpay with environment variables
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    // Create Razorpay order
    const options = {
      amount: amount * 100, // Razorpay expects amount in paisa (multiply by 100)
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      notes: {
        userId,
        planId,
        ...notes,
      },
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return NextResponse.json(
      { error: 'Failed to create payment order' },
      { status: 500 }
    );
  }
}

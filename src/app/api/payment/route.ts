import { NextRequest, NextResponse } from 'next/server';
import { Cashfree } from 'cashfree-pg';

export async function POST(request: NextRequest) {
  try {
    const {
      amount,
      currency = 'INR',
      userId,
      planId,
      customerDetails,
      orderMeta
    } = await request.json();

    // Validate required fields
    if (!amount || !userId) {
      return NextResponse.json(
        { error: 'Amount and userId are required' },
        { status: 400 }
      );
    }

    // Check if environment variables are set
    console.log('🔍 Checking Cashfree environment variables...');
    console.log('All env vars with CASHFREE:', Object.keys(process.env).filter(key => key.includes('CASHFREE')));
    console.log('CASHFREE_APP_ID:', process.env.CASHFREE_APP_ID);
    console.log('CASHFREE_SECRET_KEY exists:', !!process.env.CASHFREE_SECRET_KEY);
    console.log('CASHFREE_APP_ID length:', process.env.CASHFREE_APP_ID?.length || 0);
    console.log('CASHFREE_SECRET_KEY length:', process.env.CASHFREE_SECRET_KEY?.length || 0);

    const hasValidKeys = process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY &&
                        process.env.CASHFREE_APP_ID.length > 10 &&
                        process.env.CASHFREE_SECRET_KEY.length > 20;

    console.log('hasValidKeys result:', hasValidKeys);

    if (!hasValidKeys) {
      console.error('❌ Cashfree environment variables not properly set:', {
        appId: !!process.env.CASHFREE_APP_ID,
        secretKey: !!process.env.CASHFREE_SECRET_KEY,
        appIdValid: (process.env.CASHFREE_APP_ID?.length || 0) > 10,
        secretKeyValid: (process.env.CASHFREE_SECRET_KEY?.length || 0) > 20,
        appIdValue: process.env.CASHFREE_APP_ID?.substring(0, 10) + '...',
        secretKeyLength: process.env.CASHFREE_SECRET_KEY?.length || 0,
      });

      // Return a demo response for testing - this will show the payment UI but won't process real payments
      return NextResponse.json({
        paymentSessionId: `demo_session_${Date.now()}`,
        orderId: `demo_order_${Date.now()}`,
        amount: amount,
        currency: 'INR',
        demoMode: true,
        message: 'Demo mode - configure CASHFREE_APP_ID and CASHFREE_SECRET_KEY for real payments.',
        debug: {
          appIdExists: !!process.env.CASHFREE_APP_ID,
          secretKeyExists: !!process.env.CASHFREE_SECRET_KEY,
          appIdLength: process.env.CASHFREE_APP_ID?.length || 0,
          secretKeyLength: process.env.CASHFREE_SECRET_KEY?.length || 0,
          hasValidKeys: hasValidKeys,
          appIdValue: process.env.CASHFREE_APP_ID?.substring(0, 10) + '...',
          secretKeyValue: process.env.CASHFREE_SECRET_KEY?.substring(0, 10) + '...',
          allEnvKeys: Object.keys(process.env).filter(key => key.includes('CASHFREE'))
        }
      });
    }

    // Initialize Cashfree with environment variables
    Cashfree.XClientId = process.env.CASHFREE_APP_ID;
    Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
    Cashfree.XEnvironment = process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'TEST';

    // Create Cashfree order
    const orderData = {
      order_id: `order_${Date.now()}_${userId}`,
      order_amount: amount,
      order_currency: currency,
      customer_details: {
        customer_id: customerDetails?.customer_id || userId,
        customer_email: customerDetails?.customer_email || '',
        customer_phone: customerDetails?.customer_phone || '',
        customer_name: customerDetails?.customer_name || '',
      },
      order_meta: {
        return_url: orderMeta?.return_url || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/success?order_id={order_id}`,
        notify_url: orderMeta?.notify_url || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/payment/webhook`,
        payment_methods: orderMeta?.payment_methods || 'cc,dc,nb,upi,wallet',
      },
      order_tags: {
        userId,
        planId,
      },
    };

    try {
      const order = await Cashfree.PGCreateOrder('2023-08-01', orderData);

      return NextResponse.json({
        paymentSessionId: order.data.payment_session_id,
        orderId: order.data.order_id,
        amount: order.data.order_amount,
        currency: order.data.order_currency,
      });
    } catch (cashfreeError) {
      console.error('Cashfree order creation error:', cashfreeError);

      // Return demo mode response if Cashfree API fails
      return NextResponse.json({
        paymentSessionId: `demo_session_${Date.now()}`,
        orderId: `demo_order_${Date.now()}`,
        amount: amount,
        currency: 'INR',
        demoMode: true,
        message: 'Demo mode - Cashfree API unavailable, using demo mode for testing.'
      });
    }
  } catch (error) {
    console.error('Error creating Cashfree order:', error);
    return NextResponse.json(
      { error: 'Failed to create payment order' },
      { status: 500 }
    );
  }
}

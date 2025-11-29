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

    // Check if environment variables are set and valid
    const appId = process.env.CASHFREE_APP_ID?.trim();
    const secretKey = process.env.CASHFREE_SECRET_KEY?.trim();
    
    const hasValidKeys = appId && secretKey && 
                        appId.length > 10 && 
                        secretKey.length > 20;

    // Determine if we should use production environment
    // Production keys typically don't start with 'TEST_' or 'CFTEST_'
    const isProductionKey = appId && !appId.startsWith('TEST_') && !appId.startsWith('CFTEST_');
    
    if (!hasValidKeys) {
      console.error('❌ Cashfree environment variables not properly set:', {
        appIdExists: !!appId,
        secretKeyExists: !!secretKey,
        appIdLength: appId?.length || 0,
        secretKeyLength: secretKey?.length || 0,
        appIdValue: appId ? appId.substring(0, 10) + '...' : 'MISSING',
        allEnvKeys: Object.keys(process.env).filter(key => key.includes('CASHFREE'))
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
          appIdExists: !!appId,
          secretKeyExists: !!secretKey,
          appIdLength: appId?.length || 0,
          secretKeyLength: secretKey?.length || 0,
          hasValidKeys: hasValidKeys,
        }
      });
    }

    // Initialize Cashfree with environment variables
    Cashfree.XClientId = appId;
    Cashfree.XClientSecret = secretKey;
    // Use PRODUCTION environment if production keys are detected, otherwise TEST
    Cashfree.XEnvironment = isProductionKey ? 'PRODUCTION' : 'TEST';

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

      if (!order || !order.data) {
        throw new Error('Invalid response from Cashfree API');
      }

      return NextResponse.json({
        paymentSessionId: order.data.payment_session_id,
        orderId: order.data.order_id,
        amount: order.data.order_amount,
        currency: order.data.order_currency,
        demoMode: false, // Explicitly set to false for live payments
      });
    } catch (cashfreeError: any) {
      console.error('Cashfree order creation error:', cashfreeError);
      
      // If we have valid keys, don't fall back to demo mode - return proper error
      if (hasValidKeys) {
        const errorMessage = cashfreeError?.response?.data?.message || 
                            cashfreeError?.message || 
                            'Failed to create payment order with Cashfree';
        
        console.error('Cashfree API error details:', {
          error: errorMessage,
          status: cashfreeError?.response?.status,
          environment: Cashfree.XEnvironment,
          appIdPrefix: appId?.substring(0, 10) + '...',
        });

        return NextResponse.json(
          { 
            error: 'Payment gateway error',
            message: errorMessage,
            details: process.env.NODE_ENV === 'development' ? {
              cashfreeError: errorMessage,
              environment: Cashfree.XEnvironment,
            } : undefined
          },
          { status: 500 }
        );
      }

      // Only return demo mode if keys are not configured
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

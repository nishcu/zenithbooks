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
        { 
          error: 'Invalid request',
          message: !userId ? 'User authentication required. Please log in and try again.' : 'Payment amount is required.',
          details: {
            hasAmount: !!amount,
            hasUserId: !!userId,
          }
        },
        { status: 400 }
      );
    }

    // Validate amount is positive
    if (amount <= 0 || isNaN(amount)) {
      return NextResponse.json(
        { 
          error: 'Invalid amount',
          message: 'Payment amount must be greater than zero.',
        },
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
    
    console.log('Initializing Cashfree with:', {
      environment: Cashfree.XEnvironment,
      appIdLength: appId?.length || 0,
      secretKeyLength: secretKey?.length || 0,
      appIdPrefix: appId ? appId.substring(0, 10) + '...' : 'MISSING',
      isProductionKey: isProductionKey,
    });

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
      console.log('Calling Cashfree.PGCreateOrder with orderData:', {
        order_id: orderData.order_id,
        order_amount: orderData.order_amount,
        order_currency: orderData.order_currency,
        customer_id: orderData.customer_details.customer_id,
        environment: Cashfree.XEnvironment,
      });
      
      const order = await Cashfree.PGCreateOrder('2023-08-01', orderData);

      if (!order || !order.data) {
        throw new Error('Invalid response from Cashfree API - no order data received');
      }
      
      console.log('Cashfree order created successfully:', {
        orderId: order.data.order_id,
        paymentSessionId: order.data.payment_session_id ? 'present' : 'missing',
      });

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
        // Extract detailed error information from Cashfree API response
        const errorResponse = cashfreeError?.response || {};
        const errorData = errorResponse?.data || errorResponse || {};
        const errorMessage = errorData?.message || 
                            errorData?.error?.message ||
                            errorResponse?.message ||
                            cashfreeError?.message || 
                            'Failed to create payment order with Cashfree';
        
        const errorCode = errorData?.code || errorData?.error?.code || errorResponse?.code || cashfreeError?.code;
        const cashfreeHttpStatus = errorResponse?.status || errorResponse?.statusCode || errorData?.status;
        
        console.error('Cashfree API error details:', {
          error: errorMessage,
          errorCode: errorCode,
          cashfreeHttpStatus: cashfreeHttpStatus,
          environment: Cashfree.XEnvironment,
          appIdPrefix: appId ? appId.substring(0, 10) + '...' : 'MISSING',
          hasAppId: !!appId,
          hasSecretKey: !!secretKey,
          isProductionKey: isProductionKey,
          fullError: process.env.NODE_ENV === 'development' ? {
            message: cashfreeError?.message,
            response: errorResponse,
            stack: cashfreeError?.stack,
          } : undefined,
        });

        // Provide user-friendly error message based on Cashfree API error
        let userMessage = errorMessage;
        let httpStatusToReturn = 500; // Always return 500 for Cashfree API errors (not 401)
        
        // Check for specific Cashfree error patterns
        const errorStr = String(errorMessage).toLowerCase();
        const codeStr = String(errorCode || '').toLowerCase();
        
        if (cashfreeHttpStatus === 401 || codeStr.includes('unauthorized') || codeStr.includes('401') || 
            errorStr.includes('unauthorized') || errorStr.includes('invalid credentials') || 
            errorStr.includes('authentication failed')) {
          userMessage = 'Payment gateway authentication failed. Please verify your Cashfree API credentials (App ID and Secret Key) are correct and match the selected environment (TEST/PRODUCTION).';
          httpStatusToReturn = 500; // Return 500, not 401 - this is a server-side config issue
        } else if (cashfreeHttpStatus === 400 || codeStr.includes('bad_request') || errorStr.includes('invalid')) {
          userMessage = 'Invalid payment request. Please check the payment details (amount, currency, customer info) and try again.';
          httpStatusToReturn = 500;
        } else if (cashfreeHttpStatus === 503 || errorStr.includes('service unavailable') || errorStr.includes('temporarily')) {
          userMessage = 'Payment service is temporarily unavailable. Please try again in a few minutes.';
          httpStatusToReturn = 503;
        } else if (errorStr.includes('network') || errorStr.includes('timeout')) {
          userMessage = 'Network error connecting to payment gateway. Please check your internet connection and try again.';
          httpStatusToReturn = 500;
        }

        return NextResponse.json(
          { 
            error: 'Payment gateway error',
            message: userMessage,
            details: process.env.NODE_ENV === 'development' ? {
              cashfreeError: errorMessage,
              errorCode: errorCode,
              cashfreeHttpStatus: cashfreeHttpStatus,
              environment: Cashfree.XEnvironment,
              appIdPrefix: appId ? appId.substring(0, 10) + '...' : 'MISSING',
            } : undefined
          },
          { status: httpStatusToReturn }
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

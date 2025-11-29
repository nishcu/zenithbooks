import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const {
      amount,
      currency = 'INR',
      userId,
      planId,
      customerDetails,
      orderMeta,
      userEmail, // Also accept userEmail from request body
      userName,  // Also accept userName from request body
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
    // IMPORTANT: APP_ID and SECRET_KEY must be from the SAME Cashfree project/environment
    const isAppIdTest = appId && (appId.startsWith('TEST_') || appId.startsWith('CFTEST_'));
    const isSecretKeyTest = secretKey && (secretKey.startsWith('TEST_') || secretKey.startsWith('CFTEST_'));
    const isProductionKey = appId && !isAppIdTest;
    
    // Warn if keys appear to be from different environments
    if (hasValidKeys && isAppIdTest !== isSecretKeyTest) {
      console.warn('⚠️ WARNING: APP_ID and SECRET_KEY appear to be from different environments!');
      console.warn('APP_ID is', isAppIdTest ? 'TEST' : 'PRODUCTION');
      console.warn('SECRET_KEY is', isSecretKeyTest ? 'TEST' : 'PRODUCTION');
      console.warn('Both keys must be from the same Cashfree project/environment.');
    }
    
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

    // Determine Cashfree API base URL based on environment
    // TEST → Use Sandbox keys (starts with TEST_ or CFTEST_)
    // PRODUCTION → Use Live keys (does not start with TEST_)
    const cashfreeBaseUrl = isProductionKey 
      ? 'https://api.cashfree.com/pg' 
      : 'https://sandbox.cashfree.com/pg';
    
    console.log('Initializing Cashfree with:', {
      environment: isProductionKey ? 'PRODUCTION' : 'TEST',
      baseUrl: cashfreeBaseUrl,
      appIdLength: appId?.length || 0,
      secretKeyLength: secretKey?.length || 0,
      appIdPrefix: appId ? appId.substring(0, 10) + '...' : 'MISSING',
      isProductionKey: isProductionKey,
      isAppIdTest: isAppIdTest,
      isSecretKeyTest: isSecretKeyTest,
      apiVersion: '2022-09-01',
      warning: isAppIdTest !== isSecretKeyTest ? 'Keys may be from different environments!' : undefined,
    });

    // Create Cashfree order
    // Prepare customer details - with validation and defaults
    const customerId = (customerDetails?.customer_id || userId).substring(0, 50);
    const customerEmail = (customerDetails?.customer_email || userEmail || '').trim();
    const customerPhone = (customerDetails?.customer_phone || '').trim();
    const customerName = (customerDetails?.customer_name || userName || 'Customer').substring(0, 100);

    // Build customer_details object - start minimal and add fields only if they have values
    const customerDetailsObj: any = {
      customer_id: customerId,
    };

    // Add email only if provided
    if (customerEmail) {
      customerDetailsObj.customer_email = customerEmail;
    }

    // Add phone only if provided (use default if completely missing)
    if (customerPhone) {
      customerDetailsObj.customer_phone = customerPhone;
    } else {
      // Cashfree might require phone, use a default if missing
      customerDetailsObj.customer_phone = '9999999999';
    }

    // Add name only if provided
    if (customerName && customerName !== 'Customer') {
      customerDetailsObj.customer_name = customerName;
    }

    // DEBUG: Log what we're sending to Cashfree
    console.log('DEBUG customerDetails:', customerDetailsObj);
    console.log('DEBUG raw customerDetails from request:', {
      fromRequest: customerDetails,
      userEmail: userEmail,
      userName: userName,
      final: customerDetailsObj,
    });

    const orderData = {
      order_id: `order_${Date.now()}_${userId.substring(0, 36)}`, // Cashfree has 36 char limit
      order_amount: parseFloat(amount).toFixed(2), // Ensure proper decimal format as string
      order_currency: currency,
      customer_details: customerDetailsObj,
      order_meta: {
        return_url: orderMeta?.return_url || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/success?order_id={order_id}`,
        notify_url: orderMeta?.notify_url || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/payment/webhook`,
        payment_methods: orderMeta?.payment_methods || 'cc,dc,nb,upi', // Cashfree payment methods (no wallet)
      },
      ...(planId && {
        order_tags: {
          userId: userId.substring(0, 100),
          planId: planId.substring(0, 100),
        },
      }),
    };

    // DEBUG: Log full order data before sending
    console.log('DEBUG Full orderData being sent to Cashfree:', {
      order_id: orderData.order_id,
      order_amount: orderData.order_amount,
      order_currency: orderData.order_currency,
      customer_details: orderData.customer_details,
      order_meta: orderData.order_meta,
    });

    try {
      console.log('Calling Cashfree API with orderData:', {
        order_id: orderData.order_id,
        order_amount: orderData.order_amount,
        order_currency: orderData.order_currency,
        customer_id: orderData.customer_details.customer_id,
        environment: isProductionKey ? 'PRODUCTION' : 'TEST',
        apiVersion: '2022-09-01',
        baseUrl: cashfreeBaseUrl,
      });
      
      // Make direct API call to Cashfree with proper headers
      const requestUrl = `${cashfreeBaseUrl}/orders`;
      const requestHeaders = {
        'x-client-id': appId!,
        'x-client-secret': secretKey!,
        'x-api-version': '2022-09-01',
        'Content-Type': 'application/json',
      };
      
      // CRITICAL DEBUG: Log exactly what we're sending to Cashfree
      console.log('DEBUG SENT TO CASHFREE:', JSON.stringify(orderData, null, 2));
      console.log('DEBUG - Request body keys:', Object.keys(orderData));
      console.log('DEBUG - Has order_amount?', 'order_amount' in orderData);
      console.log('DEBUG - Has order_currency?', 'order_currency' in orderData);
      console.log('DEBUG - Has customer_details?', 'customer_details' in orderData);
      console.log('DEBUG - customer_details keys:', Object.keys(orderData.customer_details || {}));
      
      console.log('Making Cashfree API request:', {
        url: requestUrl,
        method: 'POST',
        headers: {
          'x-client-id': appId!.substring(0, 10) + '...',
          'x-client-secret': '***' + secretKey!.substring(secretKey!.length - 4),
          'x-api-version': '2022-09-01',
        },
        bodyKeys: Object.keys(orderData),
        orderAmount: orderData.order_amount,
        orderCurrency: orderData.order_currency,
        customerDetailsKeys: Object.keys(orderData.customer_details || {}),
      });
      
      // Build Cashfree payload with EXACT field names Cashfree requires
      // Cashfree API only accepts: order_amount, order_currency, customer_details, order_id (optional), order_meta
      const cashfreeRequestBody: any = {
        order_amount: parseFloat(amount), // Must be number, not string
        order_currency: currency, // Must be 'INR' or other valid currency
        customer_details: {
          customer_id: customerDetailsObj.customer_id,
          customer_email: customerDetailsObj.customer_email,
          customer_phone: customerDetailsObj.customer_phone,
        },
        order_meta: {
          return_url: orderMeta?.return_url || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/success?order_id={order_id}`,
          notify_url: orderMeta?.notify_url || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/payment/webhook`,
          payment_methods: orderMeta?.payment_methods || 'cc,dc,nb,upi',
        },
      };

      // Add optional fields only if they exist
      if (orderData.order_id) {
        cashfreeRequestBody.order_id = orderData.order_id;
      }
      
      if (customerDetailsObj.customer_name) {
        cashfreeRequestBody.customer_details.customer_name = customerDetailsObj.customer_name;
      }

      // Final debug log before sending - shows EXACT format
      console.log('DEBUG SENT TO CASHFREE:', JSON.stringify(cashfreeRequestBody, null, 2));
      console.log('DEBUG - Field verification:', {
        hasOrderAmount: 'order_amount' in cashfreeRequestBody,
        hasOrderCurrency: 'order_currency' in cashfreeRequestBody,
        hasCustomerDetails: 'customer_details' in cashfreeRequestBody,
        hasOrderMeta: 'order_meta' in cashfreeRequestBody,
        orderAmountType: typeof cashfreeRequestBody.order_amount,
        orderAmountValue: cashfreeRequestBody.order_amount,
        customerDetailsKeys: Object.keys(cashfreeRequestBody.customer_details),
      });
      
      const cashfreeResponse = await fetch(requestUrl, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(cashfreeRequestBody),
      });

      const responseText = await cashfreeResponse.text();
      let errorData = {};
      
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        // Response is not JSON
        console.error('Cashfree API returned non-JSON response:', responseText);
      }

      if (!cashfreeResponse.ok) {
        console.error('Cashfree API error response:', {
          status: cashfreeResponse.status,
          statusText: cashfreeResponse.statusText,
          headers: Object.fromEntries(cashfreeResponse.headers.entries()),
          body: errorData || responseText,
          requestUrl: requestUrl,
          requestBody: orderData,
        });
        
        // Extract more detailed error message from Cashfree response
        let errorMessage = errorData?.message || errorData?.error?.message || errorData?.msg || `Cashfree API returned ${cashfreeResponse.status}: ${cashfreeResponse.statusText}`;
        
        // If there are validation errors, include them
        if (errorData?.details || errorData?.errors) {
          errorMessage += ` - ${JSON.stringify(errorData.details || errorData.errors)}`;
        }
        
        throw {
          response: {
            status: cashfreeResponse.status,
            statusText: cashfreeResponse.statusText,
            data: errorData,
            rawBody: responseText,
          },
          message: errorMessage,
        };
      }

      let order;
      try {
        order = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse Cashfree response as JSON:', responseText);
        throw new Error('Invalid JSON response from Cashfree API');
      }

      if (!order || !order.data) {
        console.error('Cashfree response missing data:', order);
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
          environment: isProductionKey ? 'PRODUCTION' : 'TEST',
          baseUrl: cashfreeBaseUrl,
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
              environment: isProductionKey ? 'PRODUCTION' : 'TEST',
              baseUrl: cashfreeBaseUrl,
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

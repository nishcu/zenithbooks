import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
try {
const requestBody = await req.json();
const {
  amount,
  userId,
  currency = 'INR',
  planId,
  customerEmail: bodyCustomerEmail,
  customerPhone: bodyCustomerPhone,
  customerName: bodyCustomerName,
  paymentType,
  compliancePlanTier,
  billingPeriod,
  associateId,
  businessRegistrationId,
  customerDetails,
  userEmail,
  userName,
} = requestBody;

// Support both top-level and nested customer details (frontend may send customerDetails + userEmail/userName)
const customerEmail = bodyCustomerEmail ?? customerDetails?.customer_email ?? userEmail;
const customerPhone = bodyCustomerPhone ?? customerDetails?.customer_phone;
const customerName = bodyCustomerName ?? customerDetails?.customer_name ?? userName;

// --- VALIDATIONS ---
if (!amount || amount <= 0) {
  return NextResponse.json(
    { error: 'Invalid amount', message: 'Amount must be greater than 0.' },
    { status: 400 }
  );
}

if (!userId) {
  return NextResponse.json(
    { error: 'User not logged in', message: 'Please login again.' },
    { status: 400 }
  );
}

// --- CASHFREE KEYS ---
const appId = process.env.CASHFREE_APP_ID;
const secret = process.env.CASHFREE_SECRET_KEY;

if (!appId || !secret) {
  console.error('Cashfree credentials missing:', {
    hasAppId: !!appId,
    hasSecret: !!secret,
    envKeys: Object.keys(process.env).filter(k => k.includes('CASHFREE'))
  });
  
  return NextResponse.json(
    { 
      error: 'Cashfree keys missing', 
      message: 'Payment gateway not configured. Please configure CASHFREE_APP_ID and CASHFREE_SECRET_KEY environment variables.',
      details: {
        missingKeys: [
          !appId ? 'CASHFREE_APP_ID' : null,
          !secret ? 'CASHFREE_SECRET_KEY' : null
        ].filter(Boolean),
        help: 'Add these variables to your .env.local file or deployment environment settings.'
      }
    },
    { status: 500 }
  );
}

// Choose right environment
const isLive = !appId.startsWith('TEST_') && !appId.startsWith('CFTEST_');
const baseUrl = isLive
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

// Debug: Verify NEXT_PUBLIC_APP_URL is loaded
console.log('APP URL:', process.env.NEXT_PUBLIC_APP_URL);

// --- BUILD CASHFREE REQUEST BODY ---
const orderId = `order_${Date.now()}`;

  const cashfreeBody = {
    order_id: orderId,
    order_amount: Number(amount),
    order_currency: currency,
    customer_details: {
      customer_id: userId,
      customer_email: customerEmail || 'test@example.com',
      customer_phone: customerPhone || '9999999999',
      customer_name: customerName || 'User',
    },
    order_meta: {
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.zenithbooks.in'}/payment/success?order_id={order_id}`,
      notify_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.zenithbooks.in'}/api/payment/webhook`,
      payment_methods: 'cc,dc,nb,upi',
    },
    order_tags: {
      userId: userId,
      ...(planId ? { planId } : {}),
      ...(paymentType === 'compliance_plan' && compliancePlanTier ? {
        paymentType: 'compliance_plan',
        compliancePlanTier,
        billingPeriod: billingPeriod || 'monthly',
      } : {}),
      ...(paymentType === 'virtual_cfo' ? {
        paymentType: 'virtual_cfo',
      } : {}),
      ...(paymentType === 'inventory_audit' ? {
        paymentType: 'inventory_audit',
      } : {}),
      ...(paymentType === 'founder_control_week' ? {
        paymentType: 'founder_control_week',
      } : {}),
      ...(paymentType === 'business_control_program' ? {
        paymentType: 'business_control_program',
      } : {}),
      ...(paymentType === 'business_driven_applications' ? {
        paymentType: 'business_driven_applications',
      } : {}),
      ...(paymentType === 'associate_registration' ? {
        paymentType: 'associate_registration',
        ...(associateId ? { associateId } : {}),
      } : {}),
      ...(paymentType === 'business_registration' && businessRegistrationId ? {
        paymentType: 'business_registration',
        businessRegistrationId,
      } : {}),
    },
  };

// --- MAKE CASHFREE API CALL ---
const response = await fetch(`${baseUrl}/orders`, {
  method: 'POST',
  headers: {
    'x-client-id': appId,
    'x-client-secret': secret,
    'x-api-version': '2023-08-01',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(cashfreeBody),
});

const responseText = await response.text();
let data;

try {
  data = JSON.parse(responseText);
} catch (e) {
  console.error('Failed to parse Cashfree response as JSON:', responseText);
  return NextResponse.json(
    {
      error: 'Invalid response',
      message: 'Cashfree returned invalid JSON response',
      details: responseText.substring(0, 500), // First 500 chars for debugging
    },
    { status: 500 }
  );
}

// Debug: Log the full response structure
console.log('Cashfree API Response:', JSON.stringify(data, null, 2));
console.log('Response status:', response.status);
console.log('Response ok:', response.ok);
console.log('Response keys:', data ? Object.keys(data) : 'no data');

// If Cashfree returns error
if (!response.ok) {
  console.error('Cashfree Error:', data);
  return NextResponse.json(
    {
      error: 'Cashfree Error',
      message: data?.message || data?.error?.message || 'Payment creation failed',
      details: data,
    },
    { status: 500 }
  );
}

// Cashfree API returns data in direct structure (not nested in data object)
// Response keys: order_id, payment_session_id, order_amount, etc. are at top level
let orderData = null;

if (data?.order_id || data?.payment_session_id) {
  // Direct structure: keys at top level (this is what Cashfree actually returns)
  orderData = data;
} else if (data?.data) {
  // Nested structure: data.data (fallback for some response formats)
  orderData = data.data;
} else {
  // Unknown structure - log and return error
  console.error('Invalid Cashfree response structure:', data);
  return NextResponse.json(
    {
      error: 'Invalid response structure',
      message: 'Cashfree response format unexpected',
      details: {
        hasData: !!data,
        hasDataData: !!(data && data.data),
        hasOrderId: !!(data && data.order_id),
        hasPaymentSessionId: !!(data && data.payment_session_id),
        responseKeys: data ? Object.keys(data) : [],
        fullResponse: data,
      },
    },
    { status: 500 }
  );
}

// Verify required fields exist
if (!orderData.order_id || !orderData.payment_session_id) {
  console.error('Cashfree response missing required fields:', orderData);
  return NextResponse.json(
    {
      error: 'Incomplete response',
      message: 'Cashfree response missing order_id or payment_session_id',
      details: {
        hasOrderId: !!orderData.order_id,
        hasPaymentSessionId: !!orderData.payment_session_id,
        orderDataKeys: Object.keys(orderData),
        fullResponse: data,
      },
    },
    { status: 500 }
  );
}

// SUCCESS - Return payment_session_id exactly as Cashfree provides it
// Frontend will convert to paymentSessionId when passing to SDK
return NextResponse.json({
  orderId: orderData.order_id,
  payment_session_id: orderData.payment_session_id, // Keep snake_case to match backend
  amount: orderData.order_amount || amount,
  currency: orderData.order_currency || currency,
  mode: isLive ? 'LIVE' : 'TEST', // Pass mode to frontend
});
} catch (err) {
  console.error('Server error:', err);

  return NextResponse.json(
    { error: 'Server error', message: 'Payment failed. Try again.' },
    { status: 500 }
  );
}
}

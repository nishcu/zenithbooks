import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
try {
const {
amount,
userId,
currency = 'INR',
planId,
customerEmail,
customerPhone,
customerName,
} = await req.json();

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
  return NextResponse.json(
    { error: 'Cashfree keys missing', message: 'Configure APP_ID and SECRET_KEY' },
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
  order_tags: planId
    ? {
        userId: userId,
        planId: planId,
      }
    : undefined,
};

// --- MAKE CASHFREE API CALL ---
const response = await fetch(`${baseUrl}/orders`, {
  method: 'POST',
  headers: {
    'x-client-id': appId,
    'x-client-secret': secret,
    'x-api-version': '2022-09-01',
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

// Verify response structure
if (!data || !data.data) {
  console.error('Invalid Cashfree response structure:', data);
  return NextResponse.json(
    {
      error: 'Invalid response structure',
      message: 'Cashfree response missing expected data field',
      details: {
        hasData: !!data,
        hasDataData: !!(data && data.data),
        responseKeys: data ? Object.keys(data) : [],
        fullResponse: data,
      },
    },
    { status: 500 }
  );
}

// SUCCESS
return NextResponse.json({
  orderId: data.data.order_id,
  paymentSessionId: data.data.payment_session_id,
  amount: data.data.order_amount,
  currency: data.data.order_currency,
});
} catch (err) {
  console.error('Server error:', err);

  return NextResponse.json(
    { error: 'Server error', message: 'Payment failed. Try again.' },
    { status: 500 }
  );
}
}

# Vercel Environment Variables Guide

This document lists all the environment variables that need to be configured in your Vercel deployment for the ZenithBooks application.

## Required Environment Variables

### 1. `GEMINI_API_KEY` ⚠️ **REQUIRED**

**Purpose**: Enables AI-powered features in the application

**Used For**:
- HSN Code Suggestions (`/items/suggest-hsn`)
- CMA Report Analysis (`/reports/cma-report`)
- Legal Clauses Suggestions
- Invoice Data Extraction (AI-OCR)
- GST Reconciliation
- And other AI features

**How to Get**:
1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API Key" or "Create API Key"
4. Copy the generated API key

**How to Add in Vercel**:
1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your project: `zenithbooks`
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Name: `GEMINI_API_KEY`
6. Value: Paste your API key
7. Select environments: **Production**, **Preview**, and **Development** (or as needed)
8. Click **Save**

**Status**: Without this variable, AI features will show error messages like:
- "AI service is not configured. Please set GEMINI_API_KEY environment variable."
- "Failed to get HSN code suggestion. Please check if GEMINI_API_KEY is configured and try again."

---

## Optional Environment Variables

### 2. `RESEND_API_KEY` ⚠️ **REQUIRED for Email**

**Purpose**: Enables email sending functionality

**Used For**: 
- Email sending API route (`/api/email/send`)
- Sharing reports and documents via email
- Sending PDF attachments

**How to Get**:
1. Visit [Resend.com](https://resend.com)
2. Sign up for a free account
3. Go to **API Keys** section
4. Click **"Create API Key"**
5. Copy the generated API key (starts with `re_`)

**How to Add in Vercel**:
1. Settings → Environment Variables
2. Name: `RESEND_API_KEY`
3. Value: Your Resend API key (starts with `re_`)
4. Select environments: **Production**, **Preview**, **Development**
5. Save

**Status**: ✅ **Now implemented and enabled** - See `EMAIL_SETUP_GUIDE.md` for detailed setup instructions

---

### 3. `EMAIL_FROM` ⚠️ **REQUIRED for Email**

**Purpose**: Sets the "from" email address for sent emails

**Default Value**: `noreply@zenithbooks.in` (if not set)

**Used For**: Email sending (only works if `RESEND_API_KEY` is configured)

**Important**: 
- This email must be verified in your Resend account
- For production: Use your verified domain email (e.g., `noreply@zenithbooks.in`)
- For testing: Use Resend test domain (e.g., `onboarding@resend.dev`)

**How to Add in Vercel**:
1. Settings → Environment Variables
2. Name: `EMAIL_FROM`
3. Value: Your verified email address (e.g., `noreply@zenithbooks.in`)
4. Select environments: **Production**, **Preview**, **Development**
5. Save

**Setup**: See `EMAIL_SETUP_GUIDE.md` for domain verification instructions

---

### 4. `CASHFREE_APP_ID` ⚠️ **REQUIRED for Payments**

**Purpose**: Cashfree Application ID for payment processing

**Used For**:
- Payment gateway integration
- Creating payment orders
- Processing subscriptions and one-time payments

**How to Get**:
1. Visit [Cashfree Dashboard](https://merchant.cashfree.com/)
2. Go to Developers → API Keys
3. Create a new application or use existing one
4. Copy the "App ID"

**How to Add in Vercel**:
1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your project: `zenithbooks`
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Name: `CASHFREE_APP_ID`
6. Value: Paste your Cashfree App ID
7. Select environments: **Production**, **Preview**, and **Development**
8. Click **Save**

### 5. `CASHFREE_SECRET_KEY` ⚠️ **REQUIRED for Payments**

**Purpose**: Cashfree Secret Key for server-side payment verification

**Used For**:
- Verifying payment signatures
- Creating payment orders server-side
- Handling webhooks
- Order status verification

**How to Get**:
1. Visit [Cashfree Dashboard](https://merchant.cashfree.com/)
2. Go to Developers → API Keys
3. Copy the "Secret Key" for your application

**How to Add in Vercel**:
1. Settings → Environment Variables
2. Name: `CASHFREE_SECRET_KEY`
3. Value: Paste your Cashfree Secret Key
4. Select environments: **Production** (⚠️ Never add to Preview/Development for security)
5. Click **Save**

**Security Note**: Secret Key should only be in Production environment. Use test credentials for development.

---

## Quick Setup Steps

### Step 1: Get Your Gemini API Key
1. Visit https://aistudio.google.com/
2. Create an API key
3. Copy it

### Step 2: Add to Vercel
1. Open https://vercel.com/dashboard
2. Select **zenithbooks** project
3. Go to **Settings** → **Environment Variables**
4. Add `GEMINI_API_KEY` with your API key value
5. Select all environments (Production, Preview, Development)
6. Click **Save**

### Step 3: Redeploy
After adding environment variables, you need to redeploy:
1. Go to **Deployments** tab
2. Click the **⋯** (three dots) on the latest deployment
3. Click **Redeploy**
4. Or push a new commit to trigger automatic deployment

---

## Verification

### Check if Environment Variables are Set

1. **In Vercel Dashboard**:
   - Settings → Environment Variables
   - Verify `GEMINI_API_KEY` is listed

2. **In Your Application**:
   - Try using an AI feature (e.g., HSN Code Suggestion)
   - If it works, the environment variable is correctly configured
   - If you see an error about API key, check the variable name and value

3. **Check Logs**:
   - Go to Vercel Dashboard → Your Project → **Logs**
   - Look for any warnings about missing API keys
   - The code will log: `⚠️ GEMINI_API_KEY is not configured. AI features will not work.`

---

## Current Status

✅ **Firebase Configuration**: Hardcoded in `src/lib/firebase.ts` - No environment variables needed

⚠️ **AI Features**: Require `GEMINI_API_KEY` to work properly

📧 **Email Features**: ✅ **Now enabled** - Requires `RESEND_API_KEY` and `EMAIL_FROM` to work. See `EMAIL_SETUP_GUIDE.md` for setup.

---

## Troubleshooting

### Issue: AI features not working
**Solution**: 
- Verify `GEMINI_API_KEY` is set in Vercel
- Check that it's added to the correct environment (Production/Preview)
- Redeploy after adding the variable
- Verify the API key is valid and has quota

### Issue: Environment variable not showing up
**Solution**:
- Make sure you saved the variable
- Check you're looking at the correct project
- Redeploy the application after adding variables

### Issue: "API key is not configured" error
**Solution**:
- Double-check the variable name is exactly `GEMINI_API_KEY` (case-sensitive)
- Ensure the value doesn't have extra spaces
- Redeploy after making changes

---

## Summary

**Minimum Required for Full Functionality**:
- ✅ `GEMINI_API_KEY` - **REQUIRED** for AI features

**Optional**:
- `RESEND_API_KEY` - For email functionality
- `EMAIL_FROM` - For email sender address

**Note**: The application will work without `GEMINI_API_KEY`, but AI features will be disabled and show error messages.

---

### 6. `NEXT_PUBLIC_GA_MEASUREMENT_ID` 📊 **OPTIONAL - For Analytics**

**Purpose**: Google Tag (gtag.js) Measurement ID for tracking website analytics and conversions

**Supports**:
- Google Analytics 4 (GA4) - Format: `G-XXXXXXXXXX`
- Google Ads Conversion Tracking - Format: `AW-XXXXXXXXXX`

**Used For**:
- Page views tracking
- User behavior analytics
- Conversion tracking
- Traffic sources analysis
- Google Ads conversions

**How to Get**:
1. **For GA4**: Visit [Google Analytics](https://analytics.google.com/)
   - Go to **Admin** (gear icon) → **Data Streams**
   - Click on your web stream
   - Copy the **Measurement ID** (format: `G-XXXXXXXXXX`)

2. **For Google Ads**: Visit [Google Ads](https://ads.google.com/)
   - Go to **Tools & Settings** → **Conversions**
   - Create or select a conversion action
   - Copy the **Tag ID** (format: `AW-XXXXXXXXXX`)

**Example**: `AW-17816756522` (for Google Ads conversion tracking)

**How to Add in Vercel**:
1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your project: `zenithbooks`
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Name: `NEXT_PUBLIC_GA_MEASUREMENT_ID`
6. Value: Paste your Measurement ID (e.g., `G-XXXXXXXXXX`)
7. Select environments: **Production**, **Preview**, and **Development** (or as needed)
8. Click **Save**

**Note**: 
- The `NEXT_PUBLIC_` prefix makes this variable accessible in the browser
- If not set, Google Analytics will simply not load (no errors)
- After adding, redeploy your application for the changes to take effect

**Status**: ✅ **Now implemented** - Google Tag is automatically loaded when this variable is set

---

### 7. `ITR_ENCRYPTION_KEY` 🔐 **REQUIRED for ITR Filing**

**Purpose**: AES-256 encryption key for securing ITR portal credentials (username/password)

**Used For**:
- Encrypting user credentials in ITR filing module
- Storing sensitive Income Tax Portal login credentials securely
- Only decryptable server-side by authorized CA team members

**Security**: 
- ⚠️ **CRITICAL**: This key must be kept secret and never exposed
- Should be a 32-byte (256-bit) key for AES-256 encryption
- Can be provided as a 64-character hex string or any string (will be derived using PBKDF2)

**How to Generate**:

**Option 1: Generate a random hex key (Recommended)**
```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32

# Using Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

**Option 2: Use any secure random string**
- Minimum 32 characters recommended
- Can be any string (will be derived using PBKDF2)

**Example Key** (64-character hex):
```
a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890
```

**How to Add in Vercel**:
1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your project: `zenithbooks`
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Name: `ITR_ENCRYPTION_KEY`
6. Value: Paste your generated encryption key
7. Select environments: **Production**, **Preview**, and **Development**
8. Click **Save**

**For Local Development**:
Create a `.env.local` file in the project root:
```
ITR_ENCRYPTION_KEY=your-generated-key-here
```

**Important Notes**:
- ⚠️ **Never commit this key to version control**
- ⚠️ **Use different keys for development and production**
- ⚠️ **If the key is lost, encrypted credentials cannot be recovered**
- ✅ **The key is only used server-side** (in API routes)

**Status**: ⚠️ **REQUIRED** - ITR filing module will fail without this key

---

### 8. `WHATSAPP_API_KEY` & `WHATSAPP_API_URL` 📱 **OPTIONAL - For WhatsApp Notifications**

**Purpose**: WhatsApp Business API credentials for sending ITR notifications via WhatsApp

**Used For**:
- ITR draft ready notifications
- ITR filing status updates
- Filing completion notifications
- Refund status updates

**How to Get**:

**Option 1: Twilio WhatsApp API** (Recommended)
1. Visit [Twilio](https://www.twilio.com/)
2. Sign up for an account
3. Get your Account SID and Auth Token
4. Enable WhatsApp Sandbox or configure WhatsApp Business API
5. Use your Account SID as `WHATSAPP_API_KEY` and Twilio API URL

**Option 2: WhatsApp Business API**
1. Register with Meta Business
2. Set up WhatsApp Business Account
3. Get API credentials from Meta
4. Configure webhook and API endpoint

**Option 3: Other Providers**
- Use any WhatsApp Business API provider (Twilio, MessageBird, etc.)
- Configure their API URL and key

**How to Add in Vercel**:
1. Settings → Environment Variables
2. Add:
   - `WHATSAPP_API_KEY` = Your WhatsApp API key
   - `WHATSAPP_API_URL` = Your WhatsApp API endpoint URL (e.g., `https://api.twilio.com/2010-04-01/Accounts/{AccountSID}/Messages.json`)
3. Select environments: **Production**, **Preview**, **Development**
4. Save

**For Local Development**:
Add to `.env.local`:
```env
WHATSAPP_API_KEY=your-api-key
WHATSAPP_API_URL=https://your-whatsapp-api-url.com/send
```

**Note**: 
- If not configured, WhatsApp notifications will be logged but not sent (no errors)
- Email notifications will still work independently
- WhatsApp notifications require user's phone number in their profile

**Example (Twilio)**:
```env
WHATSAPP_API_KEY=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_API_URL=https://api.twilio.com/2010-04-01/Accounts/{AccountSID}/Messages.json
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

**Status**: ⚠️ **OPTIONAL** - WhatsApp notifications are optional. Email notifications work independently.


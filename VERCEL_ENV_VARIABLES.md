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


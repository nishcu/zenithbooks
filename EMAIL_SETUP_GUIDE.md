# 📧 Email Service Setup Guide (Resend)

This guide will help you configure Resend email service for ZenithBooks.

---

## 🔧 Step 1: Create Resend Account

1. Go to [https://resend.com](https://resend.com)
2. Click "Sign Up" and create a free account
3. Verify your email address

---

## 🔑 Step 2: Get API Key

1. After logging in, go to **API Keys** section
2. Click **"Create API Key"**
3. Give it a name (e.g., "ZenithBooks Production")
4. Select permissions (usually "Full Access" or "Sending Access")
5. Copy the API key (you'll only see it once!)

---

## ✉️ Step 3: Add Domain (Required)

To send emails, you need to verify a domain:

### Option A: Use Your Own Domain (Recommended for Production)
1. Go to **Domains** section in Resend
2. Click **"Add Domain"**
3. Enter your domain (e.g., `zenithbooks.in`)
4. Add the DNS records Resend provides to your domain's DNS settings:
   - SPF record
   - DKIM records (usually 3 records)
   - DMARC record (optional but recommended)
5. Wait for verification (usually takes a few minutes to 24 hours)
6. Once verified, you can use emails like `noreply@zenithbooks.in`

### Option B: Use Resend Test Domain (For Development/Testing)
1. Resend provides a test domain: `onboarding@resend.dev`
2. You can use this for testing without domain verification
3. **Note**: Test domain emails may go to spam folder

---

## 🚀 Step 4: Configure Environment Variables

### For Vercel (Production):
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

```
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=noreply@zenithbooks.in
```

**Important**: 
- Replace `re_xxxxxxxxxxxxx` with your actual Resend API key
- Replace `noreply@zenithbooks.in` with your verified email/domain
- Make sure to add these for **Production**, **Preview**, and **Development** environments

### For Local Development:
1. Create or edit `.env.local` file in your project root
2. Add:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=noreply@zenithbooks.in
```

3. Restart your development server

---

## ✅ Step 5: Verify Setup

1. After adding environment variables, restart your application
2. Try sending a test email from your application:
   - Go to any report/document with email sharing
   - Click "Email" button
   - Send a test email to yourself
3. Check your inbox (and spam folder if using test domain)

---

## 🔒 Security Best Practices

1. **Never commit API keys to Git**
   - API keys should only be in environment variables
   - `.env.local` should be in `.gitignore`

2. **Use different keys for production and development**
   - Create separate API keys for each environment
   - Restrict permissions appropriately

3. **Rotate keys regularly**
   - Change API keys periodically for security
   - Revoke old keys when no longer needed

---

## 📊 Resend Limits (Free Tier)

- **3,000 emails/month** (free tier)
- **100 emails/day** rate limit
- Perfect for starting out and testing

**Upgrade plans available** if you need more:
- Pro: $20/month - 50,000 emails
- Business: Custom pricing

---

## 🐛 Troubleshooting

### Email not sending?

1. **Check API key is correct**
   ```bash
   # In your .env.local, verify:
   RESEND_API_KEY=re_xxxxxxxxxxxxx  # Should start with "re_"
   ```

2. **Check email address is verified**
   - Domain must be verified in Resend dashboard
   - Or use test domain: `onboarding@resend.dev`

3. **Check email format**
   - `EMAIL_FROM` must be a valid email format
   - Example: `noreply@zenithbooks.in` ✅
   - Example: `noreply` ❌ (missing domain)

4. **Check error logs**
   - Look at your application logs
   - Check Resend dashboard → Logs section
   - Look for bounce/spam reports

### Emails going to spam?

1. **Verify your domain properly**
   - Add all required DNS records (SPF, DKIM, DMARC)
   - Wait for full verification

2. **Use a proper sender name**
   - Use your actual domain, not test domains
   - Avoid spammy words in subject/content

3. **Warm up your domain** (for new domains)
   - Start with small volumes
   - Gradually increase

---

## 📝 Example Configuration

### Production (.env on Vercel):
```env
RESEND_API_KEY=re_abc123xyz789
EMAIL_FROM=noreply@zenithbooks.in
```

### Development (.env.local):
```env
RESEND_API_KEY=re_test123xyz789
EMAIL_FROM=onboarding@resend.dev
```

---

## 🔗 Useful Links

- [Resend Dashboard](https://resend.com/emails)
- [Resend Documentation](https://resend.com/docs)
- [Resend API Reference](https://resend.com/docs/api-reference)
- [DNS Setup Guide](https://resend.com/docs/dashboard/domains/introduction)

---

## ✅ Testing Checklist

After setup, verify:
- [ ] API key added to environment variables
- [ ] EMAIL_FROM configured with verified email/domain
- [ ] Test email sent successfully
- [ ] Email received in inbox (not spam)
- [ ] Email content and attachments correct
- [ ] Multiple recipients work (if applicable)

---

**Need Help?**
- Check Resend documentation: https://resend.com/docs
- Contact Resend support: support@resend.com
- Check application logs for error messages

---

**Last Updated**: Today

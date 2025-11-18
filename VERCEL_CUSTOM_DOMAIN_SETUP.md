# Vercel Custom Domain Setup Guide - zenithbooks.com

This guide will walk you through adding `zenithbooks.com` as a custom domain to your Vercel deployment.

## Prerequisites

1. ✅ You own the domain `zenithbooks.com`
2. ✅ You have access to your domain registrar (where you bought the domain)
3. ✅ You have access to your Vercel account
4. ✅ Your project is already deployed on Vercel

---

## Step-by-Step Instructions

### Step 1: Add Domain in Vercel Dashboard

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Sign in to your account

2. **Select Your Project**
   - Click on the `zenithbooks` project

3. **Navigate to Domain Settings**
   - Click on **Settings** tab (in the top navigation)
   - Click on **Domains** in the left sidebar

4. **Add Your Domain**
   - Click the **Add** button (or **Add Domain**)
   - Enter: `zenithbooks.com`
   - Click **Add**

5. **Vercel will show you DNS configuration**
   - Vercel will display the DNS records you need to add
   - You'll see something like:
     ```
     Type: A
     Name: @
     Value: 76.76.21.21 (example IP - Vercel will show actual IPs)
     
     Type: CNAME
     Name: www
     Value: cname.vercel-dns.com
     ```

---

### Step 2: Configure DNS Records

You need to add DNS records at your domain registrar. The exact steps depend on where you bought your domain.

#### Option A: Using A Record (Root Domain - zenithbooks.com)

1. **Go to your domain registrar** (GoDaddy, Namecheap, Google Domains, etc.)
2. **Find DNS Management** (usually under "DNS Settings" or "Domain Management")
3. **Add A Record**:
   - **Type**: `A`
   - **Name/Host**: `@` or leave blank (for root domain)
   - **Value/Target**: The IP address Vercel provides (e.g., `76.76.21.21`)
   - **TTL**: `3600` (or default)
   - **Save**

4. **Add CNAME Record for www** (Optional but recommended):
   - **Type**: `CNAME`
   - **Name/Host**: `www`
   - **Value/Target**: `cname.vercel-dns.com` (or what Vercel shows)
   - **TTL**: `3600` (or default)
   - **Save**

#### Option B: Using CNAME Record (Alternative)

Some registrars prefer CNAME for root domains. If Vercel shows a CNAME option:

1. **Add CNAME Record**:
   - **Type**: `CNAME`
   - **Name/Host**: `@` or leave blank
   - **Value/Target**: `cname.vercel-dns.com` (or what Vercel shows)
   - **TTL**: `3600`
   - **Save**

#### Option C: Using Nameservers (Easiest - Recommended)

If your registrar supports it, you can use Vercel's nameservers:

1. **In Vercel Dashboard**:
   - Go to **Settings** → **Domains**
   - Click on `zenithbooks.com`
   - Look for **Nameservers** section
   - Copy the nameservers (e.g., `ns1.vercel-dns.com`, `ns2.vercel-dns.com`)

2. **At Your Domain Registrar**:
   - Go to DNS/Nameserver settings
   - Change nameservers to Vercel's nameservers
   - Save

**Note**: This method gives Vercel full control over DNS, which is easier to manage.

---

### Step 3: Wait for DNS Propagation

1. **DNS changes take time to propagate**
   - Usually takes 5 minutes to 48 hours
   - Typically completes within 1-2 hours
   - You can check status in Vercel dashboard

2. **Check DNS Status in Vercel**
   - Go to **Settings** → **Domains**
   - Click on `zenithbooks.com`
   - You'll see the status:
     - ⏳ **Pending** - DNS not configured yet
     - ✅ **Valid** - DNS configured correctly
     - ❌ **Invalid** - DNS misconfigured

3. **Verify DNS Propagation**
   - Use online tools like:
     - https://dnschecker.org
     - https://www.whatsmydns.net
   - Search for `zenithbooks.com` A record
   - Check if it shows Vercel's IP address

---

### Step 4: SSL Certificate (Automatic)

✅ **Good News**: Vercel automatically provisions SSL certificates!

1. **Once DNS is configured correctly**, Vercel will:
   - Automatically detect the domain
   - Issue a free SSL certificate (Let's Encrypt)
   - Enable HTTPS automatically

2. **SSL Certificate Status**:
   - Go to **Settings** → **Domains**
   - Click on `zenithbooks.com`
   - You'll see SSL status:
     - ⏳ **Pending** - Certificate being issued
     - ✅ **Valid** - HTTPS is active
     - ❌ **Invalid** - Certificate issue

3. **Wait Time**: SSL certificate usually takes 5-10 minutes after DNS is valid

---

### Step 5: Verify Domain is Working

1. **Test the Domain**
   - Visit: https://zenithbooks.com
   - It should load your application
   - Check that HTTPS is working (lock icon in browser)

2. **Test www Subdomain** (if configured)
   - Visit: https://www.zenithbooks.com
   - Should redirect to or show the same site

3. **Check in Vercel Dashboard**
   - Go to **Settings** → **Domains**
   - Both `zenithbooks.com` and `www.zenithbooks.com` should show ✅ **Valid**

---

## Common Issues & Solutions

### Issue 1: Domain shows "Invalid Configuration"

**Solution**:
- Double-check DNS records match exactly what Vercel shows
- Ensure TTL is set correctly
- Wait a bit longer for DNS propagation
- Try using Vercel's nameservers instead

### Issue 2: SSL Certificate not issuing

**Solution**:
- Ensure DNS is correctly configured first
- Wait 10-15 minutes after DNS is valid
- Check that your domain registrar allows SSL certificates
- Try removing and re-adding the domain in Vercel

### Issue 3: Domain not resolving

**Solution**:
- Verify DNS records are saved at your registrar
- Check DNS propagation using dnschecker.org
- Clear your browser cache
- Try accessing from different network/device
- Wait longer for DNS propagation (can take up to 48 hours)

### Issue 4: www subdomain not working

**Solution**:
- Add CNAME record for `www` pointing to Vercel
- Or configure redirect in Vercel to redirect www to root domain
- In Vercel: **Settings** → **Domains** → Add `www.zenithbooks.com`

---

## Additional Configuration (Optional)

### Redirect www to root domain (or vice versa)

1. **In Vercel Dashboard**:
   - Go to **Settings** → **Domains**
   - Add both `zenithbooks.com` and `www.zenithbooks.com`
   - Vercel will automatically handle redirects

2. **Or configure in next.config.ts**:
   ```typescript
   async redirects() {
     return [
       {
         source: '/',
         has: [
           {
             type: 'host',
             value: 'www.zenithbooks.com',
           },
         ],
         destination: 'https://zenithbooks.com',
         permanent: true,
       },
     ]
   }
   ```

### Set Primary Domain

1. **In Vercel Dashboard**:
   - Go to **Settings** → **Domains**
   - Click on the domain you want as primary
   - Click **Set as Primary**

---

## Quick Checklist

- [ ] Domain added in Vercel dashboard
- [ ] DNS records added at domain registrar
- [ ] DNS propagation verified (using dnschecker.org)
- [ ] Domain shows "Valid" in Vercel
- [ ] SSL certificate issued (shows "Valid")
- [ ] https://zenithbooks.com loads correctly
- [ ] HTTPS is working (lock icon in browser)
- [ ] www subdomain configured (optional)

---

## Popular Domain Registrar Guides

### GoDaddy
1. Log in → My Products → DNS
2. Add A record: Type `A`, Host `@`, Points to `[Vercel IP]`
3. Add CNAME: Type `CNAME`, Host `www`, Points to `cname.vercel-dns.com`

### Namecheap
1. Domain List → Manage → Advanced DNS
2. Add A record: Type `A Record`, Host `@`, Value `[Vercel IP]`
3. Add CNAME: Type `CNAME Record`, Host `www`, Value `cname.vercel-dns.com`

### Google Domains
1. DNS → Custom records
2. Add A record: Name `@`, Type `A`, Data `[Vercel IP]`
3. Add CNAME: Name `www`, Type `CNAME`, Data `cname.vercel-dns.com`

### Cloudflare
1. DNS → Records
2. Add A record: Type `A`, Name `@`, Content `[Vercel IP]`, Proxy status `DNS only`
3. Add CNAME: Type `CNAME`, Name `www`, Target `cname.vercel-dns.com`, Proxy status `DNS only`

**Important**: If using Cloudflare, make sure to set Proxy status to **DNS only** (gray cloud), not **Proxied** (orange cloud) for A records.

---

## Summary

1. **Add domain in Vercel**: Settings → Domains → Add `zenithbooks.com`
2. **Configure DNS**: Add A record (or CNAME) at your domain registrar
3. **Wait for propagation**: 5 minutes to 48 hours (usually 1-2 hours)
4. **SSL is automatic**: Vercel will issue certificate once DNS is valid
5. **Test**: Visit https://zenithbooks.com

**Total Time**: Usually 1-2 hours from start to finish (mostly waiting for DNS propagation)

---

## Need Help?

- **Vercel Documentation**: https://vercel.com/docs/concepts/projects/domains
- **Vercel Support**: https://vercel.com/support
- **Check DNS**: https://dnschecker.org


# How to Clear Build Cache and Trigger Fresh Rebuild on Vercel

## Method 1: Using Vercel Dashboard (Recommended)

### Step 1: Purge Data Cache (CRITICAL for API Routes)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: **zenithbooks** (or your project name)
3. Click on **Settings** (gear icon in the top navigation)
4. Click on **Cache** in the left sidebar
5. Find the **"Data Cache"** section
6. Click **"Purge Cache"** button under Data Cache
7. Confirm the action (this deletes all cached data and components)

### Step 2: Purge CDN Cache (Optional but Recommended)
1. Still in the **Cache** settings page
2. Find the **"CDN Cache"** section
3. Click **"Purge Cache"** button under CDN Cache
4. Confirm the action (this invalidates cached responses)

### Step 3: Trigger Fresh Deployment
1. Go to **Deployments** tab (in the top navigation)
2. Find your latest deployment (should be the one we just pushed - commit message: "chore: Trigger fresh Vercel rebuild...")
3. Click the **three dots (⋮)** menu on the right side of the deployment
4. Select **"Redeploy"**
5. **IMPORTANT**: In the redeploy dialog:
   - If there's an option to **"Use existing Build Cache"**, make sure it's **UNCHECKED**
   - Or look for **"Redeploy with fresh build"** option
6. Click **"Redeploy"**

### Step 4: Monitor the Build
1. Watch the build logs in real-time
2. Look for: `✓ Compiled /api/vault/validate-code successfully`
3. Verify the build completes successfully
4. Wait for deployment to finish (usually 2-5 minutes)

---

## Method 2: Using Vercel CLI (Alternative)

If you prefer using the command line:

### Step 1: Install Vercel CLI (if not already installed)
```bash
npm i -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Clear Cache and Redeploy
```bash
# Navigate to your project directory
cd C:\Users\balaji\Downloads\zenithbooks-Dec1

# Force a fresh deployment (clears cache automatically)
vercel --prod --force
```

The `--force` flag forces a fresh build without using cache.

---

## Method 3: Manual Cache Clear via Git Push

Sometimes triggering a new deployment via git push helps:

1. Make a small change to trigger rebuild:
   ```bash
   # Create a small change (like updating a comment)
   # Then commit and push
   git add .
   git commit -m "chore: trigger fresh build"
   git push origin main
   ```

2. Vercel will automatically detect the push and rebuild
3. The new build should pick up all the latest changes

---

## Method 4: Vercel Project Settings

### Clear Cache via Project Settings:
1. Go to **Project Settings** → **General**
2. Scroll to **"Build & Development Settings"**
3. Look for **"Build Cache"** section
4. Click **"Clear Cache"** or **"Reset Build Cache"**

### Force Fresh Build:
1. In **Project Settings** → **General**
2. Find **"Build Command"** (if you have a custom one)
3. Temporarily add `--no-cache` flag (if using npm/yarn)
4. Or use the redeploy method above

---

## Verification Steps

After redeployment, verify the routes are working:

### 1. Test Health Check Endpoint:
```bash
# Open in browser or use curl:
https://www.zenithbooks.in/api/vault/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "vault-api",
  "timestamp": "2025-12-03T..."
}
```

### 2. Test Validate Code Endpoint:
```bash
# Use browser DevTools Network tab or Postman
POST https://www.zenithbooks.in/api/vault/validate-code
Content-Type: application/json

{
  "code": "TEST123"
}
```

Should return either:
- `400` if code is invalid format
- `404` if code doesn't exist (but route is working!)
- `200` if code is valid

### 3. Check Vercel Function Logs:
1. Go to **Deployments** → Select latest deployment
2. Click **"Functions"** tab
3. Look for `/api/vault/validate-code`
4. Check if it appears in the functions list
5. View logs to see if requests are reaching it

---

## Troubleshooting

### If 404 Still Persists:

1. **Check Build Logs**:
   - Look for errors about missing files
   - Verify `src/app/api/vault/validate-code/route.ts` is in the build

2. **Verify File Structure**:
   - Ensure the file is at: `src/app/api/vault/validate-code/route.ts`
   - Not at: `app/api/vault/validate-code/route.ts` (without `src/`)

3. **Check Next.js Version**:
   - Ensure you're using Next.js 13+ (App Router)
   - API routes in `app/` directory require Next.js 13+

4. **Verify Vercel Configuration**:
   - Check if there's a `vercel.json` that might be interfering
   - Ensure no redirects are blocking `/api/*` routes

5. **Contact Vercel Support**:
   - If issue persists, contact Vercel support with:
     - Project URL
     - Deployment ID
     - Error logs
     - Route file location

---

## Quick Reference Commands

```bash
# Check Vercel CLI version
vercel --version

# List all deployments
vercel ls

# View deployment logs
vercel logs [deployment-url]

# Force production deployment
vercel --prod --force
```

---

## Expected Build Output

When the build succeeds, you should see in the logs:
```
✓ Compiled /api/vault/validate-code successfully
✓ Compiled /api/vault/shared-documents successfully
✓ Compiled /api/vault/log-access successfully
✓ Compiled /api/vault/health successfully
```

If you see these, the routes are built correctly!


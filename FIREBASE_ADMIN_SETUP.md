# 🔑 How to Get Firebase Admin Credentials

## Step-by-Step Guide

### Step 1: Go to Firebase Console

1. Visit: https://console.firebase.google.com/
2. Select your project: **zenithbooks-1c818**

### Step 2: Access Service Accounts

1. Click on the **⚙️ Settings** icon (gear icon) in the left sidebar
2. Click on **Project settings**
3. Go to the **Service accounts** tab

### Step 3: Generate New Private Key

1. You'll see a section titled **"Firebase Admin SDK"**
2. Under "Generate new private key", click the **"Generate new private key"** button
3. A dialog will appear - click **"Generate key"**
4. A JSON file will be downloaded (e.g., `zenithbooks-1c818-firebase-adminsdk-xxxxx.json`)

### Step 4: Extract Values from JSON

Open the downloaded JSON file. It will look like this:

```json
{
  "type": "service_account",
  "project_id": "zenithbooks-1c818",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@zenithbooks-1c818.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  ...
}
```

### Step 5: Copy the Required Values

Extract these three values:

1. **FIREBASE_PROJECT_ID**: 
   - Value: `zenithbooks-1c818` (or use `project_id` from JSON)

2. **FIREBASE_CLIENT_EMAIL**: 
   - Value: `firebase-adminsdk-xxxxx@zenithbooks-1c818.iam.gserviceaccount.com` (from `client_email` field)

3. **FIREBASE_PRIVATE_KEY**: 
   - Value: The entire `private_key` field (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)
   - ⚠️ **Important**: Copy the ENTIRE key including the BEGIN and END lines
   - The newlines (`\n`) should be preserved

### Step 6: Add to Environment Variables

#### For Vercel Deployment:

1. Go to your Vercel project: https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add each variable:

   ```
   Name: FIREBASE_PROJECT_ID
   Value: zenithbooks-1c818
   ```

   ```
   Name: FIREBASE_CLIENT_EMAIL
   Value: firebase-adminsdk-xxxxx@zenithbooks-1c818.iam.gserviceaccount.com
   ```

   ```
   Name: FIREBASE_PRIVATE_KEY
   Value: -----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n
   ```
   
   **Important for FIREBASE_PRIVATE_KEY:**
   - ❌ **DO NOT** add quotes around the value
   - ✅ Paste the entire key from the JSON file (all on one line)
   - ✅ Keep the `\n` characters as-is (they represent newlines)
   - ✅ Include both `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines
   - ✅ The value should be all on one line in Vercel's input field
   
   **Example of correct format (all on one line, no quotes):**
   ```
   -----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n
   ```

5. Select **Environment**: Production, Preview, and Development (or all)
6. Click **Save**
7. **Redeploy** your application for changes to take effect

#### For Local Development (.env.local):

Create or edit `.env.local` in your project root:

**Option 1: Single line with `\n` (recommended):**
```env
FIREBASE_PROJECT_ID=zenithbooks-1c818
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@zenithbooks-1c818.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

**Option 2: Multi-line format (if your .env parser supports it):**
```env
FIREBASE_PROJECT_ID=zenithbooks-1c818
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@zenithbooks-1c818.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----"
```

⚠️ **Important for .env.local**: 
- ✅ Use quotes around the private key value
- ✅ Keep the `.env.local` file in `.gitignore` (don't commit it)
- The code automatically converts `\n` to actual newlines: `replace(/\\n/g, '\n')`

### Step 7: Verify Setup

After adding the environment variables:

1. **Redeploy** your application
2. Test the API endpoint: `POST /api/tasks/create`
3. Check the logs - you should no longer see "Firebase Admin credentials missing" errors

---

## Quick Reference

| Environment Variable | Value Location | Example |
|---------------------|----------------|---------|
| `FIREBASE_PROJECT_ID` | `project_id` field in JSON | `zenithbooks-1c818` |
| `FIREBASE_CLIENT_EMAIL` | `client_email` field in JSON | `firebase-adminsdk-xxxxx@...` |
| `FIREBASE_PRIVATE_KEY` | `private_key` field in JSON | `-----BEGIN PRIVATE KEY-----\n...` |

---

## Troubleshooting

### "Firebase Admin credentials missing"

**Check:**
1. Are all three environment variables set?
2. Is the private key properly formatted (with BEGIN/END lines)?
3. Did you redeploy after adding the variables?

### "Invalid private key"

**Fix:**
- Make sure the private key includes the BEGIN and END lines
- Ensure newlines are preserved (use `\n` or actual newlines)
- Don't remove any characters from the key

### "Service account key not found"

**Solution:**
- Re-download the service account key from Firebase Console
- Make sure you're using the correct project (`zenithbooks-1c818`)

---

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit** the service account JSON file or `.env.local` to Git
2. **Never share** your private key publicly
3. **Rotate keys** if they're ever exposed
4. The service account has admin access - keep it secure
5. Only add these variables in secure environment variable systems (Vercel, etc.)

---

## Alternative: Using Firebase Admin SDK with JSON File

If you prefer using a JSON file instead of environment variables:

1. Store the downloaded JSON file securely on your server
2. Modify the initialization code to read from the file:

```typescript
import serviceAccount from '@/path/to/service-account-key.json';

initializeApp({
  credential: cert(serviceAccount as ServiceAccount),
});
```

However, **environment variables are recommended** for better security and easier deployment.

---

**Ready to set up!** Follow these steps to get your Firebase Admin credentials. 🚀


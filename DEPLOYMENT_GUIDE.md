# 🚀 Document Vault - Production Deployment Guide

## Prerequisites

1. ✅ All 8 phases completed
2. ✅ Code committed and pushed to GitHub
3. ✅ Firebase project configured
4. ✅ Environment variables set

---

## Step 1: Review Security Rules

### Firestore Rules
Ensure `firestore.rules` is properly configured for production:

```bash
# Review current rules
cat firestore.rules
```

**Key Points to Verify:**
- ✅ User ownership checks (`isOwner` function)
- ✅ Document Vault collections secured
- ✅ Rate limiting collection restricted (server-side only)
- ✅ No overly permissive rules (`allow read, write: if true`)

**⚠️ IMPORTANT:** The current rules have a temporary permissive rule at the top:
```javascript
match /{document=**} {
  allow read, write: if true; // TEMPORARY - Remove before production!
}
```

**Action Required:** Remove this rule or comment it out before deploying to production!

### Storage Rules
Ensure `storage.rules` is properly configured:

```bash
# Review current rules
cat storage.rules
```

**Key Points to Verify:**
- ✅ Vault storage paths restricted to user ownership
- ✅ File size validation (if needed)
- ✅ File type validation (if needed)

---

## Step 2: Test Locally

### Install Firebase CLI (if not installed)
```bash
npm install -g firebase-tools
```

### Login to Firebase
```bash
firebase login
```

### Initialize Firebase (if not done)
```bash
firebase init firestore
firebase init storage
```

### Test Rules Locally (Emulator)
```bash
# Start emulator
firebase emulators:start

# Test rules
firebase emulators:exec --only firestore,storage "npm test"
```

---

## Step 3: Build Application

### Build Next.js Application
```bash
npm run build
```

**Expected Output:**
- ✅ No TypeScript errors
- ✅ No build errors
- ✅ Build completes successfully

### Test Production Build Locally
```bash
npm run start
```

**Verify:**
- ✅ Application starts without errors
- ✅ All routes load correctly
- ✅ Document Vault pages accessible
- ✅ No console errors

---

## Step 4: Deploy Security Rules

### Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

**Expected Output:**
```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/YOUR_PROJECT/firestore
```

### Deploy Storage Rules
```bash
firebase deploy --only storage
```

**Expected Output:**
```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/YOUR_PROJECT/storage
```

### Verify Deployment
1. Go to Firebase Console
2. Navigate to Firestore → Rules
3. Verify rules are updated
4. Navigate to Storage → Rules
5. Verify rules are updated

---

## Step 5: Deploy Application

### Option A: Vercel (Recommended for Next.js)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Option B: Other Platforms
- Follow your platform-specific deployment guide
- Ensure environment variables are set
- Ensure Node.js version matches local (18+)

---

## Step 6: Post-Deployment Testing

### Critical Tests

#### 1. Authentication & Authorization
- [ ] Users can log in
- [ ] Users can only access their own vault
- [ ] Freemium users see Document Vault
- [ ] Unauthorized access blocked

#### 2. Document Upload
- [ ] Upload PDF document
- [ ] Upload image (JPG, PNG)
- [ ] Upload Office document (Word, Excel)
- [ ] File size validation (try >50MB)
- [ ] Storage limit validation (try >5GB)

#### 3. Document Management
- [ ] View documents
- [ ] Edit document metadata
- [ ] Delete documents
- [ ] Upload new version
- [ ] View version history

#### 4. Share Code System
- [ ] Create share code
- [ ] Share code hashing works (not plain text)
- [ ] 5-day expiry working
- [ ] Category filtering works
- [ ] Multiple share codes possible

#### 5. Third-Party Access
- [ ] Access via share code (public page)
- [ ] Only shared categories visible
- [ ] Download functionality works
- [ ] Expired codes rejected
- [ ] Invalid codes rejected

#### 6. Security Features
- [ ] Rate limiting works (try 6+ failed attempts)
- [ ] Lockout enforced (15 minutes)
- [ ] Suspicious activity detection
- [ ] Access logs created
- [ ] IP addresses logged

#### 7. Notifications
- [ ] Access alerts sent (if enabled)
- [ ] Expiry warnings sent (if enabled)
- [ ] Storage warnings sent (if enabled)
- [ ] Preferences respected
- [ ] Notifications appear in notification center

#### 8. UI/UX
- [ ] Mobile responsive
- [ ] Loading states work
- [ ] Error handling works
- [ ] Empty states display
- [ ] Tooltips show correctly

---

## Step 7: Monitor & Verify

### Firebase Console Checks
1. **Firestore Usage**
   - Monitor document reads/writes
   - Check for unusual patterns
   - Verify indexes created (if needed)

2. **Storage Usage**
   - Monitor storage growth
   - Check file uploads
   - Verify storage limits

3. **Error Logs**
   - Check for errors in Functions logs (if applicable)
   - Review client-side errors
   - Monitor API route errors

### Application Monitoring
- [ ] Check application logs
- [ ] Monitor performance
- [ ] Track user feedback
- [ ] Review access logs for suspicious activity

---

## Step 8: User Communication

### Announce Feature
- Email to existing users
- In-app notification
- Update documentation
- Social media announcement (if applicable)

### Provide Support
- Prepare FAQ
- Train support team
- Monitor user questions
- Address feedback quickly

---

## Troubleshooting

### Common Issues

#### Rules Deployment Failed
```bash
# Check Firebase login
firebase login

# Verify project
firebase projects:list

# Select correct project
firebase use YOUR_PROJECT_ID

# Try deploying again
firebase deploy --only firestore:rules
```

#### Build Errors
```bash
# Clear cache
rm -rf .next
rm -rf node_modules

# Reinstall dependencies
npm install

# Rebuild
npm run build
```

#### Permission Errors
- Verify Firebase project permissions
- Check IAM roles in GCP console
- Ensure service account has correct permissions

---

## Rollback Plan

If issues occur after deployment:

### Rollback Rules
```bash
# Deploy previous version from git
git checkout HEAD~1 firestore.rules storage.rules
firebase deploy --only firestore:rules,storage
```

### Rollback Application
```bash
# Rollback via Vercel dashboard or
vercel rollback
```

---

## Production Checklist

- [ ] Firestore rules reviewed and deployed
- [ ] Storage rules reviewed and deployed
- [ ] Temporary permissive rules removed
- [ ] Application built successfully
- [ ] Application deployed to production
- [ ] Environment variables configured
- [ ] Post-deployment tests passed
- [ ] Monitoring set up
- [ ] Support team notified
- [ ] Users notified

---

## Security Best Practices

1. **Never commit sensitive data** (API keys, secrets)
2. **Use environment variables** for all configuration
3. **Regular security audits** of rules
4. **Monitor access logs** for suspicious activity
5. **Keep dependencies updated**
6. **Enable Firebase Security Rules** (remove permissive rules)
7. **Use HTTPS only** in production
8. **Regular backups** of Firestore data

---

## Next Steps After Deployment

1. Monitor usage for first week
2. Gather user feedback
3. Address any bugs/issues
4. Plan enhancements based on feedback
5. Consider additional features:
   - Document thumbnails/previews
   - Advanced search (within PDF content)
   - Bulk operations
   - Email notifications
   - Document expiry dates

---

**Last Updated:** December 2024
**Version:** 1.0


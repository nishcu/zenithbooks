# 🚀 Quick Reference: User Access Guide

## ⚡ Quick Decision Tree

```
Is user logged in?
├─ NO → Redirect to login
└─ YES → Check subscription
    │
    ├─ subscriptionPlan === "freemium"
    │   ├─ ✅ Basic Billing (FREE)
    │   ├─ ❌ Accounting/GST/IT Tools (LOCKED)
    │   └─ 💰 All Premium Services (PAY)
    │
    ├─ subscriptionPlan === "business"
    │   ├─ ✅ All Features (FREE)
    │   └─ 💰 Premium Services (PAY)
    │
    └─ subscriptionPlan === "professional"
        │
        ├─ userType === "professional"
        │   ├─ ✅ All Features (FREE)
        │   └─ ✅ All Premium Services (FREE) ⭐
        │
        └─ userType === "business"
            ├─ ✅ All Features (FREE)
            └─ 💰 Premium Services (PAY)
```

---

## 🎯 Premium Services Pricing Logic

### What are Premium Services?
- CA Certificates
- Legal Documents
- CMA Reports
- Notice Handling

### Pricing Formula:

```javascript
effectivePrice = 
  (userType === "professional" && subscriptionPlan === "professional")
    ? 0  // FREE
    : basePrice  // PAY configured price
```

---

## 📋 Access Check Functions

### 1. Check Feature Access (Accounting, GST, etc.)
```typescript
const { isFreemium, isBusiness, isProfessional } = useSubscriptionCheck();

if (isFreemium) {
  // Show upgrade alert
} else {
  // Show feature
}
```

### 2. Check Premium Service Price
```typescript
const effectivePrice = getEffectiveServicePrice(
  basePrice,
  userType,
  subscriptionPlan,
  serviceCategory
);

if (effectivePrice === 0) {
  // FREE - Show download directly
} else {
  // PAY - Show payment gate
}
```

---

## 🔍 Quick Lookup Table

| User Type | Subscription | CA Certs | Legal Docs | CMA Reports | Notice Handling |
|-----------|--------------|----------|------------|-------------|-----------------|
| Business | Freemium | 💰 Pay | 💰 Pay | 💰 Pay | 💰 Pay |
| Business | Business | 💰 Pay | 💰 Pay | 💰 Pay | 💰 Pay |
| Business | Professional | 💰 Pay | 💰 Pay | 💰 Pay | 💰 Pay |
| **Professional** | **Professional** | ✅ **FREE** | ✅ **FREE** | ✅ **FREE** | ✅ **FREE** |

---

## 🎨 UI Flow Examples

### Example: Trust Deed Page

```typescript
// 1. Get user info
const userSubscriptionInfo = await getUserSubscriptionInfo(user.uid);
const pricing = await getServicePricing();

// 2. Calculate price
const basePrice = 9999; // Trust Deed price
const effectivePrice = getEffectiveServicePrice(
  basePrice,
  userSubscriptionInfo.userType,
  userSubscriptionInfo.subscriptionPlan,
  "registration_deeds"
);

// 3. Render UI
if (effectivePrice > 0) {
  // Show: "Pay ₹9,999 to Download"
  return <CashfreeCheckout amount={9999} />;
} else {
  // Show: "Download Now" (FREE)
  return <DownloadButton />;
}
```

---

## 🔐 Service Categories

All services belong to categories that determine pricing:

```typescript
type ServiceCategory = 
  | "ca_certs"              // CA Certificates
  | "legal_documents"       // Generic legal docs
  | "agreements"            // Service, Vendor, etc.
  | "registration_deeds"    // Partnership, LLP, Trust, etc.
  | "founder_startup"       // Founders Agreement, ESOP, etc.
  | "hr_documents"          // Appointment Letter, Offer Letter, etc.
  | "company_documents"     // Board Resolutions, Statutory Registers
  | "gst_documents"         // GST Engagement Letter, etc.
  | "accounting_documents"  // Accounting Engagement Letter
  | "notice_handling"       // IT/GST/ROC Notice Replies
  | "reports";              // CMA Reports, etc.
```

**All categories are FREE for:**
- `userType: "professional"` + `subscriptionPlan: "professional"`

**All categories require PAYMENT for:**
- Everyone else (regardless of subscription plan)

---

## 💡 Common Questions

### Q: Can a Business user get free CA Certificates?
**A:** No. Only Professional users with Professional subscription get free services.

### Q: If I upgrade to Professional Plan as a Business user, do I get free services?
**A:** No. You need BOTH:
- `userType: "professional"` (set during signup)
- `subscriptionPlan: "professional"` (can be purchased)

### Q: What's the difference between Business Plan and Professional Plan?
**A:**
- **Business Plan:** All features unlocked, but still pay for premium services
- **Professional Plan:** All features unlocked + FREE premium services (only if `userType: "professional"`)

### Q: Can I change my user type?
**A:** No. User type is set during signup and can only be changed by admin.

---

## 🛠️ Testing Different User Scenarios

### Test Scenario 1: Freemium User
```javascript
userType: "business"
subscriptionPlan: "freemium"

Expected Behavior:
- ✅ Can access: Billing, Invoices, Parties, Items
- ❌ Cannot access: Accounting, GST, Income Tax (locked)
- 💰 Must pay: All premium services
```

### Test Scenario 2: Business Plan User
```javascript
userType: "business"
subscriptionPlan: "business"

Expected Behavior:
- ✅ Can access: Everything (Accounting, GST, etc.)
- 💰 Must pay: All premium services (₹1,499 - ₹19,999)
```

### Test Scenario 3: Professional User (FREE Everything)
```javascript
userType: "professional"
subscriptionPlan: "professional"

Expected Behavior:
- ✅ Can access: Everything (Accounting, GST, etc.)
- ✅ FREE: All premium services (no payment required)
- ✅ Can manage: Multiple client businesses
```

---

## 📊 Price Ranges Reference

### CA Certificates
- General Attestation: ₹1,499
- Turnover Certificate: ₹1,999
- Net Worth Certificate: ₹2,499
- Capital Contribution: ₹2,999
- Visa/Immigration: ₹3,499
- Foreign Remittance: ₹3,999

### Legal Documents
- HR Documents: ₹499 - ₹1,499
- Agreements: ₹2,499 - ₹12,999
- Registration Deeds: ₹2,999 - ₹14,999
- Founder/Startup: ₹4,999 - ₹19,999

### Other Services
- CMA Reports: ₹4,999
- Notice Handling: ₹2,999 - ₹3,999

---

## ✅ Checklist for Developers

When implementing a new premium service:

- [ ] Fetch user subscription info
- [ ] Get base price from pricing service
- [ ] Calculate effective price using `getEffectiveServicePrice()`
- [ ] Show payment gate if `effectivePrice > 0`
- [ ] Show download directly if `effectivePrice === 0`
- [ ] Handle payment success callback
- [ ] Show document only after payment (or if free)

---

## 🎯 Key Files to Reference

1. **`src/lib/service-pricing-utils.ts`** - Pricing logic
2. **`src/lib/on-demand-pricing.ts`** - Base prices configuration
3. **`src/hooks/use-subscription-check.ts`** - Feature access hook
4. **Any legal document page** - Example implementation

---

## 📞 Quick Debug

If a user can't access something:

1. Check Firestore: `users/{userId}`
   - `userType`: Should be "business" or "professional"
   - `subscriptionPlan`: Should be "freemium", "business", or "professional"

2. Check pricing logic:
   ```typescript
   const isFree = isServiceFreeForUser(
     userType,
     subscriptionPlan,
     serviceCategory
   );
   ```

3. Check effective price:
   ```typescript
   const price = getEffectiveServicePrice(
     basePrice,
     userType,
     subscriptionPlan,
     serviceCategory
   );
   ```

---

This quick reference should help you understand and debug access issues quickly! 🚀













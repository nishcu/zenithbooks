# Bank Statement Converter Feature - Complete Guide

## 🎯 Feature Location

### Direct URL:
- **Local**: `http://localhost:3000/accounting/journal/bulk`
- **Production**: `https://www.zenithbooks.in/accounting/journal/bulk`

### Navigation Path:
1. **Sidebar Menu** → **Accounting** → **Vouchers** → **Journal**
2. On the Journal page, navigate to **Bulk Journal** section
3. Click the **"Bank Statement Converter"** tab

---

## 📋 Feature Overview

The **Bank Statement Converter** converts bank statements (CSV/Excel) into pre-filled bulk journal templates. The bank account side is automatically filled, and you only need to fill in the counter accounts.

---

## 🔄 Complete Workflow

### Step 1: Upload Bank Statement
- Click **"Select Bank Statement File"**
- Upload a CSV or Excel file containing your bank transactions
- Supported formats: `.csv`, `.xlsx`, `.xls`
- The parser automatically detects columns for:
  - Date, Description, Debit, Credit, Balance, Reference

### Step 2: Preview Transactions
- Review parsed transactions in the preview table
- Check summary statistics:
  - Total transactions
  - Number of deposits
  - Number of withdrawals
- Review any parsing errors (if any)

### Step 3: Select Bank Account
- Choose the bank account from the dropdown
- This account will be pre-filled in the journal template
- Auto-selects if only one bank account exists

### Step 4: Generate Journal Template
- Click **"Download Journal Template"**
- An Excel file will be downloaded with:
  - **Journal Entries** sheet: Pre-filled transactions
  - **Instructions** sheet: Column descriptions

### Step 5: Fill Counter Accounts
- Open the downloaded Excel file
- Fill in the blank counter accounts:
  - **For Deposits**: Fill the `CreditAccount` column (e.g., Sales Revenue, Interest Income)
  - **For Withdrawals**: Fill the `DebitAccount` column (e.g., Salaries, Rent, Office Supplies)

### Step 6: Upload Filled Template
- Go back to the **"Upload Entries"** tab
- Upload the filled Excel file
- Review and validate entries
- Create journal vouchers

---

## 📝 Bank Statement Format Requirements

### Standard Format (Recommended):
```csv
Date,Description,Debit,Credit,Balance,Reference
01/04/2024,Salary Credit,,50000,150000,UTR1234567890
02/04/2024,ATM Withdrawal,5000,,145000,CHQ789456
```

### Alternative Column Names Supported:
- **Date**: "Transaction Date", "Value Date", "Posting Date"
- **Description**: "Particulars", "Narration", "Remarks", "Transaction Details"
- **Debit**: "Withdrawal", "Withdraw", "Dr", "Debit Amount"
- **Credit**: "Deposit", "Dep", "Cr", "Credit Amount"
- **Balance**: "Closing Balance", "Running Balance", "Available Balance"
- **Reference**: "Cheque No", "UTR", "Transaction ID", "Ref No"

---

## 💡 How It Works

### Transaction Logic:
1. **Deposits (Credit > 0)**:
   - Bank Account: **DEBIT** (pre-filled)
   - Counter Account: **CREDIT** (blank - you fill)

2. **Withdrawals (Debit > 0)**:
   - Bank Account: **CREDIT** (pre-filled)
   - Counter Account: **DEBIT** (blank - you fill)

### Example:
If you have a ₹50,000 salary credit:
- Bank Account (HDFC Bank): **DEBIT** ₹50,000 ✅ (pre-filled)
- Counter Account: **CREDIT** ₹50,000 (fill with "Salaries and Wages - Indirect")

If you have a ₹5,000 ATM withdrawal:
- Bank Account (HDFC Bank): **CREDIT** ₹5,000 ✅ (pre-filled)
- Counter Account: **DEBIT** ₹5,000 (fill with "Cash on Hand" or appropriate account)

---

## ✅ Benefits

1. **Time Saving**: No need to manually enter bank transactions
2. **Accuracy**: Eliminates manual entry errors
3. **Bulk Processing**: Process hundreds of transactions at once
4. **Flexible**: Works with different bank statement formats
5. **Double Entry Ready**: Pre-filled with correct debit/credit logic

---

## 🐛 Troubleshooting

### Error: "Cannot assign to read only property 'params'"
**Solution**: 
1. Clear Next.js cache: `rm -rf .next`
2. Restart dev server: `npm run dev`

### Parsing Errors:
- Check that your CSV/Excel has proper headers
- Ensure dates are in DD/MM/YYYY format (or recognized format)
- Verify Debit and Credit columns contain numeric values

### Template Not Downloading:
- Check browser console for errors
- Verify bank account is selected
- Ensure transactions were parsed successfully

---

## 📚 Related Features

- **Bulk Journal Upload**: Upload filled templates to create journal entries
- **Bank Reconciliation**: Match bank transactions with book transactions
- **Chart of Accounts**: View all available accounts for counter account selection

---

## 🔗 Quick Links

- **Bulk Journal Page**: `/accounting/journal/bulk`
- **Bank Reconciliation**: `/accounting/bank-reconciliation`
- **Chart of Accounts**: `/accounting/chart-of-accounts`

---

## 📞 Support

If you encounter any issues:
1. Check the browser console for error messages
2. Verify your bank statement format matches supported formats
3. Ensure you have at least one bank account in Chart of Accounts


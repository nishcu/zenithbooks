# AI Usage in ZenithBooks Application

## Overview
ZenithBooks uses **Google Genkit** with **Google AI (Gemini)** for various AI-powered features throughout the application. The AI implementation is centralized in the `src/ai/` directory.

## AI Configuration

### Setup
- **Framework**: Google Genkit
- **Model**: Google AI Gemini 2.5 Flash
- **Configuration File**: `src/ai/genkit.ts`
- **API Key**: Requires `GEMINI_API_KEY` environment variable

### Environment Variable
```bash
GEMINI_API_KEY=your_google_ai_api_key_here
```

## AI Features Implemented

### 1. CMA Report Analysis (`get-cma-observations-flow.ts`)
- **Location**: `src/app/(app)/reports/cma-report/page.tsx`
- **Purpose**: Analyzes Credit Monitoring Arrangement (CMA) reports and provides expert credit analyst observations
- **Features**:
  - Sales growth analysis
  - Profitability margin analysis
  - Liquidity assessment (Current Ratio)
  - Leverage & solvency analysis (Debt-Equity ratio)
  - Debt service capability (DSCR analysis)
  - Overall financial viability recommendation
- **Status**: ✅ Implemented (requires API key)

### 2. HSN Code Suggestion (`suggest-hsn-codes.ts`)
- **Location**: `src/app/(app)/items/suggest-hsn/page.tsx`
- **Purpose**: Suggests appropriate HSN (Harmonized System of Nomenclature) codes for products
- **Features**:
  - Product description analysis
  - HSN code recommendation based on product category
  - GST rate suggestions
- **Status**: ✅ Implemented (requires API key)

### 3. Legal Clauses Suggestion (`suggest-legal-clauses-flow.ts`)
- **Location**: `src/app/(app)/legal-documents/partnership-deed/page.tsx`
- **Purpose**: Suggests appropriate legal clauses for partnership deeds
- **Features**:
  - Context-aware clause suggestions
  - Legal compliance recommendations
- **Status**: ✅ Implemented (requires API key)

### 4. Terms & Conditions Generation (`generate-terms-flow.ts`)
- **Location**: `src/app/(app)/settings/branding/page.tsx`
- **Purpose**: Generates terms and conditions based on company information
- **Features**:
  - Customized terms generation
  - Company-specific clauses
- **Status**: ✅ Implemented (requires API key)

### 5. MOA Objects Generation (`generate-moa-objects-flow.ts`)
- **Location**: `src/app/(app)/legal-documents/moa-aoa/page.tsx`
- **Purpose**: Generates Memorandum of Association (MOA) objects
- **Features**:
  - Business object generation
  - Legal compliance
- **Status**: ✅ Implemented (requires API key)

### 6. ITC Reconciliation (`reconcile-itc-flow.ts`)
- **Location**: `src/app/(app)/reconciliation/itc-reconciliation/page.tsx`
- **Purpose**: AI-powered Input Tax Credit (ITC) reconciliation
- **Features**:
  - Automatic discrepancy detection
  - Reconciliation suggestions
- **Status**: ✅ Implemented (requires API key)

### 7. GSTR Comparison (`compare-gstr-reports.ts`, `compare-gstr-flow.ts`)
- **Location**: `src/app/(app)/reconciliation/gstr-comparison/page.tsx`
- **Purpose**: Compares GSTR-1 and GSTR-3B reports and identifies discrepancies
- **Features**:
  - Automatic discrepancy detection
  - Explanation of discrepancies
  - Recommended actions for compliance
- **Status**: ✅ Implemented (requires API key)

### 8. Invoice Data Extraction (`extract-invoice-data-flow.ts`)
- **Location**: `src/app/(app)/purchases/new/page.tsx`
- **Purpose**: Extracts data from purchase bill/invoice images or PDFs using AI OCR
- **Features**:
  - OCR capabilities - reads text from uploaded invoice images/PDFs
  - Automatic data extraction:
    - Vendor Name (with auto-matching to existing vendors)
    - Invoice/Bill Number
    - Invoice Date
    - Total Amount (with automatic tax calculation)
    - Buyer's GSTIN (with validation)
  - Auto-fills purchase bill form with extracted data
  - Validates GSTIN to ensure invoice belongs to the user's company
- **How to Use**:
  1. Navigate to **Purchases → New Purchase Bill**
  2. Click the **"Read from Bill (AI-OCR)"** button (with wand icon) in the top right
  3. Upload an invoice image (JPG, PNG) or PDF
  4. AI extracts data and auto-fills the form
  5. Review and save the purchase bill
- **Status**: ✅ Implemented (requires API key)

### 9. Logo Analysis (`analyze-logo-flow.ts`)
- **Purpose**: Analyzes company logos for branding purposes
- **Features**:
  - Logo quality assessment
  - Branding recommendations
- **Status**: ✅ Implemented (requires API key)

## How to Verify AI is Working

### 1. Check Environment Variable
```bash
# Check if GEMINI_API_KEY is set
echo $GEMINI_API_KEY  # Linux/Mac
echo %GEMINI_API_KEY% # Windows
```

### 2. Test CMA Report AI
1. Navigate to Reports → CMA Report
2. Generate a CMA report
3. Click on "AI Observations" tab
4. Click "Get AI Observations" button
5. If API key is configured, you should see AI-generated analysis
6. If not configured, you'll see an error message

### 3. Test HSN Code Suggestion
1. Navigate to Items → Suggest HSN
2. Enter a product description
3. Click "Suggest HSN Code"
4. If API key is configured, you should see AI-suggested HSN codes

### 4. Check Console Logs
- Open browser developer tools
- Check console for any AI-related errors
- Look for "Error in getCmaObservationsAction" or similar messages

## Current Status

### ✅ Working (if API key configured)
- All AI flows are properly implemented
- Server actions are correctly set up
- Error handling is in place

### ⚠️ Requires Configuration
- **GEMINI_API_KEY** environment variable must be set
- API key can be obtained from Google AI Studio: https://aistudio.google.com/

### 🔧 Setup Instructions

1. **Get Google AI API Key**:
   - Visit https://aistudio.google.com/
   - Sign in with Google account
   - Create a new API key
   - Copy the API key

2. **Set Environment Variable**:
   - Create `.env.local` file in project root
   - Add: `GEMINI_API_KEY=your_api_key_here`
   - Restart the development server

3. **For Production**:
   - Set environment variable in your hosting platform (Vercel, Firebase, etc.)
   - For Firebase App Hosting, configure in `apphosting.yaml` (already configured)

## Error Handling

If AI features are not working:
1. Check if `GEMINI_API_KEY` is set
2. Verify API key is valid and has quota
3. Check browser console for errors
4. Check server logs for detailed error messages
5. Ensure Genkit server is running (for development)

## Development Commands

```bash
# Start Genkit development server
npm run genkit:dev

# Start Genkit with watch mode
npm run genkit:watch
```

## Files Structure

```
src/
├── ai/
│   ├── genkit.ts                    # AI configuration
│   ├── dev.ts                       # Development server
│   └── flows/
│       ├── get-cma-observations-flow.ts
│       ├── suggest-hsn-codes.ts
│       ├── suggest-legal-clauses-flow.ts
│       ├── generate-terms-flow.ts
│       ├── generate-moa-objects-flow.ts
│       ├── reconcile-itc-flow.ts
│       ├── compare-gstr-reports.ts
│       ├── compare-gstr-flow.ts
│       ├── extract-invoice-data-flow.ts
│       └── analyze-logo-flow.ts
└── app/
    └── (app)/
        ├── reports/
        │   └── cma-report/
        │       ├── page.tsx         # Uses AI
        │       └── actions.ts        # Server action
        ├── items/
        │   └── suggest-hsn/
        │       └── page.tsx          # Uses AI
        └── ...
```

## Summary

- **Total AI Features**: 9
- **Status**: All implemented and ready to use
- **Requirement**: Google AI API key (`GEMINI_API_KEY`)
- **Framework**: Google Genkit with Gemini 2.5 Flash
- **Primary Use Cases**: Financial analysis, legal document generation, tax compliance, data extraction

All AI features are properly integrated and will work once the API key is configured.


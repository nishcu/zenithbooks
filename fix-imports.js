const fs = require('fs');
const path = require('path');

// Files that need to be updated (based on previous bulk update)
const filesToUpdate = [
  'src/app/(app)/accounting/bank-reconciliation/page.tsx',
  'src/app/(app)/legal-documents/loan-agreement/page.tsx',
  'src/components/dashboard/app-downloads.tsx',
  'src/app/(app)/admin/users/page.tsx',
  'src/app/(app)/billing/invoices/voice/page.tsx',
  'src/app/(app)/contact/page.tsx',
  'src/components/vault/share-code-dialog.tsx',
  'src/components/vault/document-upload-dialog.tsx',
  'src/app/vault/access/page.tsx',
  'src/app/(app)/pricing/page.tsx',
  'src/app/(app)/legal-documents/board-resolutions/shifting-of-registered-office/page.tsx',
  'src/app/(app)/legal-documents/board-resolutions/issue-of-share-certificates/page.tsx',
  'src/app/(app)/legal-documents/board-resolutions/borrowing-powers/page.tsx',
  'src/app/(app)/legal-documents/board-resolutions/approval-of-loan/page.tsx',
  'src/app/(app)/legal-documents/board-resolutions/approval-of-annual-accounts/page.tsx',
  'src/app/(app)/legal-documents/board-resolutions/appointment-of-director/page.tsx',
  'src/app/(app)/legal-documents/board-resolutions/opening-of-bank-account/page.tsx',
  'src/app/(app)/legal-documents/board-resolutions/appointment-of-auditor/page.tsx',
  'src/app/(app)/legal-documents/moa-aoa/page.tsx',
  'src/app/(app)/legal-documents/llp-agreement/page.tsx',
  'src/app/(app)/legal-documents/statutory-registers/page.tsx',
  'src/app/(app)/legal-documents/society-registration-deed/page.tsx',
  'src/app/(app)/legal-documents/trust-deed/page.tsx',
  'src/app/(app)/legal-documents/esop-policy/page.tsx',
  'src/app/(app)/legal-documents/shareholders-agreement/page.tsx',
  'src/app/(app)/legal-documents/safe-agreement/page.tsx',
  'src/app/(app)/ca-certificates/visa-immigration/page.tsx',
  'src/app/(app)/ca-certificates/foreign-remittance/page.tsx',
  'src/app/(app)/ca-certificates/net-worth/page.tsx',
  'src/app/(app)/ca-certificates/general-attestation/page.tsx',
  'src/app/(app)/ca-certificates/capital-contribution/page.tsx',
  'src/app/(app)/legal-documents/gst-engagement-letter/page.tsx',
  'src/app/(app)/legal-documents/accounting-engagement-letter/page.tsx',
  'src/app/(app)/legal-documents/franchise-agreement/page.tsx',
  'src/app/(app)/legal-documents/founders-agreement/page.tsx',
  'src/app/(app)/legal-documents/lease-deed/page.tsx',
  'src/app/(app)/legal-documents/rental-deed/page.tsx',
  'src/app/(app)/legal-documents/partnership-deed/page.tsx',
  'src/app/(app)/legal-documents/rental-receipts/page.tsx',
  'src/app/(app)/legal-documents/appointment-letter/page.tsx',
  'src/app/(app)/legal-documents/offer-letter/page.tsx',
  'src/app/(app)/legal-documents/internship-agreement/page.tsx',
  'src/app/(app)/legal-documents/nda/page.tsx',
  'src/app/(app)/legal-documents/vendor-agreement/page.tsx',
  'src/app/(app)/legal-documents/service-agreement/page.tsx',
  'src/app/(app)/legal-documents/self-affidavit-gst/page.tsx',
  'src/app/(app)/legal-documents/consultant-agreement/page.tsx',
  'src/app/(app)/legal-documents/rental-receipt/page.tsx',
  'src/app/(app)/accounting/vouchers/rapid/page.tsx',
  'src/app/(app)/accounting/journal/page.tsx',
  'src/app/(app)/accounting/journal/bulk/page.tsx',
  'src/app/(app)/accounting/books-of-account/page.tsx',
  'src/app/(app)/accounting/ledgers/page.tsx',
  'src/app/(app)/billing/invoices/bulk/page.tsx',
  'src/app/(app)/accounting/chart-of-accounts/page.tsx',
  'src/app/(app)/accounting/financial-statements/profit-and-loss/page.tsx',
  'src/app/(app)/accounting/financial-statements/balance-sheet/page.tsx',
  'src/app/(app)/notices/page.tsx',
  'src/app/(app)/accounting/budgets/page.tsx',
  'src/app/(app)/accounting/trial-balance/page.tsx',
  'src/app/(app)/accounting/vouchers/page.tsx',
  'src/app/(app)/accounting/cost-centre-summary/page.tsx',
  'src/app/(app)/accounting/cost-centres/page.tsx',
  'src/app/(app)/income-tax/advance-tax/page.tsx',
  'src/app/(app)/income-tax/tds-returns/page.tsx',
  'src/app/(app)/gst-filings/gstr-9c-reconciliation/page.tsx',
  'src/app/(app)/gst-filings/gstr-9-wizard/page.tsx',
  'src/components/gst-wizards/gstr1-wizard.tsx',
  'src/app/(app)/gst-filings/gstr-3b-wizard/page.tsx',
  'src/app/(app)/ca-certificates/turnover/page.tsx',
  'src/app/(app)/reports/cma-report/page.tsx',
  'src/hooks/use-certification-request.ts',
  'src/components/social-share-buttons.tsx',
  'src/components/vault/document-version-dialog.tsx',
  'src/components/vault/document-edit-dialog.tsx',
  'src/components/ui/toaster.tsx',
  'src/components/payment/cashfree-checkout.tsx',
  'src/components/layout/user-nav.tsx',
  'src/components/documents/share-buttons.tsx',
  'src/components/documents/export-buttons.tsx',
  'src/components/documents/email-dialog.tsx',
  'src/components/billing/quick-invoice-dialog.tsx',
  'src/app/payment/success/page.tsx',
  'src/app/(app)/vault/sharing/page.tsx',
  'src/app/(app)/vault/settings/page.tsx',
  'src/app/(app)/vault/logs/page.tsx',
  'src/app/(app)/vault/page.tsx',
  'src/app/(app)/settings/users/page.tsx',
  'src/app/(app)/settings/professional-profile/page.tsx',
  'src/app/(app)/settings/branding/page.tsx',
  'src/app/(app)/reconciliation/itc-reconciliation/page.tsx',
  'src/app/(app)/reconciliation/gstr-comparison/page.tsx',
  'src/app/(app)/reconciliation/books-vs-gstr1/page.tsx',
  'src/app/(app)/purchases/rapid/page.tsx',
  'src/app/(app)/purchases/purchase-orders/new/page.tsx',
  'src/app/(app)/purchases/purchase-orders/page.tsx',
  'src/app/(app)/purchases/new/page.tsx',
  'src/app/(app)/purchases/page.tsx',
  'src/app/(app)/payroll/run-payroll/page.tsx',
  'src/app/(app)/payroll/reports/page.tsx',
  'src/app/(app)/payroll/employees/page.tsx',
  'src/app/(app)/parties/bulk/page.tsx',
  'src/app/(app)/parties/page.tsx',
  'src/app/(app)/my-documents/page.tsx',
  'src/app/(app)/items/units/page.tsx',
  'src/app/(app)/items/suggest-hsn/page.tsx',
  'src/app/(app)/items/stock-groups/page.tsx',
  'src/app/(app)/items/godowns/page.tsx',
  'src/app/(app)/items/bulk/page.tsx',
  'src/app/(app)/items/page.tsx',
  'src/app/(app)/income-tax/tds-tcs-reports/page.tsx',
  'src/app/(app)/import-export/page.tsx',
  'src/app/(app)/book-appointment/page.tsx',
  'src/app/(app)/billing/sales-orders/new/page.tsx',
  'src/app/(app)/billing/sales-orders/page.tsx',
  'src/app/(app)/billing/invoices/rapid/page.tsx',
  'src/app/(app)/billing/invoices/new/page.tsx',
  'src/app/(app)/billing/invoices/page.tsx',
  'src/app/(app)/billing/debit-notes/new/page.tsx',
  'src/app/(app)/billing/credit-notes/new/page.tsx',
  'src/app/(app)/admin/subscribers/page.tsx',
  'src/app/(app)/admin/service-pricing/page.tsx',
  'src/app/(app)/admin/professionals/page.tsx',
  'src/app/(app)/admin/notices/page.tsx',
  'src/app/(app)/admin/coupons/page.tsx',
  'src/app/(app)/admin/certification-requests/page.tsx',
  'src/app/(app)/admin/blog/new/page.tsx',
  'src/app/(app)/admin/blog/edit/[id]/page.tsx',
  'src/app/(app)/admin/blog/page.tsx',
  'src/app/(app)/admin/appointments/page.tsx',
];

function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Update import statement
    content = content.replace(
      /import \{ enhancedToast \} from ["']@\/lib\/error-handler["'];/g,
      'import { showEnhancedToast } from "@/lib/error-handler";'
    );

    // Update function calls
    content = content.replace(
      /enhancedToast\(/g,
      'showEnhancedToast('
    );

    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated ${filePath}`);
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
}

// Update files
filesToUpdate.forEach(updateFile);

console.log('\n🎯 Import fix script completed!');
console.log('📝 All enhancedToast references have been updated to showEnhancedToast.');

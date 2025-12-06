const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// List of files with console.error({ pattern
const files = [
  'src/components/gst-wizards/gstr1-wizard.tsx',
  'src/components/billing/add-new-dialogs.tsx',
  'src/app/(app)/accounting/bank-reconciliation/page.tsx',
  'src/components/auth/login-form.tsx',
  'src/app/(app)/reports/cma-report/page.tsx',
  'src/app/(app)/my-documents/page.tsx',
  'src/app/(app)/legal-documents/shareholders-agreement/page.tsx',
  'src/app/(app)/legal-documents/partnership-deed/page.tsx',
  'src/app/(app)/legal-documents/moa-aoa/page.tsx',
  'src/app/(app)/legal-documents/internship-agreement/page.tsx',
  'src/app/(app)/legal-documents/esop-policy/page.tsx',
  'src/app/(app)/legal-documents/appointment-letter/page.tsx',
  'src/app/(app)/items/suggest-hsn/page.tsx',
  'src/app/(app)/ca-certificates/visa-immigration/page.tsx',
  'src/app/(app)/ca-certificates/turnover/page.tsx',
  'src/app/(app)/ca-certificates/net-worth/page.tsx',
  'src/app/(app)/ca-certificates/general-attestation/page.tsx',
  'src/app/(app)/ca-certificates/foreign-remittance/page.tsx',
  'src/app/(app)/ca-certificates/capital-contribution/page.tsx',
  'src/app/(app)/billing/invoices/voice/page.tsx',
  'src/app/(app)/billing/invoices/new/page.tsx',
  'src/app/(app)/billing/invoices/bulk/page.tsx',
  'src/app/(app)/admin/users/page.tsx',
  'src/app/(app)/admin/certification-requests/page.tsx',
  'src/app/(app)/admin/blog/new/page.tsx',
  'src/app/(app)/admin/blog/edit/[id]/page.tsx',
  'src/app/(app)/accounting/ledgers/page.tsx',
  'src/app/(app)/accounting/journal/bulk/page.tsx',
  'src/app/(app)/accounting/books-of-account/page.tsx',
  'src/components/documents/email-dialog.tsx',
  'src/components/billing/quick-invoice-dialog.tsx',
  'src/app/(app)/settings/users/page.tsx',
  'src/app/(app)/reconciliation/itc-reconciliation/page.tsx',
  'src/app/(app)/reconciliation/gstr-comparison/page.tsx',
  'src/app/(app)/purchases/rapid/page.tsx',
  'src/app/(app)/purchases/purchase-orders/new/page.tsx',
  'src/app/(app)/purchases/new/page.tsx',
  'src/app/(app)/parties/page.tsx',
  'src/app/(app)/parties/bulk/page.tsx',
  'src/app/(app)/notices/page.tsx',
  'src/app/(app)/items/bulk/page.tsx',
  'src/app/(app)/import-export/page.tsx',
  'src/app/(app)/gst-filings/gstr-3b-wizard/page.tsx',
  'src/app/(app)/billing/sales-orders/new/page.tsx',
  'src/app/(app)/billing/invoices/rapid/page.tsx',
  'src/app/(app)/billing/invoices/page.tsx',
  'src/app/(app)/billing/debit-notes/new/page.tsx',
  'src/app/(app)/billing/credit-notes/new/page.tsx',
  'src/app/(app)/accounting/vouchers/rapid/page.tsx',
  'src/app/(app)/accounting/vouchers/page.tsx',
  'src/app/(app)/accounting/journal/page.tsx',
  'src/app/(app)/accounting/cost-centre-summary/page.tsx',
  'src/app/(app)/accounting/chart-of-accounts/page.tsx',
  'src/lib/pricing-service.ts',
  'src/components/auth/login-form.tsx.backup',
  'src/app/(app)/accounting/budgets/page.tsx'
];

console.log(`Found ${files.length} files to process`);

let processedCount = 0;
let fixedCount = 0;

for (const file of files) {
  if (!fs.existsSync(file)) continue;

  console.log(`Processing: ${file}`);
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Pattern 1: console.error({ variant: "...", title: "...", description: "..." });
  content = content.replace(
    /console\.error\(\{\s*variant:\s*["']([^"']*)["'],\s*title:\s*["']([^"']*)["'],\s*description:\s*["']([^"']*)["'],\s*\}\);?/g,
    'const { toast } = require("@/hooks/use-toast");\ntoast({\n  variant: "$1",\n  title: "$2",\n  description: "$3",\n});'
  );

  // Pattern 2: console.error({ 'Error message:', error });
  content = content.replace(
    /console\.error\(\{\s*['"]([^'"]*):['"],\s*([^}]+)\s*\}\);?/g,
    'const { toast } = require("@/hooks/use-toast");\ntoast({\n  variant: "destructive",\n  title: "$1",\n  description: $2,\n});'
  );

  // Pattern 3: console.error({ variant: "...", title: "...", description: ... });
  content = content.replace(
    /console\.error\(\{\s*variant:\s*["']([^"']*)["'],\s*title:\s*["']([^"']*)["'],\s*description:\s*([^}]+),\s*\}\);?/g,
    'const { toast } = require("@/hooks/use-toast");\ntoast({\n  variant: "$1",\n  title: "$2",\n  description: $3,\n});'
  );

  // Pattern 4: Simple console.error("message", var);
  content = content.replace(
    /console\.error\(\s*["']([^"']*)["'],\s*([^)]+)\);?/g,
    'const { toast } = require("@/hooks/use-toast");\ntoast({\n  variant: "destructive",\n  title: "$1",\n  description: $2,\n});'
  );

  // Pattern 5: console.error("message");
  content = content.replace(
    /console\.error\(\s*["']([^"']*)["']\);?/g,
    'const { toast } = require("@/hooks/use-toast");\ntoast({\n  variant: "destructive",\n  title: "$1",\n});'
  );

  // Pattern 6: Multi-line object format
  content = content.replace(
    /console\.error\(\{\s*([^}]+)\s*\}\);?/g,
    (match, objContent) => {
      // Try to parse the object content and convert to toast
      const lines = objContent.split(',').map(l => l.trim());
      let variant = 'destructive';
      let title = 'Error';
      let description = '';

      for (const line of lines) {
        if (line.includes('variant:')) {
          const match = line.match(/variant:\s*["']([^"']*)["']/);
          if (match) variant = match[1];
        }
        if (line.includes('title:')) {
          const match = line.match(/title:\s*["']([^"']*)["']/);
          if (match) title = match[1];
        }
        if (line.includes('description:')) {
          const match = line.match(/description:\s*(.+)/);
          if (match) description = match[1];
        }
      }

      return `const { toast } = require("@/hooks/use-toast");\ntoast({\n  variant: "${variant}",\n  title: "${title}",\n  description: ${description},\n});`;
    }
  );

  // If content changed, write it back
  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    fixedCount++;
    console.log(`✓ Fixed ${file}`);
  } else {
    console.log(`- No changes needed for ${file}`);
  }

  processedCount++;
}

console.log(`\nProcessing complete:`);
console.log(`- Files processed: ${processedCount}`);
console.log(`- Files fixed: ${fixedCount}`);
console.log(`- Files unchanged: ${processedCount - fixedCount}`);

const fs = require('fs');
const path = require('path');

// Function to fix a single file
function fixFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Fix specific patterns that are clearly broken

  // Pattern 1: console.error({ variant: "destructive", title: "Error", description: , });
  content = content.replace(
    /console\.error\(\{\s*variant:\s*["']([^"']*)["'],\s*title:\s*["']([^"']*)["'],\s*description:\s*,\s*\}\);?/g,
    'const { toast } = require("@/hooks/use-toast");\ntoast({\n  variant: "$1",\n  title: "$2",\n  description: "An error occurred.",\n});'
  );

  // Pattern 2: console.log({ variant: "...", title: "...", description: "..." });
  content = content.replace(
    /console\.log\(\{\s*variant:\s*["']([^"']*)["'],\s*title:\s*["']([^"']*)["'],\s*description:\s*["']([^"']*)["'],\s*\}\);?/g,
    'const { toast } = require("@/hooks/use-toast");\ntoast({\n  variant: "$1",\n  title: "$2",\n  description: "$3",\n});'
  );

  // Pattern 3: console.error({ title: "...", description: "..." });
  content = content.replace(
    /console\.error\(\{\s*title:\s*["']([^"']*)["'],\s*description:\s*["']([^"']*)["'],\s*\}\);?/g,
    'const { toast } = require("@/hooks/use-toast");\ntoast({\n  title: "$1",\n  description: "$2",\n});'
  );

  // Write back only if changed
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`✓ Fixed ${filePath}`);
    return true;
  }

  return false;
}

// List of files that still have issues
const problemFiles = [
  'src/components/billing/add-new-dialogs.tsx',
  'src/components/documents/email-dialog.tsx',
  'src/components/gst-wizards/gstr1-wizard.tsx',
  'src/lib/pricing-service.ts',
  'src/app/(app)/accounting/bank-reconciliation/page.tsx'
];

let fixedCount = 0;

for (const file of problemFiles) {
  if (fixFile(file)) {
    fixedCount++;
  }
}

console.log(`\nFixed ${fixedCount} files with specific error patterns`);

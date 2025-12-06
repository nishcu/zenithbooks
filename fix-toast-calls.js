#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Function to recursively find all TypeScript/JavaScript files
async function findFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const pattern = `${dir}/**/*{${extensions.join(',')}}`;
  return await glob(pattern, { ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'] });
}

// Function to fix broken console.error calls
function fixConsoleErrorCalls(content) {
  let fixed = content;

  // Pattern 1: console.error({ variant: "destructive" or "default", title: "...", description: "..." });
  // Replace with appropriate toast call
  const consoleErrorPattern = /console\.error\(\s*\{\s*variant:\s*["']([^"']+)["'],\s*title:\s*["']([^"']*)["'],\s*description:\s*["']([^"']*)["'](?:\s*,\s*)?\}\s*\);?/g;

  fixed = fixed.replace(consoleErrorPattern, (match, variant, title, description) => {
    if (variant === 'destructive') {
      // For error toasts, use showErrorToast
      return `showErrorToast("${title}", "${description}");`;
    } else {
      // For other toasts, use the toast function
      return `toast({ variant: "${variant}", title: "${title}", description: "${description}" });`;
    }
  });

  // Pattern 2: console.error({ 'Some label:', error });
  // Replace with console.error for actual error logging
  const consoleErrorObjectPattern = /console\.error\(\s*\{\s*["']([^"']*):["'],\s*([^}]+)\s*\}\s*\);?/g;
  fixed = fixed.replace(consoleErrorObjectPattern, (match, label, error) => {
    return `console.error("${label}", ${error});`;
  });

  return fixed;
}

// Function to add necessary imports if missing
function addToastImports(content, filePath) {
  let fixed = content;

  // Check if we need to add imports
  const hasToastCall = /toast\(\s*\{/.test(fixed);
  const hasShowErrorToastCall = /showErrorToast\(/.test(fixed);

  // Check if imports already exist
  const hasToastImport = /import\s*.*toast.*from/.test(fixed) || /import\s*.*showErrorToast.*from/.test(fixed);

  if ((hasToastCall || hasShowErrorToastCall) && !hasToastImport) {
    // Add import at the top
    const importStatement = `import { toast } from "@/hooks/use-toast";\nimport { showErrorToast } from "@/lib/error-handler";\n`;

    // Find the first import or the top of the file
    const importMatch = fixed.match(/^import\s/m);
    if (importMatch) {
      // Insert after the first import
      const insertIndex = fixed.indexOf('\n', importMatch.index) + 1;
      fixed = fixed.slice(0, insertIndex) + importStatement + fixed.slice(insertIndex);
    } else {
      // Insert at the beginning (after "use client" if present)
      const useClientMatch = fixed.match(/^"use client"\s*\n/);
      if (useClientMatch) {
        const insertIndex = useClientMatch.index + useClientMatch[0].length;
        fixed = fixed.slice(0, insertIndex) + '\n' + importStatement + fixed.slice(insertIndex);
      } else {
        fixed = importStatement + fixed;
      }
    }
  }

  return fixed;
}

// Main function
async function main() {
  const srcDir = './src';

  console.log('🔍 Finding all TypeScript/JavaScript files...');
  const files = await findFiles(srcDir);

  console.log(`📁 Found ${files.length} files to process`);

  let fixedCount = 0;

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const originalContent = content;

      // Fix the console.error calls
      let fixed = fixConsoleErrorCalls(content);

      // Add necessary imports
      fixed = addToastImports(fixed, file);

      // Only write if there were changes
      if (fixed !== originalContent) {
        fs.writeFileSync(file, fixed, 'utf8');
        console.log(`✅ Fixed: ${file}`);
        fixedCount++;
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  }

  console.log(`\n🎉 Fixed ${fixedCount} files!`);
  console.log('\n📋 Summary:');
  console.log('- Converted broken console.error calls to proper toast calls');
  console.log('- Added necessary imports for toast functions');
  console.log('- Error toasts now use showErrorToast()');
  console.log('- Other toasts use the toast() function');
}

main().catch(console.error);

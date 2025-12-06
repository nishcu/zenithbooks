const fs = require('fs');
const path = require('path');

// Contact information to add to error toasts
const CONTACT_INFO = '\n\nPlease take a screenshot and email it to info@zenithbooks.in for faster resolution of queries.';

// Files to update - get all TypeScript/React files
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

const allFiles = getAllFiles('./src');

console.log(`Found ${allFiles.length} TypeScript files to check...`);

allFiles.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Remove showEnhancedToast imports
    const importRegex = /import\s*\{\s*[^}]*showEnhancedToast[^}]*\}\s*from\s*["']@\/lib\/error-handler["'];?/g;
    if (importRegex.test(content)) {
      content = content.replace(importRegex, (match) => {
        // Remove showEnhancedToast from the import
        return match.replace(/showEnhancedToast,?/, '').replace(/,\s*,/, ',').replace(/{\s*,/, '{').replace(/,\s*}/, '}');
      });
      modified = true;
    }

    // Replace showEnhancedToast calls with toast calls + contact info
    const callRegex = /showEnhancedToast\(\s*({[^}]+})\)/g;
    if (callRegex.test(content)) {
      content = content.replace(callRegex, (match, toastOptions) => {
        // Parse the toast options to add contact info for destructive toasts
        return `toast(${toastOptions.replace(/description:\s*["']([^"']*)["']/g, (descMatch, desc) => {
          return `description: "${desc}${CONTACT_INFO}"`;
        })})`;
      });
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Updated ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
});

console.log('\n🎯 Toast import fix script completed!');
console.log('📝 All showEnhancedToast calls have been replaced with regular toast calls.');
console.log('🔍 Check for any syntax errors in the updated files.');

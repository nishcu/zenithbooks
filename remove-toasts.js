const fs = require('fs');
const path = require('path');

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

    // Remove useToast imports
    const importRegex = /import\s*\{\s*[^}]*useToast[^}]*\}\s*from\s*["']@\/hooks\/use-toast["'];?/g;
    if (importRegex.test(content)) {
      content = content.replace(importRegex, '');
      modified = true;
    }

    // Remove showEnhancedToast imports
    const enhancedImportRegex = /import\s*\{\s*[^}]*showEnhancedToast[^}]*\}\s*from\s*["']@\/lib\/error-handler["'];?/g;
    if (enhancedImportRegex.test(content)) {
      content = content.replace(enhancedImportRegex, (match) => {
        // Remove showEnhancedToast from the import while keeping other imports
        return match.replace(/showEnhancedToast,?/, '').replace(/,\s*,/, ',').replace(/{\s*,/, '{').replace(/,\s*}/, '}');
      });
      modified = true;
    }

    // Remove toast destructuring and replace toast calls with console.log
    const toastDestructureRegex = /const\s*\{\s*toast[^}]*\}\s*=\s*useToast\(\);?/g;
    if (toastDestructureRegex.test(content)) {
      content = content.replace(toastDestructureRegex, '');
      modified = true;
    }

    // Replace toast() calls with console.log
    const toastCallRegex = /toast\(\{/g;
    if (toastCallRegex.test(content)) {
      content = content.replace(/toast\(\{/g, 'console.log(');
      content = content.replace(/\}\);/g, ');');
      modified = true;
    }

    // Replace showEnhancedToast calls with console.error
    const enhancedCallRegex = /showEnhancedToast\(\{/g;
    if (enhancedCallRegex.test(content)) {
      content = content.replace(/showEnhancedToast\(\{/g, 'console.error(');
      content = content.replace(/\}\);/g, ');');
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

console.log('\n🎯 Toast removal script completed!');
console.log('📝 All toast calls have been replaced with console logging.');
console.log('🔍 Check for any syntax errors in the updated files.');

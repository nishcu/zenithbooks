const fs = require('fs');
const path = require('path');

// Function to get all TypeScript/React files
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

console.log(`Found ${allFiles.length} TypeScript files to check for remaining syntax errors...`);

allFiles.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Fix any remaining console.log( key: value, ... ) syntax errors
    const consoleLogRegex = /console\.log\(\s*([a-zA-Z_][a-zA-Z0-9_]*:\s*[^,)]+(?:,\s*[a-zA-Z_][a-zA-Z0-9_]*:\s*[^,)]+)*)\s*\)/g;
    if (consoleLogRegex.test(content)) {
      content = content.replace(consoleLogRegex, (match, params) => {
        return `console.log({ ${params} })`;
      });
      modified = true;
    }

    // Fix any remaining console.error( key: value, ... ) syntax errors
    const consoleErrorRegex = /console\.error\(\s*([a-zA-Z_][a-zA-Z0-9_]*:\s*[^,)]+(?:,\s*[a-zA-Z_][a-zA-Z0-9_]*:\s*[^,)]+)*)\s*\)/g;
    if (consoleErrorRegex.test(content)) {
      content = content.replace(consoleErrorRegex, (match, params) => {
        return `console.error({ ${params} })`;
      });
      modified = true;
    }

    // Fix specific cases where the script left broken syntax
    const brokenSyntaxRegex = /(console\.(?:log|error))\(\s*([^}]+?)\s*\);/g;
    if (brokenSyntaxRegex.test(content)) {
      content = content.replace(brokenSyntaxRegex, (match, func, params) => {
        // Only fix if it contains key: value patterns and doesn't already have braces
        if (params.includes(':') && !params.trim().startsWith('{')) {
          return `${func}({ ${params} });`;
        }
        return match;
      });
      modified = true;
    }

    // Fix multiline cases
    const multilineRegex = /(console\.(?:log|error))\(\s*([^}]*?)\s*\)/g;
    if (multilineRegex.test(content)) {
      content = content.replace(multilineRegex, (match, func, params) => {
        const trimmed = params.trim();
        if (trimmed.includes(':') && !trimmed.startsWith('{') && trimmed !== params) {
          return `${func}({ ${params} })`;
        }
        return match;
      });
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed remaining syntax errors in ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
});

console.log('\n🎯 Final syntax error fix script completed!');
console.log('🔍 All syntax errors should now be resolved.');

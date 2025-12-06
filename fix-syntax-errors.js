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

console.log(`Found ${allFiles.length} TypeScript files to check for syntax errors...`);

allFiles.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Fix console.log( key: value, ... ) syntax errors
    const consoleLogRegex = /console\.log\(\s*([a-zA-Z_][a-zA-Z0-9_]*:\s*[^,)]+(?:,\s*[a-zA-Z_][a-zA-Z0-9_]*:\s*[^,)]+)*)\s*\)/g;
    if (consoleLogRegex.test(content)) {
      content = content.replace(consoleLogRegex, (match, params) => {
        return `console.log({ ${params} })`;
      });
      modified = true;
    }

    // Fix console.error( key: value, ... ) syntax errors
    const consoleErrorRegex = /console\.error\(\s*([a-zA-Z_][a-zA-Z0-9_]*:\s*[^,)]+(?:,\s*[a-zA-Z_][a-zA-Z0-9_]*:\s*[^,)]+)*)\s*\)/g;
    if (consoleErrorRegex.test(content)) {
      content = content.replace(consoleErrorRegex, (match, params) => {
        return `console.error({ ${params} })`;
      });
      modified = true;
    }

    // Fix cases where the script left console.log( without closing properly
    const brokenConsoleLogRegex = /console\.log\(\s*([^}]+)\s*\);/g;
    if (brokenConsoleLogRegex.test(content)) {
      content = content.replace(brokenConsoleLogRegex, (match, params) => {
        // Only fix if it contains key: value patterns and doesn't already have braces
        if (params.includes(':') && !params.trim().startsWith('{')) {
          return `console.log({ ${params} });`;
        }
        return match;
      });
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed syntax errors in ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
});

console.log('\n🎯 Syntax error fix script completed!');
console.log('🔍 Check for any remaining syntax errors.');

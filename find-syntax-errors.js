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

console.log(`Checking ${allFiles.length} TypeScript files for syntax errors...`);

let syntaxErrors = [];

allFiles.forEach(filePath => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Check for console.log or console.error that starts with object syntax but doesn't end properly
      if (line.includes('console.log({') || line.includes('console.error({')) {
        const trimmedLine = line.trim();

        // If line contains console.log({ or console.error({ but doesn't end with });
        if ((trimmedLine.includes('console.log({') || trimmedLine.includes('console.error({')) &&
            !trimmedLine.endsWith('});')) {

          // Check if the next few lines complete the statement
          let completeStatement = trimmedLine;
          let lineOffset = 1;

          while (index + lineOffset < lines.length && lineOffset < 5) {
            const nextLine = lines[index + lineOffset].trim();
            completeStatement += ' ' + nextLine;

            if (nextLine.endsWith('});')) {
              break;
            }
            lineOffset++;
          }

          // If we still don't have a complete statement, it's a syntax error
          if (!completeStatement.includes('});')) {
            syntaxErrors.push({
              file: filePath,
              line: index + 1,
              content: trimmedLine
            });
          }
        }
      }
    });
  } catch (error) {
    console.error(`❌ Error reading ${filePath}:`, error.message);
  }
});

if (syntaxErrors.length > 0) {
  console.log('\n🚨 Found syntax errors:');
  syntaxErrors.forEach(error => {
    console.log(`❌ ${error.file}:${error.line} - ${error.content}`);
  });
} else {
  console.log('\n✅ No syntax errors found!');
}

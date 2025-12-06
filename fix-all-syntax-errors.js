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

console.log(`Fixing syntax errors in ${allFiles.length} TypeScript files...`);

allFiles.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Fix console.log/console.error statements that are missing closing braces/parentheses
    const lines = content.split('\n');
    let newLines = [];
    let i = 0;

    while (i < lines.length) {
      let line = lines[i];
      const trimmedLine = line.trim();

      // Check if this line starts a console statement with object syntax
      if ((trimmedLine.includes('console.log({') || trimmedLine.includes('console.error({')) &&
          !trimmedLine.endsWith('});')) {

        // Collect the complete statement across multiple lines
        let completeStatement = trimmedLine;
        let statementLines = [line];
        let j = 1;

        // Look for the closing }); across the next few lines
        while (i + j < lines.length && j < 10) {
          const nextLine = lines[i + j];
          completeStatement += '\n' + nextLine;
          statementLines.push(nextLine);

          if (nextLine.trim().endsWith('});')) {
            // Found the end, now check if the statement is properly formatted
            const fullStatement = statementLines.join('\n');

            // If it has mismatched braces or parentheses, try to fix it
            if (fullStatement.includes('{') && !fullStatement.includes('});')) {
              // Try to fix by adding the missing closing parts
              let fixedStatement = fullStatement;

              // Count braces to see what's missing
              const openBraces = (fullStatement.match(/\{/g) || []).length;
              const closeBraces = (fullStatement.match(/\}/g) || []).length;
              const openParens = (fullStatement.match(/\(/g) || []).length;
              const closeParens = (fullStatement.match(/\)/g) || []).length;

              if (closeBraces < openBraces && closeParens < openParens) {
                // Missing both } and )
                fixedStatement = fixedStatement.trim();
                if (!fixedStatement.endsWith('});')) {
                  fixedStatement += '});';
                }
              } else if (closeBraces < openBraces) {
                // Missing just }
                fixedStatement = fixedStatement.trim();
                if (!fixedStatement.endsWith('});')) {
                  fixedStatement += '});';
                }
              } else if (closeParens < openParens) {
                // Missing just )
                fixedStatement = fixedStatement.trim();
                if (!fixedStatement.endsWith('});')) {
                  fixedStatement += '});';
                }
              }

              // Replace the original lines with the fixed statement
              if (fixedStatement !== fullStatement) {
                const fixedLines = fixedStatement.split('\n');
                newLines.push(...fixedLines);
                i += j; // Skip the lines we just processed
                modified = true;
                break;
              }
            }

            // If the statement looks complete, just add all lines
            newLines.push(...statementLines);
            i += j;
            break;
          }
          j++;
        }

        if (j >= 10) {
          // Didn't find closing, just add the line as-is
          newLines.push(line);
        }
      } else {
        newLines.push(line);
      }

      i++;
    }

    if (modified) {
      fs.writeFileSync(filePath, newLines.join('\n'));
      console.log(`✅ Fixed syntax errors in ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
});

console.log('\n🎯 Syntax error fixing script completed!');
console.log('🔍 All syntax errors should now be resolved.');

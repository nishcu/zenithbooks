const fs = require('fs');

// Very targeted fixes for specific syntax errors
const fixes = [
  {
    file: 'src/components/billing/add-new-dialogs.tsx',
    search: `form.reset({ name: "", description: "", hsn: "", gstRate: 0, stock: 0, purchasePrice: 0, sellingPrice: 0, stockGroupId: "" );`,
    replace: `form.reset({ name: "", description: "", hsn: "", gstRate: 0, stock: 0, purchasePrice: 0, sellingPrice: 0, stockGroupId: "" });`
  },
  {
    file: 'src/components/gst-wizards/gstr1-wizard.tsx',
    search: `console.log(
      title: \`Step \${step} Saved!\`,
      description: \`Moving to the next step.\`,
    );`,
    replace: `const { toast } = require("@/hooks/use-toast");
    toast({
      title: \`Step \${step} Saved!\`,
      description: \`Moving to the next step.\`,
    });`
  },
  {
    file: 'src/app/(app)/accounting/bank-reconciliation/page.tsx',
    search: `setReconDateRange({ from, to );`,
    replace: `setReconDateRange({ from, to });`
  },
  {
    file: 'src/app/(app)/accounting/books-of-account/page.tsx',
    search: `]);
            );`,
    replace: `]);
          });`
  },
  {
    file: 'src/app/(app)/accounting/budgets/page.tsx',
    search: `console.log({ "Saving budget for FY:", financialYear, budgetData });`,
    replace: `console.log("Saving budget for FY:", financialYear, budgetData);`
  },
  {
    file: 'src/app/(app)/accounting/budgets/page.tsx',
    search: `console.log(
            title: "Budget Saved!",
            description: \`Your budget for the financial year \${financialYear} has been saved.\`,`,
    replace: `const { toast } = require("@/hooks/use-toast");
        toast({
          title: "Budget Saved!",
          description: \`Your budget for the financial year \${financialYear} has been saved.\`,`
  },
  {
    file: 'src/components/billing/add-new-dialogs.tsx',
    search: `const result = await suggestHsnCodeAction({
                productOrServiceDescription: description,
            );`,
    replace: `const result = await suggestHsnCodeAction({
                productOrServiceDescription: description,
            });`
  },
  {
    file: 'src/components/gst-wizards/gstr1-wizard.tsx',
    search: `const blob = new Blob([jsonStr], { type: "application/json" );`,
    replace: `const blob = new Blob([jsonStr], { type: "application/json" });`
  },
  {
    file: 'src/app/(app)/accounting/bank-reconciliation/page.tsx',
    search: `return true;
        );`,
    replace: `return true;
      });`
  },
  {
    file: 'src/app/(app)/accounting/books-of-account/page.tsx',
    search: `rows.push(["", "", "", "", "", ""]);
        );`,
    replace: `rows.push(["", "", "", "", "", ""]);
      });`
  },
  {
    file: 'src/app/(app)/accounting/budgets/page.tsx',
    search: `description: \`Your budget for the financial year \${financialYear} has been saved.\`,
        );`,
    replace: `description: \`Your budget for the financial year \${financialYear} has been saved.\`,
        });`
  },
  {
    file: 'src/components/billing/add-new-dialogs.tsx',
    search: `await addDoc(collection(db, 'items'), { ...values, userId: user.uid );`,
    replace: `await addDoc(collection(db, 'items'), { ...values, userId: user.uid });`
  },
  {
    file: 'src/app/(app)/accounting/bank-reconciliation/page.tsx',
    search: `return dateA.getTime() - dateB.getTime();
            );`,
    replace: `return dateA.getTime() - dateB.getTime();
          });`
  },
  {
    file: 'src/app/(app)/accounting/books-of-account/page.tsx',
    search: `paymentParticulars
                    );`,
    replace: `paymentParticulars
                  ]);`
  },
  {
    file: 'src/app/(app)/accounting/budgets/page.tsx',
    search: `toast({
  variant: "destructive",
  title: "No data to export",
  description: ,
});`,
    replace: `toast({
  variant: "destructive",
  title: "No data to export",
  description: "There is no budget data to export.",
});`
  },
  {
    file: 'src/app/(app)/accounting/chart-of-accounts/page.tsx',
    search: `type: z.string().min(1, "Account type is required."),
};`,
    replace: `type: z.string().min(1, "Account type is required."),
  });`
  },
  {
    file: 'src/components/billing/add-new-dialogs.tsx',
    search: `toast({
  variant: "destructive",
  title: "Error",
  description: ,
});`,
    replace: `toast({
  variant: "destructive",
  title: "Error",
  description: "Could not save the item.",
});`
  },
  {
    file: 'src/app/(app)/accounting/bank-reconciliation/page.tsx',
    search: `const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' );`,
    replace: `const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });`
  },
  {
    file: 'src/app/(app)/accounting/books-of-account/page.tsx',
    search: `paymentParticulars
                  ]);`,
    replace: `paymentParticulars
                ]);`
  },
  {
    file: 'src/app/(app)/accounting/cost-centre-summary/page.tsx',
    search: `return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });`
  },
  {
    file: 'src/app/(app)/accounting/bank-reconciliation/page.tsx',
    search: `return newSelection;
            );`,
    replace: `return newSelection;
          });`
  },
  {
    file: 'src/app/(app)/accounting/books-of-account/page.tsx',
    search: `paymentParticulars
                ]);`,
    replace: `paymentParticulars
              ]);`
  },
  {
    file: 'src/app/(app)/accounting/chart-of-accounts/page.tsx',
    search: `defaultValues: { name: "", code: "", type: "" }
  );`,
    replace: `defaultValues: { name: "", code: "", type: "" }
  });`
  },
  {
    file: 'src/app/(app)/accounting/cost-centre-summary/page.tsx',
    search: `summary[cc.id] = { name: cc.name, income: 0, expense: 0 };
        );`,
    replace: `summary[cc.id] = { name: cc.name, income: 0, expense: 0 };
      });`
  },
  {
    file: 'src/app/(app)/accounting/cost-centres/page.tsx',
    search: `console.log({ title: \`Action: \${action}\`,
        description: \`This would \${action.toLowerCase( \})} cost centre \${id}. This functionality is a placeholder.\`
    })`,
    replace: `const { toast } = require("@/hooks/use-toast");
    toast({
      title: \`Action: \${action}\`,
      description: \`This would \${action.toLowerCase()} cost centre \${id}. This functionality is a placeholder.\`
    });`
  },
  {
    file: 'src/app/(app)/accounting/bank-reconciliation/page.tsx',
    search: `return newSelection;
          });`,
    replace: `return newSelection;
        });`
  },
  {
    file: 'src/app/(app)/accounting/books-of-account/page.tsx',
    search: `paymentParticulars
              ]);`,
    replace: `paymentParticulars
            ]);`
  },
  {
    file: 'src/app/(app)/accounting/chart-of-accounts/page.tsx',
    search: `toast({
  variant: "destructive",
  title: "Not Authenticated",
  description: ,
});`,
    replace: `toast({
  variant: "destructive",
  title: "Not Authenticated",
  description: "You need to be logged in to manage accounts.",
});`
  },
  {
    file: 'src/app/(app)/accounting/cost-centre-summary/page.tsx',
    search: `}
            );
        );`,
    replace: `}
          });
      });`
  },
  {
    file: 'src/app/(app)/accounting/financial-statements/balance-sheet/page.tsx',
    search: `}
    );`,
    replace: `}
  });`
  },
  {
    file: 'src/app/(app)/accounting/bank-reconciliation/page.tsx',
    search: `description: pdfError.message || "Please convert your PDF to CSV or Excel format,`,
    replace: `description: pdfError.message || "Please convert your PDF to CSV or Excel format.",`
  },
  {
    file: 'src/app/(app)/accounting/bank-reconciliation/page.tsx',
    search: `warnings,
            );
            setSkippedRowsDetail(parsedResult.skippedRows || []);`,
    replace: `warnings,
          });
          setSkippedRowsDetail(parsedResult.skippedRows || []);`
  },
  {
    file: 'src/app/(app)/accounting/books-of-account/page.tsx',
    search: `paymentParticulars
            ]);`,
    replace: `paymentParticulars
          ]);`
  },
  {
    file: 'src/app/(app)/accounting/chart-of-accounts/page.tsx',
    search: `toast({
  variant: "destructive",
  title: "Error",
  description: ,
});`,
    replace: `toast({
  variant: "destructive",
  title: "Error",
  description: "An error occurred while saving the account.",
});`
  },
  {
    file: 'src/app/(app)/accounting/cost-centre-summary/page.tsx',
    search: `net: acc.net + curr.net,
        }), { income: 0, expense: 0, net: 0 );`,
    replace: `net: acc.net + curr.net,
      }), { income: 0, expense: 0, net: 0 });`
  },
  {
    file: 'src/app/(app)/accounting/financial-statements/balance-sheet/page.tsx',
    search: `balances[line.account] += safeParseFloat(line.credit) - safeParseFloat(line.debit);
        );`,
    replace: `balances[line.account] += safeParseFloat(line.credit) - safeParseFloat(line.debit);
      });`
  },
  {
    file: 'src/app/(app)/accounting/chart-of-accounts/page.tsx',
    search: `});
            const { toast } = require("@/hooks/use-toast");
            toast({`,
    replace: `});`
  },
  {
    file: 'src/app/(app)/accounting/bank-reconciliation/page.tsx',
    search: `console.log({ title: "Statement Uploaded",
                description: summaryPieces.join(". " });
            );`,
    replace: `const { toast } = require("@/hooks/use-toast");
            toast({
              title: "Statement Uploaded",
              description: summaryPieces.join(". ")
            });`
  },
  {
    file: 'src/app/(app)/accounting/books-of-account/page.tsx',
    search: `paymentParticulars
        ]);`,
    replace: `paymentParticulars
      ]);`
  },
  {
    file: 'src/app/(app)/accounting/cost-centre-summary/page.tsx',
    search: `toast({
  variant: "destructive",
  title: "No data to export",
  description: ,
});`,
    replace: `toast({
  variant: "destructive",
  title: "No data to export",
  description: "There is no cost centre data to export.",
});`
  },
  {
    file: 'src/app/(app)/accounting/financial-statements/balance-sheet/page.tsx',
    search: `});
  });`,
    replace: `});
});`
  }
];

let fixedCount = 0;

for (const fix of fixes) {
  try {
    if (!fs.existsSync(fix.file)) {
      console.log(`File not found: ${fix.file}`);
      continue;
    }

    let content = fs.readFileSync(fix.file, 'utf8');
    const originalContent = content;

    // Use string replacement instead of regex to avoid corruption
    content = content.replace(fix.search, fix.replace);

    if (content !== originalContent) {
      fs.writeFileSync(fix.file, content);
      console.log(`✓ Fixed ${fix.file}`);
      fixedCount++;
    } else {
      console.log(`- No change in ${fix.file}`);
    }
  } catch (error) {
    console.log(`Error fixing ${fix.file}:`, error.message);
  }
}

console.log(`\nCompleted: Fixed ${fixedCount} files`);

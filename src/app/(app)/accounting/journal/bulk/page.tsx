
"use client";

import { useState, useMemo, useEffect } from "react";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
    Upload, 
    FileSpreadsheet, 
    Download, 
    CheckCircle2, 
    XCircle, 
    AlertCircle, 
    Loader2,
    BookOpen,
    Info,
    FileText,
    PlusCircle,
    Building2
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useContext } from "react";
import { AccountingContext } from "@/context/accounting-context";
import { allAccounts } from "@/lib/accounts";
import { useAuthState } from "react-firebase-hooks/auth";
import { useCollection, useDocumentData } from "react-firebase-hooks/firestore";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import { UpgradeRequiredAlert } from "@/components/upgrade-required-alert";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { formatExcelFromJson } from "@/lib/export-utils";
import { generateAutoNarration, shouldAutoGenerateNarration } from "@/lib/narration-generator";
import type { BankTransaction } from "@/lib/bank-statement-parser";

interface BulkJournalEntry {
    date: string;
    amount: number;
    debitAccount: string; // Can be account name or code (will be converted to code during validation)
    creditAccount: string; // Can be account name or code (will be converted to code during validation)
    narration: string;
    status?: 'valid' | 'error';
    error?: string;
    originalDebitAccount?: string; // Store original name for display
    originalCreditAccount?: string; // Store original name for display
}

interface AccountMatch {
    code: string;
    name: string;
    type: 'exact' | 'partial' | 'fuzzy';
}

interface MatchConfirmation {
    originalName: string;
    selectedCode: string;
    selectedName: string;
}

// Accounting Rules Guide
const accountingRules = [
    {
        category: "Assets",
        rule: "Debit to Increase, Credit to Decrease",
        examples: [
            { transaction: "Purchase of Equipment", debit: "Equipment (Fixed Asset)", credit: "Bank/Cash" },
            { transaction: "Cash Received", debit: "Cash/Bank", credit: "Customer Account" },
            { transaction: "Inventory Purchase", debit: "Inventory", credit: "Bank/Creditor" },
        ]
    },
    {
        category: "Liabilities",
        rule: "Credit to Increase, Debit to Decrease",
        examples: [
            { transaction: "Loan Taken", debit: "Bank", credit: "Loan Account" },
            { transaction: "Purchase on Credit", debit: "Purchases/Expense", credit: "Creditor Account" },
            { transaction: "Loan Repayment", debit: "Loan Account", credit: "Bank" },
        ]
    },
    {
        category: "Equity",
        rule: "Credit to Increase, Debit to Decrease",
        examples: [
            { transaction: "Capital Introduced", debit: "Bank/Cash", credit: "Owner's Equity" },
            { transaction: "Drawings", debit: "Drawings", credit: "Bank/Cash" },
            { transaction: "Profit Transfer", debit: "Profit & Loss", credit: "Retained Earnings" },
        ]
    },
    {
        category: "Revenue/Income",
        rule: "Credit to Increase, Debit to Decrease",
        examples: [
            { transaction: "Sale Made", debit: "Customer Account/Bank", credit: "Sales Revenue" },
            { transaction: "Interest Received", debit: "Bank", credit: "Interest Income" },
            { transaction: "Service Rendered", debit: "Customer Account/Bank", credit: "Service Revenue" },
        ]
    },
    {
        category: "Expenses",
        rule: "Debit to Increase, Credit to Decrease",
        examples: [
            { transaction: "Salary Paid", debit: "Salaries Expense", credit: "Bank" },
            { transaction: "Rent Paid", debit: "Rent Expense", credit: "Bank" },
            { transaction: "Purchase of Goods", debit: "Purchases", credit: "Bank/Creditor" },
        ]
    },
    {
        category: "Common Transactions",
        rule: "Double Entry Principle",
        examples: [
            { transaction: "Payment to Supplier", debit: "Creditor Account", credit: "Bank" },
            { transaction: "Receipt from Customer", debit: "Bank", credit: "Customer Account" },
            { transaction: "GST on Sale", debit: "Customer Account", credit: "Sales Revenue + GST Payable" },
            { transaction: "Depreciation", debit: "Depreciation Expense", credit: "Accumulated Depreciation" },
        ]
    }
];

export default function BulkJournalEntryPage() {
    // ALL HOOKS MUST BE CALLED UNCONDITIONALLY AT THE TOP LEVEL
    const { toast } = useToast();
    const accountingContext = useContext(AccountingContext);
    const [user] = useAuthState(auth);
    const userDocRef = user ? doc(db, 'users', user.uid) : null;
    const [userData] = useDocumentData(userDocRef);
    const subscriptionPlan = userData?.subscriptionPlan || 'freemium';
    const isFreemium = subscriptionPlan === 'freemium';

    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [parsedEntries, setParsedEntries] = useState<BulkJournalEntry[]>([]);
    const [defaultDate, setDefaultDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [matchDialogOpen, setMatchDialogOpen] = useState(false);
    const [pendingMatches, setPendingMatches] = useState<{ accountName: string; matches: AccountMatch[]; onConfirm: (code: string, name: string) => void; currentIndex: number; totalCount: number } | null>(null);
    const [confirmedMatches, setConfirmedMatches] = useState<Map<string, MatchConfirmation>>(new Map());
    const [pendingEntries, setPendingEntries] = useState<BulkJournalEntry[]>([]);
    const [pendingAccountsMap, setPendingAccountsMap] = useState<Map<string, AccountMatch[]>>(new Map());
    const [allPendingKeys, setAllPendingKeys] = useState<string[]>([]);
    const [totalAccountsNeedingMatch, setTotalAccountsNeedingMatch] = useState(0);
    const [confirmedAccountsCount, setConfirmedAccountsCount] = useState(0);

    // Bank Statement Converter state
    const [bankStatementFile, setBankStatementFile] = useState<File | null>(null);
    const [isParsingBankStatement, setIsParsingBankStatement] = useState(false);
    const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
    const [bankStatementErrors, setBankStatementErrors] = useState<any[]>([]);
    const [selectedBankAccount, setSelectedBankAccount] = useState<string>("");
    const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false);

    // Fetch customers and vendors for account validation
    const customersQuery = user ? query(collection(db, 'customers'), where("userId", "==", user.uid)) : null;
    const [customersSnapshot] = useCollection(customersQuery);
    const customers = useMemo(() => customersSnapshot?.docs.map(doc => ({ id: doc.id, name: doc.data().name })) || [], [customersSnapshot]);

    const vendorsQuery = user ? query(collection(db, 'vendors'), where("userId", "==", user.uid)) : null;
    const [vendorsSnapshot] = useCollection(vendorsQuery);
    const vendors = useMemo(() => vendorsSnapshot?.docs.map(doc => ({ id: doc.id, name: doc.data().name })) || [], [vendorsSnapshot]);

    // Fetch user accounts for bank account selection
    const userAccountsQuery = user ? query(collection(db, 'user_accounts'), where("userId", "==", user.uid)) : null;
    const [userAccountsSnapshot] = useCollection(userAccountsQuery);
    const userAccounts = useMemo(() => 
        userAccountsSnapshot?.docs.map((doc: any) => ({
            id: doc.id,
            code: doc.data().code,
            name: doc.data().name,
            type: doc.data().type,
        })) || [], 
        [userAccountsSnapshot]
    );

    // Combined accounts (system + user accounts)
    const combinedAccounts = useMemo(() => [...allAccounts, ...userAccounts], [userAccounts]);

    // Bank accounts for dropdown
    const bankAccounts = useMemo(() => {
        return combinedAccounts.filter(acc => acc.type === 'Bank').map(acc => ({
            code: acc.code,
            name: acc.name,
        }));
    }, [combinedAccounts]);

    // Auto-select bank account if only one available
    useEffect(() => {
        if (bankAccounts.length === 1 && !selectedBankAccount) {
            setSelectedBankAccount(bankAccounts[0].name);
        }
    }, [bankAccounts.length, selectedBankAccount]);

    // Get all valid account codes - MUST BE CALLED BEFORE EARLY RETURN
    const validAccountCodes = useMemo(() => {
        const accountCodes = new Set(allAccounts.map(acc => acc.code));
        customers.forEach(c => accountCodes.add(c.id));
        vendors.forEach(v => accountCodes.add(v.id));
        return accountCodes;
    }, [customers, vendors]);

    // Early return AFTER all hooks are called
    if (user && isFreemium) {
        return (
            <div className="space-y-8 p-8">
                <h1 className="text-3xl font-bold">Bulk Journal Entry</h1>
                <UpgradeRequiredAlert
                    featureName="Bulk Journal Entry"
                    description="Upload multiple journal entries at once using Excel/CSV files with a Business or Professional plan."
                    backHref="/accounting/journal"
                    backLabel="Back to Journal"
                />
            </div>
        );
    }

    // Get account name by code
    const getAccountName = (code: string): string => {
        const account = allAccounts.find(acc => acc.code === code);
        if (account) return account.name;
        const customer = customers.find(c => c.id === code);
        if (customer) return customer.name;
        const vendor = vendors.find(v => v.id === code);
        if (vendor) return vendor.name;
        return code;
    };

    // Find possible account matches (exact, partial, fuzzy)
    const findAccountMatches = (name: string): AccountMatch[] => {
        if (!name || !name.trim()) return [];
        
        const normalizedName = name.trim().toLowerCase();
        const matches: AccountMatch[] = [];
        
        // 1. Try exact match (case-insensitive)
        let account = allAccounts.find(acc => acc.name.toLowerCase() === normalizedName);
        if (account) {
            matches.push({ code: account.code, name: account.name, type: 'exact' });
        }
        
        let customer = customers.find(c => c.name.toLowerCase() === normalizedName);
        if (customer) {
            matches.push({ code: customer.id, name: customer.name, type: 'exact' });
        }
        
        let vendor = vendors.find(v => v.name.toLowerCase() === normalizedName);
        if (vendor) {
            matches.push({ code: vendor.id, name: vendor.name, type: 'exact' });
        }
        
        // If exact match found, return only that
        if (matches.length > 0) return matches;
        
        // 2. Try partial match (contains)
        allAccounts.forEach(acc => {
            const accNameLower = acc.name.toLowerCase();
            if (accNameLower.includes(normalizedName) || normalizedName.includes(accNameLower)) {
                matches.push({ code: acc.code, name: acc.name, type: 'partial' });
            }
        });
        
        customers.forEach(c => {
            const cNameLower = c.name.toLowerCase();
            if (cNameLower.includes(normalizedName) || normalizedName.includes(cNameLower)) {
                matches.push({ code: c.id, name: c.name, type: 'partial' });
            }
        });
        
        vendors.forEach(v => {
            const vNameLower = v.name.toLowerCase();
            if (vNameLower.includes(normalizedName) || normalizedName.includes(vNameLower)) {
                matches.push({ code: v.id, name: v.name, type: 'partial' });
            }
        });
        
        // 3. Try fuzzy match (simple similarity - check if most words match)
        if (matches.length === 0) {
            const inputWords = normalizedName.split(/\s+/).filter(w => w.length > 2);
            allAccounts.forEach(acc => {
                const accWords = acc.name.toLowerCase().split(/\s+/);
                const matchingWords = inputWords.filter(w => accWords.some(aw => aw.includes(w) || w.includes(aw)));
                if (matchingWords.length >= Math.ceil(inputWords.length * 0.5)) {
                    matches.push({ code: acc.code, name: acc.name, type: 'fuzzy' });
                }
            });
        }
        
        // 4. If it's already a code
        if (validAccountCodes.has(name.trim())) {
            const code = name.trim();
            const accountName = getAccountName(code);
            matches.push({ code, name: accountName, type: 'exact' });
        }
        
        // Return top 5 matches
        return matches.slice(0, 5);
    };

    // Get account code by name (with confirmed matches support)
    const getAccountCodeByName = (name: string): string | null => {
        if (!name || !name.trim()) return null;
        
        const normalizedName = name.trim().toLowerCase();
        
        // Try exact match first
        let account = allAccounts.find(acc => acc.name.toLowerCase() === normalizedName);
        if (account) return account.code;
        
        let customer = customers.find(c => c.name.toLowerCase() === normalizedName);
        if (customer) return customer.id;
        
        let vendor = vendors.find(v => v.name.toLowerCase() === normalizedName);
        if (vendor) return vendor.id;
        
        if (validAccountCodes.has(name.trim())) {
            return name.trim();
        }
        
        return null;
    };

    const handleDownloadTemplate = () => {
        const templateData = [
            {
                Date: defaultDate,
                Amount: 10000,
                DebitAccount: "Cash on Hand",
                CreditAccount: "Sales Revenue",
                Narration: "Sample: Sale made for cash"
            },
            {
                Date: defaultDate,
                Amount: 5000,
                DebitAccount: "Salaries and Wages - Indirect",
                CreditAccount: "HDFC Bank",
                Narration: "Sample: Salary paid from bank"
            }
        ];

        const ws = XLSX.utils.json_to_sheet(templateData);
        
        // Apply formatting for print-ready output
        formatExcelFromJson(ws, templateData);
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Journal Entries");
        
        // Add instructions sheet
        const instructions = [
            { Column: "Date", Description: "Transaction date in YYYY-MM-DD format (e.g., 2024-01-15)" },
            { Column: "Amount", Description: "Transaction amount (numeric value, no currency symbols)" },
            { Column: "DebitAccount", Description: "Account name or ledger name to debit (e.g., 'Cash on Hand', 'HDFC Bank', 'Salaries and Wages - Indirect', or customer/vendor name)" },
            { Column: "CreditAccount", Description: "Account name or ledger name to credit (e.g., 'Sales Revenue', 'Service Revenue', or customer/vendor name)" },
            { Column: "Narration", Description: "Description of the transaction" }
        ];
        const wsInstructions = XLSX.utils.json_to_sheet(instructions);
        formatExcelFromJson(wsInstructions, instructions);
        XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");
        
        XLSX.writeFile(wb, "bulk-journal-entries-template.xlsx");
        toast({
            title: "Template Downloaded",
            description: "Template file has been downloaded. Use account names or ledger names (not codes). Fill in your journal entries and upload.",
        });
    };

    const parseCSV = (text: string): BulkJournalEntry[] => {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) return [];

        // Detect header row
        const headerLine = lines[0].toLowerCase();
        const hasHeader = headerLine.includes('date') && (headerLine.includes('amount') || headerLine.includes('debit') || headerLine.includes('credit'));

        const dataLines = hasHeader ? lines.slice(1) : lines;
        const entries: BulkJournalEntry[] = [];

            dataLines.forEach((line, index) => {
            if (!line.trim()) return;

            // Handle CSV with quotes
            const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            
            if (values.length < 4) return;

            let date = values[0] || defaultDate;
            let amount = parseFloat(values[1]?.replace(/[₹,]/g, '') || '0');
            let debitAccount = values[2]?.trim() || '';
            let creditAccount = values[3]?.trim() || '';
            let narration = values[4]?.trim() || 'Journal Entry';

            // Validate date format
            if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                date = defaultDate;
            }

            entries.push({
                date,
                amount,
                debitAccount,
                creditAccount,
                narration,
                originalDebitAccount: debitAccount, // Store original for display
                originalCreditAccount: creditAccount, // Store original for display
            });
        });

        return entries;
    };

    const parseExcel = (file: File): Promise<BulkJournalEntry[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);

                    const entries: BulkJournalEntry[] = jsonData.map((row: any) => {
                        const date = row.Date || row.date || defaultDate;
                        const amount = parseFloat(String(row.Amount || row.amount || 0).replace(/[₹,]/g, ''));
                        const debitAccount = String(row.DebitAccount || row.debitAccount || row['Debit Account'] || '').trim();
                        const creditAccount = String(row.CreditAccount || row.creditAccount || row['Credit Account'] || '').trim();
                        const narration = String(row.Narration || row.narration || 'Journal Entry').trim();

                        return {
                            date: date.toString().match(/^\d{4}-\d{2}-\d{2}$/) ? date : defaultDate,
                            amount: isNaN(amount) ? 0 : amount,
                            debitAccount,
                            creditAccount,
                            narration: narration || 'Journal Entry',
                            originalDebitAccount: debitAccount, // Store original for display
                            originalCreditAccount: creditAccount, // Store original for display
                        };
                    });

                    resolve(entries);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    };

    const validateEntries = (entries: BulkJournalEntry[]): BulkJournalEntry[] => {
        return entries.map((entry, index) => {
            const errors: string[] = [];

            // Validate amount
            if (!entry.amount || entry.amount <= 0) {
                errors.push("Amount must be greater than zero");
            }

            // Convert account names to codes and validate using confirmed matches
            let debitAccountCode: string | null = null;
            let creditAccountCode: string | null = null;

            // Check confirmed matches first
            const debitCacheKey = `${entry.debitAccount?.toLowerCase().trim()}_debit_${index}`;
            const creditCacheKey = `${entry.creditAccount?.toLowerCase().trim()}_credit_${index}`;
            
            // Try confirmed match first
            if (confirmedMatches.has(debitCacheKey)) {
                debitAccountCode = confirmedMatches.get(debitCacheKey)!.selectedCode;
            } else if (entry.debitAccount) {
                debitAccountCode = getAccountCodeByName(entry.debitAccount);
            }

            // Try confirmed match first for credit
            if (confirmedMatches.has(creditCacheKey)) {
                creditAccountCode = confirmedMatches.get(creditCacheKey)!.selectedCode;
            } else if (entry.creditAccount) {
                creditAccountCode = getAccountCodeByName(entry.creditAccount);
            }

            // Validate debit account
            if (!entry.debitAccount) {
                errors.push("Debit account is required");
            } else if (!debitAccountCode) {
                // Check if there are possible matches
                const matches = findAccountMatches(entry.debitAccount);
                if (matches.length > 0) {
                    errors.push(`Debit account "${entry.debitAccount}" needs confirmation. Please check matches above.`);
                } else {
                    errors.push(`Invalid debit account: "${entry.debitAccount}". No matching account found.`);
                }
            }

            // Validate credit account
            if (!entry.creditAccount) {
                errors.push("Credit account is required");
            } else if (!creditAccountCode) {
                const matches = findAccountMatches(entry.creditAccount);
                if (matches.length > 0) {
                    errors.push(`Credit account "${entry.creditAccount}" needs confirmation. Please check matches above.`);
                } else {
                    errors.push(`Invalid credit account: "${entry.creditAccount}". No matching account found.`);
                }
            }

            // Validate same account not debited and credited
            if (debitAccountCode && creditAccountCode && debitAccountCode === creditAccountCode) {
                errors.push("Debit and credit accounts cannot be the same");
            }

            // Validate date
            if (!entry.date || !entry.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                errors.push("Invalid date format. Use YYYY-MM-DD");
            }

            return {
                ...entry,
                originalDebitAccount: entry.originalDebitAccount || entry.debitAccount, // Preserve original name
                originalCreditAccount: entry.originalCreditAccount || entry.creditAccount, // Preserve original name
                debitAccount: debitAccountCode || entry.debitAccount, // Store code for processing
                creditAccount: creditAccountCode || entry.creditAccount, // Store code for processing
                status: errors.length === 0 && debitAccountCode && creditAccountCode ? 'valid' : 'error',
                error: errors.join('; '),
            };
        });
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setIsProcessing(true);

        try {
            let entries: BulkJournalEntry[] = [];

            if (selectedFile.name.endsWith('.csv')) {
                const text = await selectedFile.text();
                entries = parseCSV(text);
            } else if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
                entries = await parseExcel(selectedFile);
            } else {
                toast({
                    variant: "destructive",
                    title: "Invalid File Type",
                    description: "Please upload a CSV or Excel file (.csv, .xlsx, .xls)",
                });
                setIsProcessing(false);
                return;
            }

            if (entries.length === 0) {
                toast({
                    variant: "destructive",
                    title: "No Entries Found",
                    description: "The file appears to be empty or in an incorrect format.",
                });
                setIsProcessing(false);
                return;
            }

            // Find all accounts that need matching confirmation
            const accountsNeedingMatch = new Map<string, AccountMatch[]>();
            entries.forEach((entry, index) => {
                // Check debit account
                if (entry.debitAccount && !getAccountCodeByName(entry.debitAccount)) {
                    const matches = findAccountMatches(entry.debitAccount);
                    if (matches.length > 0) {
                        accountsNeedingMatch.set(`debit_${index}_${entry.debitAccount}`, matches);
                    }
                }
                // Check credit account
                if (entry.creditAccount && !getAccountCodeByName(entry.creditAccount)) {
                    const matches = findAccountMatches(entry.creditAccount);
                    if (matches.length > 0) {
                        accountsNeedingMatch.set(`credit_${index}_${entry.creditAccount}`, matches);
                    }
                }
            });

            // If there are accounts needing confirmation, show dialog
            if (accountsNeedingMatch.size > 0) {
                // Store entries and matches for later processing
                setParsedEntries(entries.map(e => ({ ...e, status: 'error' as const, error: 'Pending account confirmation' })));
                // Show first match dialog
                const firstKey = Array.from(accountsNeedingMatch.keys())[0];
                // Key format: "debit_0_Account Name" or "credit_1_Account Name"
                const parts = firstKey.split('_');
                const type = parts[0];
                const index = parts[1];
                const accountName = parts.slice(2).join('_'); // Rejoin in case account name has underscores
                const isDebit = type === 'debit';
                const entryIndex = parseInt(index);
                const matches = accountsNeedingMatch.get(firstKey)!;
                
                // Store entries and matches for later processing
                setPendingEntries(entries);
                setPendingAccountsMap(accountsNeedingMatch);
                setAllPendingKeys(Array.from(accountsNeedingMatch.keys()));
                
                // Set total count and reset confirmed count
                const totalCount = accountsNeedingMatch.size;
                setTotalAccountsNeedingMatch(totalCount);
                setConfirmedAccountsCount(0);
                
                setPendingMatches({
                    accountName: accountName,
                    matches,
                    currentIndex: 1,
                    totalCount: totalCount,
                    onConfirm: (code: string, selectedName: string) => {
                        const cacheKey = `${accountName.toLowerCase()}_${isDebit ? 'debit' : 'credit'}_${entryIndex}`;
                        
                        // Update confirmed matches using setter
                        setConfirmedMatches(prev => {
                            const newMap = new Map(prev);
                            newMap.set(cacheKey, {
                                originalName: accountName,
                                selectedCode: code,
                                selectedName
                            });
                            return newMap;
                        });
                        
                        // Update confirmed count
                        setConfirmedAccountsCount(prev => prev + 1);
                        
                        setMatchDialogOpen(false);
                        setPendingMatches(null);
                        
                        // Process remaining matches or validate
                        const remainingKeys = Array.from(accountsNeedingMatch.keys()).slice(1);
                        if (remainingKeys.length > 0) {
                            setTimeout(() => {
                                processRemainingMatches(entries, accountsNeedingMatch, remainingKeys, 1, totalCount);
                            }, 100);
                        } else {
                            // All matches confirmed, validate entries
                            setTimeout(() => {
                                finalizeValidation(entries);
                            }, 100);
                        }
                    }
                });
                setMatchDialogOpen(true);
                setIsProcessing(false);
                return;
            }

            // No matches needed, validate directly
            const validatedEntries = validateEntries(entries);
            setParsedEntries(validatedEntries);

            const validCount = validatedEntries.filter(e => e.status === 'valid').length;
            const errorCount = validatedEntries.filter(e => e.status === 'error').length;

            toast({
                title: "File Processed",
                description: `Found ${entries.length} entries. ${validCount} valid, ${errorCount} with errors.`,
            });
            setIsProcessing(false);
        } catch (error: any) {
            console.error("Error processing file:", error);
            toast({
                variant: "destructive",
                title: "Processing Failed",
                description: error.message || "An error occurred while processing the file.",
            });
            setIsProcessing(false);
        }
    };

    const finalizeValidation = (entries: BulkJournalEntry[]) => {
        // Get current confirmed matches from state
        setConfirmedMatches(currentMatches => {
            // Create a copy to ensure we're using the latest
            const matchesCopy = new Map(currentMatches);
            const validatedEntries = validateEntriesWithMatches(entries, matchesCopy);
            setParsedEntries(validatedEntries);
            
            const validCount = validatedEntries.filter(e => e.status === 'valid').length;
            const errorCount = validatedEntries.filter(e => e.status === 'error').length;
            
            toast({
                title: "File Processed",
                description: `Found ${entries.length} entries. ${validCount} valid, ${errorCount} with errors.`,
            });
            
            return matchesCopy;
        });
    };

    const validateEntriesWithMatches = (entries: BulkJournalEntry[], matches: Map<string, MatchConfirmation>): BulkJournalEntry[] => {
        return entries.map((entry, index) => {
            const errors: string[] = [];

            // Validate amount
            if (!entry.amount || entry.amount <= 0) {
                errors.push("Amount must be greater than zero");
            }

            // Convert account names to codes and validate using confirmed matches
            let debitAccountCode: string | null = null;
            let creditAccountCode: string | null = null;

            // Check confirmed matches first
            const debitCacheKey = `${entry.debitAccount?.toLowerCase().trim()}_debit_${index}`;
            const creditCacheKey = `${entry.creditAccount?.toLowerCase().trim()}_credit_${index}`;
            
            // Try confirmed match first
            for (const [key, confirmation] of matches.entries()) {
                if (key === debitCacheKey) {
                    debitAccountCode = confirmation.selectedCode;
                    break;
                }
            }
            
            // If no confirmed match, try direct match
            if (!debitAccountCode && entry.debitAccount) {
                debitAccountCode = getAccountCodeByName(entry.debitAccount);
            }

            // Try confirmed match first for credit
            for (const [key, confirmation] of matches.entries()) {
                if (key === creditCacheKey) {
                    creditAccountCode = confirmation.selectedCode;
                    break;
                }
            }
            
            // If no confirmed match, try direct match
            if (!creditAccountCode && entry.creditAccount) {
                creditAccountCode = getAccountCodeByName(entry.creditAccount);
            }

            // Validate debit account
            if (!entry.debitAccount) {
                errors.push("Debit account is required");
            } else if (!debitAccountCode) {
                errors.push(`Invalid debit account: "${entry.debitAccount}". No matching account found.`);
            }

            // Validate credit account
            if (!entry.creditAccount) {
                errors.push("Credit account is required");
            } else if (!creditAccountCode) {
                errors.push(`Invalid credit account: "${entry.creditAccount}". No matching account found.`);
            }

            // Validate same account not debited and credited
            if (debitAccountCode && creditAccountCode && debitAccountCode === creditAccountCode) {
                errors.push("Debit and credit accounts cannot be the same");
            }

            // Validate date
            if (!entry.date || !entry.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                errors.push("Invalid date format. Use YYYY-MM-DD");
            }

            return {
                ...entry,
                originalDebitAccount: entry.originalDebitAccount || entry.debitAccount,
                originalCreditAccount: entry.originalCreditAccount || entry.creditAccount,
                debitAccount: debitAccountCode || entry.debitAccount,
                creditAccount: creditAccountCode || entry.creditAccount,
                status: errors.length === 0 && debitAccountCode && creditAccountCode ? 'valid' : 'error',
                error: errors.join('; '),
            };
        });
    };

    const processRemainingMatches = (entries: BulkJournalEntry[], accountsNeedingMatch: Map<string, AccountMatch[]>, remainingKeys: string[], currentIndex: number, totalCount: number) => {
        if (remainingKeys.length === 0) {
            // All matches confirmed, validate entries
            setConfirmedAccountsCount(totalCount);
            finalizeValidation(entries);
            return;
        }
        
        // Process next match
        const nextKey = remainingKeys[0];
        // Key format: "debit_0_Account Name" or "credit_1_Account Name"
        const parts = nextKey.split('_');
        const type = parts[0];
        const index = parts[1];
        const accountName = parts.slice(2).join('_'); // Rejoin in case account name has underscores
        const isDebit = type === 'debit';
        const entryIndex = parseInt(index);
        const matches = accountsNeedingMatch.get(nextKey)!;
        
        setPendingMatches({
            accountName: accountName,
            matches,
            currentIndex: currentIndex + 1,
            totalCount: totalCount,
            onConfirm: (code: string, selectedName: string) => {
                const cacheKey = `${accountName.toLowerCase()}_${isDebit ? 'debit' : 'credit'}_${entryIndex}`;
                
                // Update confirmed matches using setter
                setConfirmedMatches(prev => {
                    const newMap = new Map(prev);
                    newMap.set(cacheKey, {
                        originalName: accountName,
                        selectedCode: code,
                        selectedName
                    });
                    return newMap;
                });
                
                // Update confirmed count
                setConfirmedAccountsCount(prev => prev + 1);
                
                setMatchDialogOpen(false);
                setPendingMatches(null);
                
                // Process remaining
                setTimeout(() => {
                    processRemainingMatches(entries, accountsNeedingMatch, remainingKeys.slice(1), currentIndex + 1, totalCount);
                }, 100);
            }
        });
        setMatchDialogOpen(true);
    };

    const handleCreateEntries = async () => {
        if (!accountingContext) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Accounting context not available.",
            });
            return;
        }

        const validEntries = parsedEntries.filter(e => e.status === 'valid');
        if (validEntries.length === 0) {
            toast({
                variant: "destructive",
                title: "No Valid Entries",
                description: "Please fix errors before creating entries.",
            });
            return;
        }

        setIsCreating(true);

        try {
            const { addJournalVoucher } = accountingContext;
            let successCount = 0;
            let errorCount = 0;

            // Group entries by date and narration for voucher creation
            const groupedEntries = validEntries.reduce((acc, entry) => {
                const key = `${entry.date}-${entry.narration}`;
                if (!acc[key]) {
                    acc[key] = [];
                }
                acc[key].push(entry);
                return acc;
            }, {} as Record<string, BulkJournalEntry[]>);

            for (const [key, entries] of Object.entries(groupedEntries)) {
                try {
                    // Create journal lines for this voucher
                    const lines: any[] = [];
                    let totalAmount = 0;

                    entries.forEach(entry => {
                        // entry.debitAccount and entry.creditAccount are already converted to codes during validation
                        // Add debit line
                        lines.push({
                            account: entry.debitAccount,
                            debit: entry.amount.toFixed(2),
                            credit: '0',
                        });

                        // Add credit line
                        lines.push({
                            account: entry.creditAccount,
                            debit: '0',
                            credit: entry.amount.toFixed(2),
                        });

                        totalAmount += entry.amount;
                    });

                    // Verify debits equal credits
                    const totalDebits = lines.reduce((sum, line) => sum + parseFloat(line.debit), 0);
                    const totalCredits = lines.reduce((sum, line) => sum + parseFloat(line.credit), 0);

                    if (Math.abs(totalDebits - totalCredits) > 0.01) {
                        throw new Error(`Debits (${totalDebits}) do not equal credits (${totalCredits})`);
                    }

                    const voucherId = `JV-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
                    
                    // Auto-generate narration if empty or default
                    let narration = entries[0].narration?.trim() || '';
                    if (shouldAutoGenerateNarration(narration)) {
                        const accounts = allAccounts.map(acc => ({ code: acc.code, name: acc.name, type: acc.type }));
                        const customersList = customers.map(c => ({ id: c.id, name: c.name }));
                        const vendorsList = vendors.map(v => ({ id: v.id, name: v.name }));
                        narration = generateAutoNarration(lines, accounts, customersList, vendorsList);
                    }

                    const voucher: any = {
                        id: voucherId,
                        date: entries[0].date,
                        narration,
                        lines,
                        amount: totalAmount,
                    };

                    await addJournalVoucher(voucher);
                    successCount++;
                } catch (error: any) {
                    console.error("Error creating voucher:", error);
                    errorCount++;
                }
            }

            toast({
                title: "Entries Created",
                description: `Successfully created ${successCount} journal voucher(s). ${errorCount > 0 ? `${errorCount} failed.` : ''}`,
            });

            // Reset
            setFile(null);
            setParsedEntries([]);
            const fileInput = document.getElementById('file-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
        } catch (error: any) {
            console.error("Error creating entries:", error);
            toast({
                variant: "destructive",
                title: "Creation Failed",
                description: error.message || "An error occurred while creating journal entries.",
            });
        } finally {
            setIsCreating(false);
        }
    };

    const validCount = parsedEntries.filter(e => e.status === 'valid').length;
    const errorCount = parsedEntries.filter(e => e.status === 'error').length;
    const totalAmount = parsedEntries.filter(e => e.status === 'valid').reduce((sum, e) => sum + e.amount, 0);

    // Bank Statement Converter handlers
    const handleBankStatementUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (!selectedFile) return;

        setBankStatementFile(selectedFile);
        setIsParsingBankStatement(true);
        setBankTransactions([]);
        setBankStatementErrors([]);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);

            const response = await fetch('/api/bank-statement/parse', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to parse bank statement');
            }

            setBankTransactions(data.transactions || []);
            setBankStatementErrors(data.errors || []);

            if (data.validTransactions === 0 && data.errorCount > 0) {
                toast({
                    variant: "destructive",
                    title: "No Transactions Found",
                    description: data.errors?.[0]?.message || "Could not extract transactions from PDF. Please convert to CSV or Excel format and try again.",
                });
            } else {
                toast({
                    title: "Bank Statement Parsed",
                    description: `Successfully parsed ${data.validTransactions} transactions. ${data.errorCount} errors found.`,
                });
            }
        } catch (error: any) {
            console.error('Bank statement parse error:', error);
            toast({
                variant: "destructive",
                title: "Parsing Failed",
                description: error.message || "Failed to parse bank statement file.",
            });
        } finally {
            setIsParsingBankStatement(false);
        }
    };

    const handleDownloadBankStatementTemplate = () => {
        // Create sample bank statement template data
        const templateData = [
            {
                Date: '2024-01-15',
                Description: 'Salary Credit',
                Debit: '',
                Credit: '50000',
                Balance: '150000'
            },
            {
                Date: '2024-01-16',
                Description: 'ATM Withdrawal',
                Debit: '5000',
                Credit: '',
                Balance: '145000'
            },
            {
                Date: '2024-01-17',
                Description: 'UPI Payment - Grocery Store',
                Debit: '2500',
                Credit: '',
                Balance: '142500'
            },
            {
                Date: '2024-01-18',
                Description: 'Interest Credit',
                Debit: '',
                Credit: '125.50',
                Balance: '142625.50'
            },
            {
                Date: '2024-01-19',
                Description: 'Cheque Deposit',
                Debit: '',
                Credit: '10000',
                Balance: '152625.50'
            }
        ];

        // Create workbook with sample data
        const ws = XLSX.utils.json_to_sheet(templateData);
        
        // Set column widths
        ws['!cols'] = [
            { wch: 12 }, // Date
            { wch: 30 }, // Description
            { wch: 15 }, // Debit
            { wch: 15 }, // Credit
            { wch: 15 }  // Balance
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Bank Statement");

        // Add instructions sheet
        const instructions = [
            { Column: "Date", Description: "Transaction date in YYYY-MM-DD format (e.g., 2024-01-15)" },
            { Column: "Description", Description: "Transaction description or narration" },
            { Column: "Debit", Description: "Amount debited/withdrawn (leave empty if credit transaction)" },
            { Column: "Credit", Description: "Amount credited/deposited (leave empty if debit transaction)" },
            { Column: "Balance", Description: "Account balance after transaction (optional, used for validation)" }
        ];
        const wsInstructions = XLSX.utils.json_to_sheet(instructions);
        wsInstructions['!cols'] = [
            { wch: 15 }, // Column
            { wch: 80 }  // Description
        ];
        XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");

        // Download the file
        XLSX.writeFile(wb, "bank-statement-template.xlsx");
        
        toast({
            title: "Template Downloaded",
            description: "Bank statement template downloaded. Fill in your bank statement data and upload.",
        });
    };

    const handleDownloadJournalTemplate = async () => {
        if (!selectedBankAccount) {
            toast({
                variant: "destructive",
                title: "Bank Account Required",
                description: "Please select a bank account before generating the template.",
            });
            return;
        }

        if (bankTransactions.length === 0) {
            toast({
                variant: "destructive",
                title: "No Transactions",
                description: "Please upload and parse a bank statement first.",
            });
            return;
        }

        setIsGeneratingTemplate(true);

        try {
            const response = await fetch('/api/bank-statement/generate-template', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    transactions: bankTransactions,
                    bankAccountName: selectedBankAccount,
                    fileName: `bank-statement-journal-${format(new Date(), 'yyyy-MM-dd')}`,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate template');
            }

            // Get the file blob and download it
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bank-statement-journal-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            toast({
                title: "Template Downloaded",
                description: "Journal template has been generated and downloaded. Fill in the counter accounts and upload via 'Upload Entries' tab.",
            });
        } catch (error: any) {
            console.error('Template generation error:', error);
            toast({
                variant: "destructive",
                title: "Generation Failed",
                description: error.message || "Failed to generate journal template.",
            });
        } finally {
            setIsGeneratingTemplate(false);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Bulk Journal Entry Upload</h1>
                <p className="text-muted-foreground mt-2">
                    Upload multiple journal entries at once using CSV or Excel. Perfect for non-accounting users!
                </p>
            </div>

            <Tabs defaultValue="upload" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="upload">Upload Entries</TabsTrigger>
                    <TabsTrigger value="bank-statement">Bank Statement Converter</TabsTrigger>
                    <TabsTrigger value="rules">Accounting Rules Guide</TabsTrigger>
                    <TabsTrigger value="accounts">Account Codes Reference</TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="space-y-6">
                    <Alert className="border-primary bg-primary/5">
                        <AlertCircle className="h-4 w-4 text-primary" />
                        <AlertTitle className="text-lg font-semibold">Important: Use Exact Account Names</AlertTitle>
                        <AlertDescription className="mt-2">
                            <p className="mb-2">
                                <strong>Use ONLY System-generated Chart of Accounts and accounts created by you.</strong>
                            </p>
                            <p className="mb-2">
                                Account names must match <strong>exactly</strong> (case-insensitive). For example:
                            </p>
                            <ul className="list-disc list-inside space-y-1 mb-2 ml-4">
                                <li>✅ Correct: <code className="bg-muted px-1 rounded">Salaries and Wages - Indirect</code></li>
                                <li>❌ Wrong: <code className="bg-muted px-1 rounded">Salary</code> (will not match and journal entry will fail)</li>
                                <li>❌ Wrong: <code className="bg-muted px-1 rounded">Salaries</code> (will not match and journal entry will fail)</li>
                            </ul>
                            <p className="mb-2">
                                <strong>Download the Sample Excel Sheet from Chart of Accounts page</strong> to see all available account names.
                            </p>
                        </AlertDescription>
                    </Alert>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Upload className="h-5 w-5" />
                                Upload Journal Entries
                            </CardTitle>
                            <CardDescription>
                                Upload a CSV or Excel file with your journal entries. Use account names or ledger names (not codes). Download the template to see the required format.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1 space-y-2">
                                    <Label htmlFor="file-upload">Select File</Label>
                                    <Input
                                        id="file-upload"
                                        type="file"
                                        accept=".csv,.xlsx,.xls"
                                        onChange={handleFileUpload}
                                        disabled={isProcessing}
                                    />
                                </div>
                                <div className="flex items-end">
                                    <Button
                                        variant="outline"
                                        onClick={handleDownloadTemplate}
                                        className="w-full sm:w-auto"
                                    >
                                        <Download className="mr-2 h-4 w-4" />
                                        Download Template
                                    </Button>
                                </div>
                            </div>

                            {isProcessing && (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    <span className="ml-2">Processing file...</span>
                                </div>
                            )}

                                    {parsedEntries.length > 0 && (
                                <>
                                    {/* Show button to finalize validation if there are pending confirmations */}
                                    {parsedEntries.some(e => e.error === 'Pending account confirmation') && (
                                        <Alert className="border-yellow-500 bg-yellow-50">
                                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                                            <AlertTitle>Account Confirmations Pending</AlertTitle>
                                            <AlertDescription className="mt-2">
                                                <p className="mb-2">
                                                    Some accounts need confirmation. Please complete all account match confirmations above, then click the button below to validate entries.
                                                </p>
                                                <Button 
                                                    onClick={() => {
                                                        if (pendingEntries.length > 0) {
                                                            finalizeValidation(pendingEntries);
                                                        } else {
                                                            finalizeValidation(parsedEntries);
                                                        }
                                                    }}
                                                    className="mt-2"
                                                >
                                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                                    Confirm & Validate Entries
                                                </Button>
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <Card>
                                            <CardContent className="pt-6">
                                                <div className="text-center">
                                                    <p className="text-2xl font-bold">{parsedEntries.length}</p>
                                                    <p className="text-sm text-muted-foreground">Total Entries</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardContent className="pt-6">
                                                <div className="text-center">
                                                    <p className="text-2xl font-bold text-green-600">{validCount}</p>
                                                    <p className="text-sm text-muted-foreground">Valid Entries</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardContent className="pt-6">
                                                <div className="text-center">
                                                    <p className="text-2xl font-bold text-red-600">{errorCount}</p>
                                                    <p className="text-sm text-muted-foreground">Errors</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {validCount > 0 && (
                                        <Alert>
                                            <Info className="h-4 w-4" />
                                            <AlertTitle>Ready to Create</AlertTitle>
                                            <AlertDescription>
                                                {validCount} valid entries will create journal vouchers. Total amount: ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-semibold">Entry Preview</h3>
                                            {validCount > 0 && (
                                                <Button
                                                    onClick={handleCreateEntries}
                                                    disabled={isCreating}
                                                >
                                                    {isCreating ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            Creating...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <PlusCircle className="mr-2 h-4 w-4" />
                                                            Create {validCount} Entries
                                                        </>
                                                    )}
                                                </Button>
                                            )}
                                        </div>

                                        <ScrollArea className="h-[500px] border rounded-md">
                                            <Table>
                                                <TableHeader className="sticky top-0 bg-background z-10">
                                                    <TableRow>
                                                        <TableHead>Status</TableHead>
                                                        <TableHead>Date</TableHead>
                                                        <TableHead>Amount</TableHead>
                                                        <TableHead>Debit Account (Name)</TableHead>
                                                        <TableHead>Credit Account (Name)</TableHead>
                                                        <TableHead>Narration</TableHead>
                                                        <TableHead>Error</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {parsedEntries.map((entry, index) => (
                                                        <TableRow key={index}>
                                                            <TableCell>
                                                                {entry.status === 'valid' ? (
                                                                    <Badge className="bg-green-600">
                                                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                                                        Valid
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="destructive">
                                                                        <XCircle className="h-3 w-3 mr-1" />
                                                                        Error
                                                                    </Badge>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="font-mono text-xs">{entry.date}</TableCell>
                                                            <TableCell className="text-right font-mono">₹{entry.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                                            <TableCell>
                                                                <div className="space-y-0.5">
                                                                    <div className="font-medium">{entry.originalDebitAccount || entry.debitAccount}</div>
                                                                    {entry.originalDebitAccount && entry.originalDebitAccount !== entry.debitAccount && (
                                                                        <div className="text-xs text-muted-foreground">Code: {entry.debitAccount}</div>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="space-y-0.5">
                                                                    <div className="font-medium">{entry.originalCreditAccount || entry.creditAccount}</div>
                                                                    {entry.originalCreditAccount && entry.originalCreditAccount !== entry.creditAccount && (
                                                                        <div className="text-xs text-muted-foreground">Code: {entry.creditAccount}</div>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="max-w-xs truncate">{entry.narration}</TableCell>
                                                            <TableCell className="text-xs text-red-600 max-w-xs">{entry.error}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </ScrollArea>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="bank-statement" className="space-y-6">
                    <Alert className="border-primary bg-primary/5">
                        <Building2 className="h-4 w-4 text-primary" />
                        <AlertTitle className="text-lg font-semibold">Convert Bank Statement to Journal Template</AlertTitle>
                        <AlertDescription className="mt-2">
                            <p className="mb-2">
                                Upload your bank statement (CSV/Excel) and we'll generate a pre-filled bulk journal template. 
                                Bank account side will be automatically filled - you just need to fill in the counter accounts.
                            </p>
                            <ul className="list-disc list-inside space-y-1 mb-2 ml-4">
                                <li>✅ <strong>Deposits</strong>: Bank DEBIT (pre-filled), Counter CREDIT (you fill)</li>
                                <li>✅ <strong>Withdrawals</strong>: Bank CREDIT (pre-filled), Counter DEBIT (you fill)</li>
                                <li>✅ Download the template, fill counter accounts, then upload via "Upload Entries" tab</li>
                            </ul>
                        </AlertDescription>
                    </Alert>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileSpreadsheet className="h-5 w-5" />
                                Bank Statement Converter
                            </CardTitle>
                            <CardDescription>
                                Upload your bank statement file (CSV or Excel) to generate a pre-filled journal template.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Step 1: Upload Bank Statement */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold">1</div>
                                        <Label className="text-base font-semibold">Upload Bank Statement</Label>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDownloadBankStatementTemplate}
                                        className="flex items-center gap-2"
                                    >
                                        <Download className="h-4 w-4" />
                                        Download Template (CSV/Excel)
                                    </Button>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <div className="flex-1 space-y-2">
                                        <Label htmlFor="bank-statement-upload">Select Bank Statement File</Label>
                                        <Input
                                            id="bank-statement-upload"
                                            type="file"
                                            accept=".csv,.xlsx,.xls,.pdf"
                                            onChange={handleBankStatementUpload}
                                            disabled={isParsingBankStatement}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Supported formats: CSV, Excel (.xlsx, .xls), PDF (.pdf). The parser automatically detects columns for Date, Description, Debit, Credit, and Balance. Note: PDF parsing works best with text-based PDFs and may vary by bank format.
                                        </p>
                                    </div>
                                </div>

                                {isParsingBankStatement && (
                                    <div className="flex items-center justify-center py-4">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                        <span className="ml-2">Parsing bank statement...</span>
                                    </div>
                                )}

                                {bankStatementErrors.length > 0 && (
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle>Parsing Errors</AlertTitle>
                                        <AlertDescription>
                                            <ul className="list-disc list-inside mt-2">
                                                {bankStatementErrors.slice(0, 5).map((error, idx) => (
                                                    <li key={idx}>Row {error.row}: {error.message}</li>
                                                ))}
                                                {bankStatementErrors.length > 5 && (
                                                    <li>...and {bankStatementErrors.length - 5} more errors</li>
                                                )}
                                            </ul>
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>

                            {/* Step 2: Preview Transactions */}
                            {bankTransactions.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold">2</div>
                                        <Label className="text-base font-semibold">Preview Transactions</Label>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <Card>
                                            <CardContent className="pt-6">
                                                <div className="text-center">
                                                    <p className="text-2xl font-bold">{bankTransactions.length}</p>
                                                    <p className="text-sm text-muted-foreground">Total Transactions</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardContent className="pt-6">
                                                <div className="text-center">
                                                    <p className="text-2xl font-bold text-green-600">
                                                        {bankTransactions.filter(t => t.credit > 0).length}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">Deposits</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardContent className="pt-6">
                                                <div className="text-center">
                                                    <p className="text-2xl font-bold text-red-600">
                                                        {bankTransactions.filter(t => t.debit > 0).length}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">Withdrawals</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    <ScrollArea className="h-[300px] border rounded-md">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead>Description</TableHead>
                                                    <TableHead className="text-right">Debit</TableHead>
                                                    <TableHead className="text-right">Credit</TableHead>
                                                    <TableHead>Reference</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {bankTransactions.slice(0, 20).map((txn, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell>{txn.date}</TableCell>
                                                        <TableCell className="max-w-[200px] truncate">{txn.description}</TableCell>
                                                        <TableCell className="text-right">
                                                            {txn.debit > 0 ? `₹${txn.debit.toLocaleString('en-IN')}` : '-'}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {txn.credit > 0 ? `₹${txn.credit.toLocaleString('en-IN')}` : '-'}
                                                        </TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">
                                                            {txn.reference || '-'}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                    {bankTransactions.length > 20 && (
                                        <p className="text-sm text-muted-foreground text-center">
                                            Showing first 20 transactions. All {bankTransactions.length} transactions will be included in the template.
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Step 3: Select Bank Account */}
                            {bankTransactions.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold">3</div>
                                        <Label className="text-base font-semibold">Select Bank Account</Label>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="bank-account-select">Bank Account</Label>
                                        <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
                                            <SelectTrigger id="bank-account-select">
                                                <SelectValue placeholder="Select bank account from chart of accounts" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {bankAccounts.length > 0 ? (
                                                    bankAccounts.map((acc) => (
                                                        <SelectItem key={acc.code} value={acc.name}>
                                                            {acc.name} ({acc.code})
                                                        </SelectItem>
                                                    ))
                                                ) : (
                                                    <SelectItem value="none" disabled>
                                                        No bank accounts found. Please create one in Chart of Accounts.
                                                    </SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                            Select the bank account that matches this statement. This will be pre-filled in the journal template.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Generate Template */}
                            {bankTransactions.length > 0 && selectedBankAccount && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold">4</div>
                                        <Label className="text-base font-semibold">Generate Journal Template</Label>
                                    </div>
                                    <Button
                                        onClick={handleDownloadJournalTemplate}
                                        disabled={isGeneratingTemplate}
                                        className="w-full sm:w-auto"
                                    >
                                        {isGeneratingTemplate ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <Download className="mr-2 h-4 w-4" />
                                                Download Journal Template
                                            </>
                                        )}
                                    </Button>
                                    <Alert>
                                        <Info className="h-4 w-4" />
                                        <AlertTitle>Next Steps</AlertTitle>
                                        <AlertDescription className="mt-2">
                                            <ol className="list-decimal list-inside space-y-1">
                                                <li>Download the generated Excel template</li>
                                                <li>Fill in the blank counter accounts (DebitAccount for withdrawals, CreditAccount for deposits)</li>
                                                <li>Go to "Upload Entries" tab and upload the filled template</li>
                                                <li>Review and create journal entries</li>
                                            </ol>
                                        </AlertDescription>
                                    </Alert>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="rules" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BookOpen className="h-5 w-5" />
                                Accounting Rules: What to Debit and Credit
                            </CardTitle>
                            <CardDescription>
                                Understanding the golden rules of accounting to prepare your journal entries correctly.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {accountingRules.map((rule, index) => (
                                <div key={index} className="space-y-3 p-4 border rounded-lg">
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                            <span className="text-sm font-bold text-primary">{index + 1}</span>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-lg mb-1">{rule.category}</h3>
                                            <p className="text-sm text-muted-foreground mb-3">{rule.rule}</p>
                                            <div className="space-y-2">
                                                {rule.examples.map((example, exIndex) => (
                                                    <div key={exIndex} className="bg-muted/50 p-3 rounded-md">
                                                        <p className="font-medium text-sm mb-1">{example.transaction}</p>
                                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                                            <div>
                                                                <span className="text-green-600 font-semibold">Debit:</span> {example.debit}
                                                            </div>
                                                            <div>
                                                                <span className="text-red-600 font-semibold">Credit:</span> {example.credit}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Remember the Golden Rule</AlertTitle>
                                <AlertDescription>
                                    <strong>Every transaction must have equal debits and credits.</strong> The total of all debit amounts must equal the total of all credit amounts in each journal entry.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="accounts" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Account Names Reference
                            </CardTitle>
                            <CardDescription>
                                Use these account names or ledger names in your debit and credit columns. You can also use customer/vendor names. Account codes are shown for reference only.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[600px]">
                                <div className="space-y-6">
                                    {[
                                        { title: "Assets", accounts: allAccounts.filter(a => a.type.includes('Asset') || a.type === 'Cash' || a.type === 'Bank' || a.type === 'Investment' || a.type === 'Fixed Asset') },
                                        { title: "Liabilities", accounts: allAccounts.filter(a => a.type.includes('Liability') || a.type === 'Equity') },
                                        { title: "Revenue/Income", accounts: allAccounts.filter(a => a.type === 'Revenue' || a.type === 'Other Income') },
                                        { title: "Expenses", accounts: allAccounts.filter(a => a.type === 'Expense' || a.type === 'Cost of Goods Sold') },
                                    ].map((group, index) => (
                                        <div key={index} className="space-y-2">
                                            <h3 className="font-semibold text-lg">{group.title}</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                {group.accounts.map(account => (
                                                    <div key={account.code} className="flex items-center justify-between p-2 bg-muted/50 rounded-md text-sm">
                                                        <span className="font-medium">{account.name}</span>
                                                        <span className="text-muted-foreground ml-2 text-xs font-mono">({account.code})</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {customers.length > 0 && (
                                        <div className="space-y-2">
                                            <h3 className="font-semibold text-lg">Customers</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                {customers.map(customer => (
                                                    <div key={customer.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md text-sm">
                                                        <span className="font-medium">{customer.name}</span>
                                                        <span className="text-muted-foreground ml-2 text-xs">(Customer)</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {vendors.length > 0 && (
                                        <div className="space-y-2">
                                            <h3 className="font-semibold text-lg">Vendors</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                {vendors.map(vendor => (
                                                    <div key={vendor.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md text-sm">
                                                        <span className="font-medium">{vendor.name}</span>
                                                        <span className="text-muted-foreground ml-2 text-xs">(Vendor)</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Account Match Confirmation Dialog */}
            <Dialog open={matchDialogOpen} onOpenChange={setMatchDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Confirm Account Match</DialogTitle>
                        <DialogDescription>
                            <div className="space-y-2">
                                <p>
                                    The account name "<strong>{pendingMatches?.accountName}</strong>" doesn't match exactly. Please select the correct account from the options below:
                                </p>
                                {pendingMatches && (
                                    <div className="flex items-center gap-2 mt-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-primary">
                                                Progress: {pendingMatches.currentIndex} of {pendingMatches.totalCount} accounts
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {pendingMatches.totalCount - pendingMatches.currentIndex + 1} account(s) remaining
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-primary transition-all duration-300"
                                                    style={{ width: `${(pendingMatches.currentIndex / pendingMatches.totalCount) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-sm font-semibold text-primary">
                                                {Math.round((pendingMatches.currentIndex / pendingMatches.totalCount) * 100)}%
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
                        {pendingMatches?.matches.map((match, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold">{match.name}</span>
                                        <Badge variant={match.type === 'exact' ? 'default' : match.type === 'partial' ? 'secondary' : 'outline'}>
                                            {match.type === 'exact' ? 'Exact Match' : match.type === 'partial' ? 'Partial Match' : 'Similar Match'}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">Code: {match.code}</p>
                                </div>
                                <Button 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (pendingMatches) {
                                            pendingMatches.onConfirm(match.code, match.name);
                                        }
                                    }}
                                    className="ml-4"
                                >
                                    Select
                                </Button>
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setMatchDialogOpen(false);
                            setPendingMatches(null);
                        }}>
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}


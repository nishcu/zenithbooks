
"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    PlusCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useContext } from "react";
import { AccountingContext } from "@/context/accounting-context";
import { allAccounts } from "@/lib/accounts";
import { useAuthState } from "react-firebase-hooks/auth";
import { collection, query, where, useCollection } from "react-firebase-hooks/firestore";
import { db, auth } from "@/lib/firebase";
import * as XLSX from "xlsx";
import { format } from "date-fns";

interface BulkJournalEntry {
    date: string;
    amount: number;
    debitAccount: string;
    creditAccount: string;
    narration: string;
    status?: 'valid' | 'error';
    error?: string;
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
    const { toast } = useToast();
    const accountingContext = useContext(AccountingContext);
    const [user] = useAuthState(auth);
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [parsedEntries, setParsedEntries] = useState<BulkJournalEntry[]>([]);
    const [defaultDate, setDefaultDate] = useState(format(new Date(), "yyyy-MM-dd"));

    // Fetch customers and vendors for account validation
    const customersQuery = user ? query(collection(db, 'customers'), where("userId", "==", user.uid)) : null;
    const [customersSnapshot] = useCollection(customersQuery);
    const customers = useMemo(() => customersSnapshot?.docs.map(doc => ({ id: doc.id, name: doc.data().name })) || [], [customersSnapshot]);

    const vendorsQuery = user ? query(collection(db, 'vendors'), where("userId", "==", user.uid)) : null;
    const [vendorsSnapshot] = useCollection(vendorsQuery);
    const vendors = useMemo(() => vendorsSnapshot?.docs.map(doc => ({ id: doc.id, name: doc.data().name })) || [], [vendorsSnapshot]);

    // Get all valid account codes
    const validAccountCodes = useMemo(() => {
        const accountCodes = new Set(allAccounts.map(acc => acc.code));
        customers.forEach(c => accountCodes.add(c.id));
        vendors.forEach(v => accountCodes.add(v.id));
        return accountCodes;
    }, [customers, vendors]);

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

    const handleDownloadTemplate = () => {
        const templateData = [
            {
                Date: defaultDate,
                Amount: 10000,
                DebitAccount: "1510",
                CreditAccount: "4010",
                Narration: "Sample: Sale made for cash"
            },
            {
                Date: defaultDate,
                Amount: 5000,
                DebitAccount: "6010",
                CreditAccount: "1520",
                Narration: "Sample: Salary paid from bank"
            }
        ];

        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Journal Entries");
        
        // Add instructions sheet
        const instructions = [
            { Column: "Date", Description: "Transaction date in YYYY-MM-DD format (e.g., 2024-01-15)" },
            { Column: "Amount", Description: "Transaction amount (numeric value, no currency symbols)" },
            { Column: "DebitAccount", Description: "Account code to debit (e.g., 1510 for Cash, 1520 for Bank)" },
            { Column: "CreditAccount", Description: "Account code to credit (e.g., 4010 for Sales Revenue)" },
            { Column: "Narration", Description: "Description of the transaction" }
        ];
        const wsInstructions = XLSX.utils.json_to_sheet(instructions);
        XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");
        
        XLSX.writeFile(wb, "bulk-journal-entries-template.xlsx");
        toast({
            title: "Template Downloaded",
            description: "Template file has been downloaded. Fill in your journal entries and upload.",
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

            // Validate debit account
            if (!entry.debitAccount) {
                errors.push("Debit account is required");
            } else if (!validAccountCodes.has(entry.debitAccount)) {
                errors.push(`Invalid debit account: ${entry.debitAccount}`);
            }

            // Validate credit account
            if (!entry.creditAccount) {
                errors.push("Credit account is required");
            } else if (!validAccountCodes.has(entry.creditAccount)) {
                errors.push(`Invalid credit account: ${entry.creditAccount}`);
            }

            // Validate same account not debited and credited
            if (entry.debitAccount === entry.creditAccount) {
                errors.push("Debit and credit accounts cannot be the same");
            }

            // Validate date
            if (!entry.date || !entry.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                errors.push("Invalid date format. Use YYYY-MM-DD");
            }

            return {
                ...entry,
                status: errors.length === 0 ? 'valid' : 'error',
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

            const validatedEntries = validateEntries(entries);
            setParsedEntries(validatedEntries);

            const validCount = validatedEntries.filter(e => e.status === 'valid').length;
            const errorCount = validatedEntries.filter(e => e.status === 'error').length;

            toast({
                title: "File Processed",
                description: `Found ${entries.length} entries. ${validCount} valid, ${errorCount} with errors.`,
            });
        } catch (error: any) {
            console.error("Error processing file:", error);
            toast({
                variant: "destructive",
                title: "Processing Failed",
                description: error.message || "An error occurred while processing the file.",
            });
        } finally {
            setIsProcessing(false);
        }
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

                    const voucherId = `JV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    const narration = entries[0].narration || 'Bulk Journal Entry';

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
                    <TabsTrigger value="rules">Accounting Rules Guide</TabsTrigger>
                    <TabsTrigger value="accounts">Account Codes Reference</TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Upload className="h-5 w-5" />
                                Upload Journal Entries
                            </CardTitle>
                            <CardDescription>
                                Upload a CSV or Excel file with your journal entries. Download the template to see the required format.
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
                                                        <TableHead>Debit Account</TableHead>
                                                        <TableHead>Credit Account</TableHead>
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
                                                                    <div className="font-mono text-xs">{entry.debitAccount}</div>
                                                                    <div className="text-xs text-muted-foreground">{getAccountName(entry.debitAccount)}</div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="space-y-0.5">
                                                                    <div className="font-mono text-xs">{entry.creditAccount}</div>
                                                                    <div className="text-xs text-muted-foreground">{getAccountName(entry.creditAccount)}</div>
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
                                Account Codes Reference
                            </CardTitle>
                            <CardDescription>
                                Use these account codes in your debit and credit columns. You can also use customer/vendor IDs.
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
                                                        <span className="font-mono">{account.code}</span>
                                                        <span className="text-muted-foreground ml-2">{account.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}


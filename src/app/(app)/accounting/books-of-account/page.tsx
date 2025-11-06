"use client";

import { useState, useContext, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { FileSpreadsheet, Download, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AccountingContext, type JournalVoucher } from "@/context/accounting-context";
import { allAccounts } from "@/lib/accounts";
import { format, startOfYear, endOfYear, parse, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { applyExcelFormatting } from "@/lib/export-utils";
import { useCollection } from "react-firebase-hooks/firestore";
import { collection, query, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";

// Financial year options
const financialYears = [
    { value: "2024-25", label: "2024-25", start: "2024-04-01", end: "2025-03-31" },
    { value: "2023-24", label: "2023-24", start: "2023-04-01", end: "2024-03-31" },
    { value: "2022-23", label: "2022-23", start: "2022-04-01", end: "2023-03-31" },
    { value: "2021-22", label: "2021-22", start: "2021-04-01", end: "2022-03-31" },
];

export default function BooksOfAccountPage() {
    const { toast } = useToast();
    const accountingContext = useContext(AccountingContext);
    const [user] = useAuthState(auth);
    const [selectedPeriod, setSelectedPeriod] = useState<"financial-year" | "custom">("financial-year");
    const [selectedFinancialYear, setSelectedFinancialYear] = useState("2024-25");
    const [fromDate, setFromDate] = useState<Date | undefined>(startOfYear(new Date()));
    const [toDate, setToDate] = useState<Date | undefined>(endOfYear(new Date()));
    const [isGenerating, setIsGenerating] = useState(false);

    // Fetch customers and vendors for account name resolution
    const customersQuery = user ? query(collection(db, 'customers'), where("userId", "==", user.uid)) : null;
    const [customersSnapshot] = useCollection(customersQuery);
    const customers = useMemo(() => customersSnapshot?.docs.map(doc => ({ id: doc.id, name: doc.data().name })) || [], [customersSnapshot]);

    const vendorsQuery = user ? query(collection(db, 'vendors'), where("userId", "==", user.uid)) : null;
    const [vendorsSnapshot] = useCollection(vendorsQuery);
    const vendors = useMemo(() => vendorsSnapshot?.docs.map(doc => ({ id: doc.id, name: doc.data().name })) || [], [vendorsSnapshot]);

    if (!accountingContext) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const { journalVouchers } = accountingContext;

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

    // Get date range based on selection
    const getDateRange = () => {
        if (selectedPeriod === "financial-year") {
            const fy = financialYears.find(fy => fy.value === selectedFinancialYear);
            if (fy) {
                return {
                    from: parse(fy.start, "yyyy-MM-dd", new Date()),
                    to: parse(fy.end, "yyyy-MM-dd", new Date())
                };
            }
        }
        return {
            from: fromDate || startOfYear(new Date()),
            to: toDate || endOfYear(new Date())
        };
    };

    // Filter vouchers by date range
    const getFilteredVouchers = () => {
        const { from, to } = getDateRange();
        return journalVouchers.filter(v => {
            if (!v || !v.date) return false;
            const voucherDate = new Date(v.date);
            return voucherDate >= from && voucherDate <= to;
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    };

    // Generate Day Book
    const generateDayBook = (vouchers: JournalVoucher[]) => {
        const headers = ["Date", "Voucher No.", "Particulars", "Debit", "Credit", "Balance"];
        const rows: (string | number)[][] = [];
        let runningBalance = 0;

        vouchers.forEach(v => {
            v.lines.forEach((line, index) => {
                const debit = parseFloat(line.debit) || 0;
                const credit = parseFloat(line.credit) || 0;
                runningBalance += debit - credit;

                rows.push([
                    index === 0 ? format(new Date(v.date), "dd-MMM-yyyy") : "",
                    index === 0 ? v.id : "",
                    index === 0 ? v.narration : `  ${getAccountName(line.account)}`,
                    debit > 0 ? debit.toFixed(2) : "",
                    credit > 0 ? credit.toFixed(2) : "",
                    runningBalance.toFixed(2)
                ]);
            });
        });

        return { headers, rows };
    };

    // Generate Cash Book
    const generateCashBook = (vouchers: JournalVoucher[]) => {
        const cashAccount = "1510"; // Cash on Hand
        const headers = ["Date", "Voucher No.", "Particulars", "Receipt", "Payment", "Balance"];
        const rows: (string | number)[][] = [];
        let balance = 0;

        vouchers.forEach(v => {
            const cashLines = v.lines.filter(l => l.account === cashAccount);
            if (cashLines.length > 0) {
                cashLines.forEach((line, index) => {
                    const receipt = parseFloat(line.debit) || 0;
                    const payment = parseFloat(line.credit) || 0;
                    balance += receipt - payment;

                    rows.push([
                        index === 0 ? format(new Date(v.date), "dd-MMM-yyyy") : "",
                        index === 0 ? v.id : "",
                        index === 0 ? v.narration : `  ${getAccountName(line.account)}`,
                        receipt > 0 ? receipt.toFixed(2) : "",
                        payment > 0 ? payment.toFixed(2) : "",
                        balance.toFixed(2)
                    ]);
                });
            }
        });

        return { headers, rows };
    };

    // Generate Bank Book
    const generateBankBook = (vouchers: JournalVoucher[]) => {
        const bankAccounts = ["1520", "1521", "1522"]; // Bank accounts
        const headers = ["Date", "Voucher No.", "Bank Account", "Particulars", "Receipt", "Payment", "Balance"];
        const rows: (string | number)[][] = [];
        const balances: Record<string, number> = {};

        bankAccounts.forEach(acc => balances[acc] = 0);

        vouchers.forEach(v => {
            v.lines.forEach(line => {
                if (bankAccounts.includes(line.account)) {
                    const receipt = parseFloat(line.debit) || 0;
                    const payment = parseFloat(line.credit) || 0;
                    balances[line.account] += receipt - payment;

                    rows.push([
                        format(new Date(v.date), "dd-MMM-yyyy"),
                        v.id,
                        getAccountName(line.account),
                        v.narration,
                        receipt > 0 ? receipt.toFixed(2) : "",
                        payment > 0 ? payment.toFixed(2) : "",
                        balances[line.account].toFixed(2)
                    ]);
                }
            });
        });

        return { headers, rows };
    };

    // Generate Purchase Book
    const generatePurchaseBook = (vouchers: JournalVoucher[]) => {
        const purchaseAccounts = ["5010", "5050"]; // Purchase accounts
        const headers = ["Date", "Voucher No.", "Party", "Particulars", "Amount", "GST", "Total"];
        const rows: (string | number)[][] = [];

        vouchers.forEach(v => {
            const purchaseLines = v.lines.filter(l => purchaseAccounts.includes(l.account));
            if (purchaseLines.length > 0) {
                const purchaseAmount = purchaseLines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
                const gstAmount = v.lines.find(l => l.account === "2110" || l.account === "2421") ? 
                    v.lines.filter(l => l.account === "2110" || l.account === "2421").reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0) : 0;
                const total = purchaseAmount + gstAmount;

                const partyLine = v.lines.find(l => vendors.find(v => v.id === l.account));
                const party = partyLine ? getAccountName(partyLine.account) : "";

                rows.push([
                    format(new Date(v.date), "dd-MMM-yyyy"),
                    v.id,
                    party,
                    v.narration,
                    purchaseAmount.toFixed(2),
                    gstAmount.toFixed(2),
                    total.toFixed(2)
                ]);
            }
        });

        return { headers, rows };
    };

    // Generate Sales Book
    const generateSalesBook = (vouchers: JournalVoucher[]) => {
        const salesAccount = "4010"; // Sales Revenue
        const headers = ["Date", "Invoice No.", "Party", "Particulars", "Amount", "GST", "Total"];
        const rows: (string | number)[][] = [];

        vouchers.filter(v => v.id && v.id.startsWith("INV-") && !v.reverses).forEach(v => {
            const salesAmount = v.lines.find(l => l.account === salesAccount) ? 
                parseFloat(v.lines.find(l => l.account === salesAccount)!.credit) : 0;
            const gstAmount = v.lines.find(l => l.account === "2110" || l.account === "2421") ? 
                parseFloat(v.lines.find(l => l.account === "2110" || l.account === "2421")!.credit) : 0;
            const total = salesAmount + gstAmount;

            const partyLine = v.lines.find(l => customers.find(c => c.id === l.account));
            const party = partyLine ? getAccountName(partyLine.account) : "";

            rows.push([
                format(new Date(v.date), "dd-MMM-yyyy"),
                v.id,
                party,
                v.narration,
                salesAmount.toFixed(2),
                gstAmount.toFixed(2),
                total.toFixed(2)
            ]);
        });

        return { headers, rows };
    };

    // Generate Journal Register
    const generateJournalRegister = (vouchers: JournalVoucher[]) => {
        const headers = ["Date", "Voucher No.", "Narration", "Account", "Debit", "Credit"];
        const rows: (string | number)[][] = [];

        vouchers.forEach(v => {
            v.lines.forEach((line, index) => {
                rows.push([
                    index === 0 ? format(new Date(v.date), "dd-MMM-yyyy") : "",
                    index === 0 ? v.id : "",
                    index === 0 ? v.narration : "",
                    getAccountName(line.account),
                    parseFloat(line.debit) > 0 ? parseFloat(line.debit).toFixed(2) : "",
                    parseFloat(line.credit) > 0 ? parseFloat(line.credit).toFixed(2) : ""
                ]);
            });
        });

        return { headers, rows };
    };

    // Generate Ledger Summary
    const generateLedgerSummary = (vouchers: JournalVoucher[]) => {
        const headers = ["Account Code", "Account Name", "Type", "Opening", "Debit", "Credit", "Closing"];
        const rows: (string | number)[][] = [];
        const accountBalances: Record<string, { debit: number; credit: number; opening: number }> = {};

        // Initialize all accounts
        allAccounts.forEach(acc => {
            accountBalances[acc.code] = { debit: 0, credit: 0, opening: 0 };
        });
        customers.forEach(c => {
            accountBalances[c.id] = { debit: 0, credit: 0, opening: 0 };
        });
        vendors.forEach(v => {
            accountBalances[v.id] = { debit: 0, credit: 0, opening: 0 };
        });

        // Calculate balances
        vouchers.forEach(v => {
            v.lines.forEach(line => {
                if (!accountBalances[line.account]) {
                    accountBalances[line.account] = { debit: 0, credit: 0, opening: 0 };
                }
                accountBalances[line.account].debit += parseFloat(line.debit) || 0;
                accountBalances[line.account].credit += parseFloat(line.credit) || 0;
            });
        });

        // Generate rows
        Object.entries(accountBalances).forEach(([code, balance]) => {
            if (balance.debit > 0 || balance.credit > 0) {
                const account = allAccounts.find(a => a.code === code);
                const customer = customers.find(c => c.id === code);
                const vendor = vendors.find(v => v.id === code);
                const closing = balance.debit - balance.credit;

                rows.push([
                    code,
                    getAccountName(code),
                    account?.type || customer ? "Customer" : vendor ? "Vendor" : "Other",
                    balance.opening.toFixed(2),
                    balance.debit.toFixed(2),
                    balance.credit.toFixed(2),
                    closing.toFixed(2)
                ]);
            }
        });

        return { headers, rows };
    };

    // Generate Trial Balance
    const generateTrialBalance = (vouchers: JournalVoucher[]) => {
        const headers = ["Account Code", "Account Name", "Debit", "Credit"];
        const rows: (string | number)[][] = [];
        const accountBalances: Record<string, { debit: number; credit: number }> = {};

        // Initialize all accounts
        allAccounts.forEach(acc => {
            accountBalances[acc.code] = { debit: 0, credit: 0 };
        });
        customers.forEach(c => {
            accountBalances[c.id] = { debit: 0, credit: 0 };
        });
        vendors.forEach(v => {
            accountBalances[v.id] = { debit: 0, credit: 0 };
        });

        // Calculate balances
        vouchers.forEach(v => {
            v.lines.forEach(line => {
                if (!accountBalances[line.account]) {
                    accountBalances[line.account] = { debit: 0, credit: 0 };
                }
                accountBalances[line.account].debit += parseFloat(line.debit) || 0;
                accountBalances[line.account].credit += parseFloat(line.credit) || 0;
            });
        });

        // Generate rows
        Object.entries(accountBalances).forEach(([code, balance]) => {
            if (balance.debit > 0 || balance.credit > 0) {
                rows.push([
                    code,
                    getAccountName(code),
                    balance.debit > 0 ? balance.debit.toFixed(2) : "",
                    balance.credit > 0 ? balance.credit.toFixed(2) : ""
                ]);
            }
        });

        // Add totals
        const totalDebit = Object.values(accountBalances).reduce((sum, b) => sum + b.debit, 0);
        const totalCredit = Object.values(accountBalances).reduce((sum, b) => sum + b.credit, 0);
        rows.push(["", "TOTAL", totalDebit.toFixed(2), totalCredit.toFixed(2)]);

        return { headers, rows };
    };

    // Generate Books of Account Excel
    const handleGenerateBooks = async () => {
        setIsGenerating(true);
        try {
            const filteredVouchers = getFilteredVouchers();
            const { from, to } = getDateRange();

            if (filteredVouchers.length === 0) {
                toast({
                    variant: "destructive",
                    title: "No Data",
                    description: "No transactions found for the selected period.",
                });
                setIsGenerating(false);
                return;
            }

            const workbook = XLSX.utils.book_new();

            // Generate all books
            const dayBook = generateDayBook(filteredVouchers);
            const cashBook = generateCashBook(filteredVouchers);
            const bankBook = generateBankBook(filteredVouchers);
            const purchaseBook = generatePurchaseBook(filteredVouchers);
            const salesBook = generateSalesBook(filteredVouchers);
            const journalRegister = generateJournalRegister(filteredVouchers);
            const ledgerSummary = generateLedgerSummary(filteredVouchers);
            const trialBalance = generateTrialBalance(filteredVouchers);

            // Create worksheets with formatting
            const sheets = [
                { name: "Day Book", data: dayBook },
                { name: "Cash Book", data: cashBook },
                { name: "Bank Book", data: bankBook },
                { name: "Purchase Book", data: purchaseBook },
                { name: "Sales Book", data: salesBook },
                { name: "Journal Register", data: journalRegister },
                { name: "Ledger Summary", data: ledgerSummary },
                { name: "Trial Balance", data: trialBalance },
            ];

            sheets.forEach(({ name, data }) => {
                if (data.rows.length > 0) {
                    const worksheet = XLSX.utils.aoa_to_sheet([data.headers, ...data.rows]);
                    applyExcelFormatting(worksheet, data.headers, data.rows);
                    XLSX.utils.book_append_sheet(workbook, worksheet, name.substring(0, 31));
                }
            });

            // Generate filename
            const dateRange = getDateRange();
            const periodLabel = selectedPeriod === "financial-year" 
                ? `FY_${selectedFinancialYear}`
                : `${format(dateRange.from, "dd-MMM-yyyy")}_to_${format(dateRange.to, "dd-MMM-yyyy")}`;
            const filename = `Books_of_Account_${periodLabel}_${format(new Date(), "yyyy-MM-dd")}.xlsx`;

            XLSX.writeFile(workbook, filename);

            toast({
                title: "Books of Account Generated",
                description: `Excel file with ${sheets.length} sheets has been generated successfully.`,
            });
        } catch (error: any) {
            console.error("Error generating books:", error);
            toast({
                variant: "destructive",
                title: "Generation Failed",
                description: error.message || "An error occurred while generating books of account.",
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const dateRange = getDateRange();
    const filteredVouchers = getFilteredVouchers();

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Books of Account</h1>
                <p className="text-muted-foreground mt-2">
                    Generate comprehensive books of account in Excel format for a financial year or custom period. 
                    Similar to Tally's Books of Account feature.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5" />
                        Generate Books of Account
                    </CardTitle>
                    <CardDescription>
                        Select a financial year or custom date range to generate all books in a single Excel file.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Period Selection */}
                    <div className="space-y-4">
                        <Label>Select Period</Label>
                        <Select value={selectedPeriod} onValueChange={(value: "financial-year" | "custom") => setSelectedPeriod(value)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="financial-year">Financial Year</SelectItem>
                                <SelectItem value="custom">Custom Date Range</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Financial Year Selection */}
                    {selectedPeriod === "financial-year" && (
                        <div className="space-y-4">
                            <Label>Financial Year</Label>
                            <Select value={selectedFinancialYear} onValueChange={setSelectedFinancialYear}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {financialYears.map(fy => (
                                        <SelectItem key={fy.value} value={fy.value}>{fy.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Custom Date Range */}
                    {selectedPeriod === "custom" && (
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>From Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !fromDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {fromDate ? format(fromDate, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={fromDate}
                                            onSelect={setFromDate}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label>To Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !toDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {toDate ? format(toDate, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={toDate}
                                            onSelect={setToDate}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    )}

                    {/* Period Summary */}
                    <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium">Selected Period</p>
                                <p className="text-sm text-muted-foreground">
                                    {selectedPeriod === "financial-year" 
                                        ? `Financial Year ${selectedFinancialYear} (${format(dateRange.from, "dd-MMM-yyyy")} to ${format(dateRange.to, "dd-MMM-yyyy")})`
                                        : `${fromDate ? format(fromDate, "dd-MMM-yyyy") : "N/A"} to ${toDate ? format(toDate, "dd-MMM-yyyy") : "N/A"}`
                                    }
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium">{filteredVouchers.length}</p>
                                <p className="text-sm text-muted-foreground">Transactions</p>
                            </div>
                        </div>
                    </div>

                    {/* Generate Button */}
                    <Button
                        onClick={handleGenerateBooks}
                        disabled={isGenerating || filteredVouchers.length === 0}
                        className="w-full"
                        size="lg"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating Books...
                            </>
                        ) : (
                            <>
                                <Download className="mr-2 h-4 w-4" />
                                Generate Books of Account (Excel)
                            </>
                        )}
                    </Button>

                    {/* Information */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                        <p className="text-sm font-medium mb-2">What's Included:</p>
                        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                            <li>Day Book - All transactions chronologically</li>
                            <li>Cash Book - Cash transactions</li>
                            <li>Bank Book - Bank transactions</li>
                            <li>Purchase Book - Purchase transactions</li>
                            <li>Sales Book - Sales transactions</li>
                            <li>Journal Register - All journal vouchers</li>
                            <li>Ledger Summary - All accounts with balances</li>
                            <li>Trial Balance - Summary of all accounts</li>
                        </ul>
                        <p className="text-sm text-muted-foreground mt-2">
                            All sheets are formatted for printing with proper alignment and column widths.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}


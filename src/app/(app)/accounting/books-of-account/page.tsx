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
import { useCollection, useDocumentData } from "react-firebase-hooks/firestore";
import { collection, query, where, doc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { UpgradeRequiredAlert } from "@/components/upgrade-required-alert";
import { readBrandingSettings, type BrandingSettings } from "@/lib/branding";

// Financial year options
const financialYears = [
    { value: "2024-25", label: "2024-25", start: "2024-04-01", end: "2025-03-31" },
    { value: "2023-24", label: "2023-24", start: "2023-04-01", end: "2024-03-31" },
    { value: "2022-23", label: "2022-23", start: "2022-04-01", end: "2023-03-31" },
    { value: "2021-22", label: "2021-22", start: "2021-04-01", end: "2022-03-31" },
];

export default function BooksOfAccountPage() {
    // ALL HOOKS MUST BE CALLED UNCONDITIONALLY AT THE TOP LEVEL
    const { toast } = useToast();
    const accountingContext = useContext(AccountingContext);
    const [user] = useAuthState(auth);
    const userDocRef = user ? doc(db, 'users', user.uid) : null;
    const [userData] = useDocumentData(userDocRef);
    const subscriptionPlan = userData?.subscriptionPlan || 'freemium';
    const isFreemium = subscriptionPlan === 'freemium';

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

    // Get context values (but don't use them in hooks if context is null)
    const { journalVouchers } = accountingContext || { journalVouchers: [] };

    // Early return AFTER all hooks are called
    if (user && isFreemium) {
        return (
            <div className="space-y-8 p-8">
                <h1 className="text-3xl font-bold">Books of Account</h1>
                <UpgradeRequiredAlert
                    featureName="Books of Account"
                    description="Generate day book, cash book, and other accounting books with a Business or Professional plan."
                    backHref="/dashboard"
                    backLabel="Back to Dashboard"
                />
            </div>
        );
    }

    if (!accountingContext) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

    // Generate Day Book (Tally Format)
    const generateDayBook = (vouchers: JournalVoucher[]) => {
        const headers = ["Date", "Voucher Type", "Voucher No.", "Particulars", "Debit", "Credit"];
        const rows: (string | number)[][] = [];
        let totalDebit = 0;
        let totalCredit = 0;

        vouchers.forEach(v => {
            const voucherDate = format(new Date(v.date), "dd-MMM-yyyy");
            const voucherType = v.id?.startsWith("INV-") ? "Sales" : 
                               v.id?.startsWith("PV-") ? "Payment" :
                               v.id?.startsWith("RV-") ? "Receipt" : "Journal";
            
            // First row: Narration
            rows.push([
                voucherDate,
                voucherType,
                v.id,
                v.narration || "Journal Entry",
                "",
                ""
            ]);

            // Subsequent rows: Account details with indentation
            v.lines.forEach((line) => {
                const debit = parseFloat(String(line.debit).replace(/,/g, '')) || 0;
                const credit = parseFloat(String(line.credit).replace(/,/g, '')) || 0;
                totalDebit += debit;
                totalCredit += credit;

                const accountName = getAccountName(String(line.account).trim());
                rows.push([
                    "",
                    "",
                    "",
                    `    ${accountName}`, // Indented for account names
                    debit > 0 ? debit.toFixed(2) : "",
                    credit > 0 ? credit.toFixed(2) : ""
                ]);
            });

            // Add blank row between vouchers
            rows.push(["", "", "", "", "", ""]);
        });

        // Add totals row
        rows.push(["", "", "", "TOTAL", totalDebit.toFixed(2), totalCredit.toFixed(2)]);

        return { headers, rows };
    };

    // Generate Cash Book (Tally Format - showing other side account details)
    const generateCashBook = (vouchers: JournalVoucher[]) => {
        const cashAccount = "1510"; // Cash on Hand
        // Tally format: Double column format with Receipt side (left) and Payment side (right)
        const headers = ["Date", "Particulars", "Voucher No.", "Receipt", "Date", "Particulars", "Voucher No.", "Payment", "Balance"];
        const rows: (string | number)[][] = [];
        let balance = 0;

        // Process each voucher and extract cash transactions
        const cashTransactions: Array<{
            date: string;
            voucherId: string;
            receipt: number;
            payment: number;
            receiptParticulars: string;
            paymentParticulars: string;
        }> = [];

        vouchers.forEach(v => {
            const cashLine = v.lines.find(l => String(l.account).trim() === cashAccount);
            if (cashLine) {
                const receipt = parseFloat(String(cashLine.debit).replace(/,/g, '')) || 0;
                const payment = parseFloat(String(cashLine.credit).replace(/,/g, '')) || 0;
                
                if (receipt > 0 || payment > 0) {
                    // Find the other side accounts (contra accounts)
                    const otherSideLines = v.lines.filter(l => String(l.account).trim() !== cashAccount);
                    
                    // For receipts: Cash debited, so other accounts are credited - show "To [Account]"
                    const receiptAccounts = otherSideLines
                        .filter(l => parseFloat(String(l.credit).replace(/,/g, '')) > 0)
                        .map(l => {
                            const accountName = getAccountName(String(l.account).trim());
                            return accountName;
                        })
                        .filter(Boolean);
                    
                    // For payments: Cash credited, so other accounts are debited - show "By [Account]"
                    const paymentAccounts = otherSideLines
                        .filter(l => parseFloat(String(l.debit).replace(/,/g, '')) > 0)
                        .map(l => {
                            const accountName = getAccountName(String(l.account).trim());
                            return accountName;
                        })
                        .filter(Boolean);
                    
                    const receiptParticulars = receiptAccounts.length > 0 
                        ? receiptAccounts.map(acc => `To ${acc}`).join(", ")
                        : (v.narration || "Cash Receipt");
                    
                    const paymentParticulars = paymentAccounts.length > 0
                        ? paymentAccounts.map(acc => `By ${acc}`).join(", ")
                        : (v.narration || "Cash Payment");

                    cashTransactions.push({
                        date: format(new Date(v.date), "dd-MMM-yyyy"),
                        voucherId: v.id,
                        receipt,
                        payment,
                        receiptParticulars,
                        paymentParticulars
                    });
                }
            }
        });

        // Sort by date
        cashTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Generate rows in Tally format
        cashTransactions.forEach(trans => {
            if (trans.receipt > 0) {
                balance += trans.receipt;
                rows.push([
                    trans.date,
                    trans.receiptParticulars,
                    trans.voucherId,
                    trans.receipt.toFixed(2),
                    "", // Empty for payment side
                    "", // Empty for payment side
                    "", // Empty for payment side
                    "", // Empty for payment side
                    balance.toFixed(2)
                ]);
            }
            
            if (trans.payment > 0) {
                balance -= trans.payment;
                rows.push([
                    "", // Empty for receipt side
                    "", // Empty for receipt side
                    "", // Empty for receipt side
                    "", // Empty for receipt side
                    trans.date,
                    trans.paymentParticulars,
                    trans.voucherId,
                    trans.payment.toFixed(2),
                    balance.toFixed(2)
                ]);
            }
        });

        return { headers, rows };
    };

    // Generate Bank Book (Tally Format - showing other side account details, combined for all banks)
    const generateBankBook = (vouchers: JournalVoucher[]) => {
        // Find all bank accounts used in transactions
        const bankAccounts = ["1520", "1521", "1522"]; // Default bank accounts
        const usedBankAccounts = new Set<string>();
        
        // Also check for any account that might be a bank account
        vouchers.forEach(v => {
            v.lines.forEach(line => {
                const accountCode = String(line.account).trim();
                // Check if it's a bank account (starts with 152 or is in our list, or type is Bank)
                const account = allAccounts.find(a => a.code === accountCode);
                if (bankAccounts.includes(accountCode) || 
                    (accountCode.startsWith('152')) ||
                    (account && account.type === 'Bank')) {
                    usedBankAccounts.add(accountCode);
                }
            });
        });

        // Tally format: Double column format with Receipt side (left) and Payment side (right)
        const headers = ["Date", "Particulars", "Voucher No.", "Receipt", "Date", "Particulars", "Voucher No.", "Payment", "Balance"];
        const allRows: (string | number)[][] = [];
        const bankBalances: Record<string, number> = {};
        
        // Initialize balances
        Array.from(usedBankAccounts).forEach(acc => bankBalances[acc] = 0);

        // Process each voucher and extract bank transactions
        const bankTransactions: Array<{
            date: string;
            voucherId: string;
            bankAccount: string;
            bankName: string;
            receipt: number;
            payment: number;
            receiptParticulars: string;
            paymentParticulars: string;
        }> = [];

        vouchers.forEach(v => {
            v.lines.forEach(line => {
                const accountCode = String(line.account).trim();
                if (usedBankAccounts.has(accountCode)) {
                    const receipt = parseFloat(String(line.debit).replace(/,/g, '')) || 0;
                    const payment = parseFloat(String(line.credit).replace(/,/g, '')) || 0;
                    
                    if (receipt > 0 || payment > 0) {
                        // Find the other side accounts (contra accounts)
                        const otherSideLines = v.lines.filter(l => String(l.account).trim() !== accountCode);
                        
                        // For receipts: Bank debited, so other accounts are credited - show "To [Account]"
                        const receiptAccounts = otherSideLines
                            .filter(l => parseFloat(String(l.credit).replace(/,/g, '')) > 0)
                            .map(l => {
                                const accountName = getAccountName(String(l.account).trim());
                                return accountName;
                            })
                            .filter(Boolean);
                        
                        // For payments: Bank credited, so other accounts are debited - show "By [Account]"
                        const paymentAccounts = otherSideLines
                            .filter(l => parseFloat(String(l.debit).replace(/,/g, '')) > 0)
                            .map(l => {
                                const accountName = getAccountName(String(l.account).trim());
                                return accountName;
                            })
                            .filter(Boolean);
                        
                        const receiptParticulars = receiptAccounts.length > 0 
                            ? receiptAccounts.map(acc => `To ${acc}`).join(", ")
                            : (v.narration || "Bank Receipt");
                        
                        const paymentParticulars = paymentAccounts.length > 0
                            ? paymentAccounts.map(acc => `By ${acc}`).join(", ")
                            : (v.narration || "Bank Payment");

                        bankTransactions.push({
                            date: format(new Date(v.date), "dd-MMM-yyyy"),
                            voucherId: v.id,
                            bankAccount: accountCode,
                            bankName: getAccountName(accountCode),
                            receipt,
                            payment,
                            receiptParticulars,
                            paymentParticulars
                        });
                    }
                }
            });
        });

        // Sort by date, then by bank account
        bankTransactions.sort((a, b) => {
            const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
            if (dateCompare !== 0) return dateCompare;
            return a.bankAccount.localeCompare(b.bankAccount);
        });

        // Generate rows in Tally format - combine all banks in one book
        let currentBank = "";
        bankTransactions.forEach(trans => {
            // Add bank name header when bank changes
            if (trans.bankAccount !== currentBank) {
                if (currentBank !== "") {
                    allRows.push(["", "", "", "", "", "", "", "", ""]); // Separator
                }
                allRows.push([`Bank: ${trans.bankName}`, "", "", "", "", "", "", "", ""]);
                currentBank = trans.bankAccount;
            }

            if (trans.receipt > 0) {
                bankBalances[trans.bankAccount] = (bankBalances[trans.bankAccount] || 0) + trans.receipt;
                allRows.push([
                    trans.date,
                    trans.receiptParticulars,
                    trans.voucherId,
                    trans.receipt.toFixed(2),
                    "", // Empty for payment side
                    "", // Empty for payment side
                    "", // Empty for payment side
                    "", // Empty for payment side
                    bankBalances[trans.bankAccount].toFixed(2)
                ]);
            }
            
            if (trans.payment > 0) {
                bankBalances[trans.bankAccount] = (bankBalances[trans.bankAccount] || 0) - trans.payment;
                allRows.push([
                    "", // Empty for receipt side
                    "", // Empty for receipt side
                    "", // Empty for receipt side
                    "", // Empty for receipt side
                    trans.date,
                    trans.paymentParticulars,
                    trans.voucherId,
                    trans.payment.toFixed(2),
                    bankBalances[trans.bankAccount].toFixed(2)
                ]);
            }
        });

        return { headers, rows: allRows };
    };

    // Generate Purchase Book (Tally Format)
    const generatePurchaseBook = (vouchers: JournalVoucher[]) => {
        const purchaseAccounts = ["5010", "5050"]; // Purchase accounts
        const headers = ["Date", "Voucher No.", "Supplier Name", "Bill No./Ref", "Particulars", "Purchase Amount", "GST Amount", "Total Amount"];
        const rows: (string | number)[][] = [];
        let totalPurchase = 0;
        let totalGST = 0;
        let grandTotal = 0;

        vouchers.forEach(v => {
            const purchaseLines = v.lines.filter(l => purchaseAccounts.includes(String(l.account).trim()));
            if (purchaseLines.length > 0) {
                const purchaseAmount = purchaseLines.reduce((sum, l) => 
                    sum + (parseFloat(String(l.debit).replace(/,/g, '')) || 0), 0);
                
                // Find GST accounts (Input CGST, Input SGST, Input IGST)
                const gstAccounts = ["2110", "2421", "2111", "2422", "2112", "2423"]; // CGST, SGST, IGST Input
                const gstAmount = v.lines
                    .filter(l => gstAccounts.includes(String(l.account).trim()))
                    .reduce((sum, l) => sum + (parseFloat(String(l.debit).replace(/,/g, '')) || 0), 0);
                
                const total = purchaseAmount + gstAmount;
                totalPurchase += purchaseAmount;
                totalGST += gstAmount;
                grandTotal += total;

                // Find vendor/party
                const vendorLine = v.lines.find(l => 
                    vendors.some(vendor => vendor.id === String(l.account).trim())
                );
                const supplierName = vendorLine ? getAccountName(String(vendorLine.account).trim()) : 
                    (v.narration?.includes('from') ? v.narration.split('from')[1]?.trim() : '');

                // Extract bill number from narration if available
                const billRef = v.id || (v.narration?.match(/Bill[#\s:]*([A-Z0-9\-]+)/i)?.[1] || '');

                rows.push([
                    format(new Date(v.date), "dd-MMM-yyyy"),
                    v.id,
                    supplierName || "Not Specified",
                    billRef,
                    v.narration || "Purchase",
                    purchaseAmount.toFixed(2),
                    gstAmount.toFixed(2),
                    total.toFixed(2)
                ]);
            }
        });

        // Sort by date
        rows.sort((a, b) => {
            const dateA = new Date(a[0] as string);
            const dateB = new Date(b[0] as string);
            return dateA.getTime() - dateB.getTime();
        });

        // Add totals row
        if (rows.length > 0) {
            rows.push(["", "", "", "", "TOTAL", totalPurchase.toFixed(2), totalGST.toFixed(2), grandTotal.toFixed(2)]);
        }

        return { headers, rows };
    };

    // Generate Sales Book (Tally Format)
    const generateSalesBook = (vouchers: JournalVoucher[]) => {
        const salesAccount = "4010"; // Sales Revenue
        const headers = ["Date", "Invoice No.", "Customer Name", "Ref No.", "Particulars", "Sales Amount", "GST Amount", "Total Amount"];
        const rows: (string | number)[][] = [];
        let totalSales = 0;
        let totalGST = 0;
        let grandTotal = 0;

        const salesVouchers = vouchers.filter(v => 
            v.id && (v.id.startsWith("INV-") || v.id.startsWith("SI-")) && !v.reverses
        );

        salesVouchers.forEach(v => {
            // Find sales account line
            const salesLine = v.lines.find(l => String(l.account).trim() === salesAccount);
            const salesAmount = salesLine ? 
                parseFloat(String(salesLine.credit).replace(/,/g, '')) || 0 : 0;
            
            // Find GST accounts (Output CGST, Output SGST, Output IGST)
            const gstAccounts = ["2110", "2421", "2111", "2422", "2112", "2423"]; // CGST, SGST, IGST Output
            const gstAmount = v.lines
                .filter(l => gstAccounts.includes(String(l.account).trim()))
                .reduce((sum, l) => sum + (parseFloat(String(l.credit).replace(/,/g, '')) || 0), 0);
            
            const total = salesAmount + gstAmount;
            totalSales += salesAmount;
            totalGST += gstAmount;
            grandTotal += total;

            // Find customer/party
            const customerLine = v.lines.find(l => 
                customers.some(customer => customer.id === String(l.account).trim())
            );
            const customerName = customerLine ? getAccountName(String(customerLine.account).trim()) : 
                (v.narration?.includes('to') ? v.narration.split('to')[1]?.trim() : '');

            rows.push([
                format(new Date(v.date), "dd-MMM-yyyy"),
                v.id,
                customerName || "Not Specified",
                "", // Ref No. - can be extracted from narration if available
                v.narration || "Sales Invoice",
                salesAmount.toFixed(2),
                gstAmount.toFixed(2),
                total.toFixed(2)
            ]);
        });

        // Sort by date
        rows.sort((a, b) => {
            const dateA = new Date(a[0] as string);
            const dateB = new Date(b[0] as string);
            return dateA.getTime() - dateB.getTime();
        });

        // Add totals row
        if (rows.length > 0) {
            rows.push(["", "", "", "", "TOTAL", totalSales.toFixed(2), totalGST.toFixed(2), grandTotal.toFixed(2)]);
        }

        return { headers, rows };
    };

    // Generate Journal Register (Tally Format)
    const generateJournalRegister = (vouchers: JournalVoucher[]) => {
        const headers = ["Date", "Voucher Type", "Voucher No.", "Narration", "Ledger Account", "Debit", "Credit"];
        const rows: (string | number)[][] = [];
        let totalDebit = 0;
        let totalCredit = 0;

        vouchers.forEach(v => {
            const voucherDate = format(new Date(v.date), "dd-MMM-yyyy");
            const voucherType = v.id?.startsWith("INV-") ? "Sales" : 
                               v.id?.startsWith("PV-") ? "Payment" :
                               v.id?.startsWith("RV-") ? "Receipt" : 
                               v.id?.startsWith("JV-") ? "Journal" : "Journal";
            
            // First row: Voucher header with narration
            rows.push([
                voucherDate,
                voucherType,
                v.id,
                v.narration || "Journal Entry",
                "",
                "",
                ""
            ]);

            // Account lines with indentation
            v.lines.forEach((line) => {
                const debit = parseFloat(String(line.debit).replace(/,/g, '')) || 0;
                const credit = parseFloat(String(line.credit).replace(/,/g, '')) || 0;
                totalDebit += debit;
                totalCredit += credit;

                const accountName = getAccountName(String(line.account).trim());
                rows.push([
                    "",
                    "",
                    "",
                    "",
                    `    ${accountName}`, // Indented for ledger accounts
                    debit > 0 ? debit.toFixed(2) : "",
                    credit > 0 ? credit.toFixed(2) : ""
                ]);
            });

            // Blank row between vouchers
            rows.push(["", "", "", "", "", "", ""]);
        });

        // Add totals row
        rows.push(["", "", "", "", "TOTAL", totalDebit.toFixed(2), totalCredit.toFixed(2)]);

        return { headers, rows };
    };

    // Generate Ledger Summary (Tally Format)
    const generateLedgerSummary = (vouchers: JournalVoucher[]) => {
        const headers = ["Ledger Name", "Group/Type", "Opening Balance", "Debit Total", "Credit Total", "Closing Balance"];
        const rows: (string | number)[][] = [];
        const accountBalances: Record<string, { debit: number; credit: number; opening: number; type: string }> = {};

        // Initialize all accounts with their types
        allAccounts.forEach(acc => {
            accountBalances[acc.code] = { debit: 0, credit: 0, opening: 0, type: acc.type };
        });
        customers.forEach(c => {
            accountBalances[c.id] = { debit: 0, credit: 0, opening: 0, type: "Customer" };
        });
        vendors.forEach(v => {
            accountBalances[v.id] = { debit: 0, credit: 0, opening: 0, type: "Vendor" };
        });

        // Calculate balances from vouchers
        vouchers.forEach(v => {
            v.lines.forEach(line => {
                const accountCode = String(line.account).trim();
                if (!accountBalances[accountCode]) {
                    const account = allAccounts.find(a => a.code === accountCode);
                    accountBalances[accountCode] = { 
                        debit: 0, 
                        credit: 0, 
                        opening: 0,
                        type: account?.type || "Other"
                    };
                }
                accountBalances[accountCode].debit += parseFloat(String(line.debit).replace(/,/g, '')) || 0;
                accountBalances[accountCode].credit += parseFloat(String(line.credit).replace(/,/g, '')) || 0;
            });
        });

        // Group accounts by type and sort
        const accountsByType: Record<string, Array<[string, typeof accountBalances[string]]>> = {};
        
        Object.entries(accountBalances).forEach(([code, balance]) => {
            if (balance.debit > 0 || balance.credit > 0 || balance.opening !== 0) {
                const type = balance.type;
                if (!accountsByType[type]) {
                    accountsByType[type] = [];
                }
                accountsByType[type].push([code, balance]);
            }
        });

        // Sort types and accounts within each type
        const typeOrder = ["Assets", "Cash", "Bank", "Customer", "Vendor", "Liabilities", "Equity", "Revenue", "Expense", "Other"];
        const sortedTypes = Object.keys(accountsByType).sort((a, b) => {
            const indexA = typeOrder.indexOf(a);
            const indexB = typeOrder.indexOf(b);
            if (indexA === -1 && indexB === -1) return a.localeCompare(b);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });

        // Generate rows grouped by type
        sortedTypes.forEach(type => {
            // Add type header
            rows.push([type, "", "", "", "", ""]);
            
            const accounts = accountsByType[type].sort((a, b) => 
                getAccountName(a[0]).localeCompare(getAccountName(b[0]))
            );

            accounts.forEach(([code, balance]) => {
                const closing = balance.opening + balance.debit - balance.credit;
                rows.push([
                    getAccountName(code),
                    "",
                    balance.opening.toFixed(2),
                    balance.debit.toFixed(2),
                    balance.credit.toFixed(2),
                    closing.toFixed(2)
                ]);
            });

            // Add blank row after each group
            rows.push(["", "", "", "", "", ""]);
        });

        return { headers, rows };
    };

    // Generate Trial Balance (Tally Format)
    const generateTrialBalance = (vouchers: JournalVoucher[]) => {
        const headers = ["Particulars", "Debit", "Credit"];
        const rows: (string | number)[][] = [];
        const accountBalances: Record<string, { debit: number; credit: number; type: string }> = {};

        // Initialize all accounts with their types
        allAccounts.forEach(acc => {
            accountBalances[acc.code] = { debit: 0, credit: 0, type: acc.type };
        });
        customers.forEach(c => {
            accountBalances[c.id] = { debit: 0, credit: 0, type: "Customer" };
        });
        vendors.forEach(v => {
            accountBalances[v.id] = { debit: 0, credit: 0, type: "Vendor" };
        });

        // Calculate balances from vouchers
        vouchers.forEach(v => {
            v.lines.forEach(line => {
                const accountCode = String(line.account).trim();
                if (!accountBalances[accountCode]) {
                    const account = allAccounts.find(a => a.code === accountCode);
                    accountBalances[accountCode] = { 
                        debit: 0, 
                        credit: 0,
                        type: account?.type || "Other"
                    };
                }
                accountBalances[accountCode].debit += parseFloat(String(line.debit).replace(/,/g, '')) || 0;
                accountBalances[accountCode].credit += parseFloat(String(line.credit).replace(/,/g, '')) || 0;
            });
        });

        // Group by account type (like Tally)
        const accountsByType: Record<string, Array<[string, typeof accountBalances[string]]>> = {};
        
        Object.entries(accountBalances).forEach(([code, balance]) => {
            // Only include accounts with non-zero balances
            if (balance.debit > 0 || balance.credit > 0) {
                const type = balance.type;
                if (!accountsByType[type]) {
                    accountsByType[type] = [];
                }
                accountsByType[type].push([code, balance]);
            }
        });

        // Sort types in Tally order (Assets, Liabilities, Equity, Income, Expenses)
        const typeOrder = ["Assets", "Cash", "Bank", "Customer", "Vendor", "Liabilities", "Equity", "Revenue", "Expense", "Other"];
        const sortedTypes = Object.keys(accountsByType).sort((a, b) => {
            const indexA = typeOrder.indexOf(a);
            const indexB = typeOrder.indexOf(b);
            if (indexA === -1 && indexB === -1) return a.localeCompare(b);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });

        // Generate rows grouped by type (Tally format)
        sortedTypes.forEach(type => {
            // Add type header (like Tally groups)
            rows.push([type, "", ""]);
            
            const accounts = accountsByType[type].sort((a, b) => 
                getAccountName(a[0]).localeCompare(getAccountName(b[0]))
            );

            accounts.forEach(([code, balance]) => {
                const accountName = getAccountName(code);
                // Determine debit or credit balance
                const netBalance = balance.debit - balance.credit;
                
                if (netBalance > 0) {
                    rows.push([
                        accountName,
                        netBalance.toFixed(2),
                        ""
                    ]);
                } else if (netBalance < 0) {
                    rows.push([
                        accountName,
                        "",
                        Math.abs(netBalance).toFixed(2)
                    ]);
                } else {
                    // If both sides are equal but non-zero, show both
                    if (balance.debit > 0) {
                        rows.push([
                            accountName,
                            balance.debit.toFixed(2),
                            balance.credit.toFixed(2)
                        ]);
                    }
                }
            });
        });

        // Calculate totals
        let totalDebit = 0;
        let totalCredit = 0;
        
        Object.values(accountBalances).forEach(balance => {
            const netBalance = balance.debit - balance.credit;
            if (netBalance > 0) {
                totalDebit += netBalance;
            } else if (netBalance < 0) {
                totalCredit += Math.abs(netBalance);
            } else {
                totalDebit += balance.debit;
                totalCredit += balance.credit;
            }
        });

        // Add blank row before totals
        rows.push(["", "", ""]);
        // Add totals row (Tally format)
        rows.push(["TOTAL", totalDebit.toFixed(2), totalCredit.toFixed(2)]);

        return { headers, rows };
    };

    // Generate header rows for Excel sheets (print-ready format)
    const generateSheetHeaders = (sheetName: string, dateFrom: Date, dateTo: Date, maxCols: number): (string | number)[][] => {
        const branding = readBrandingSettings();
        const headers: (string | number)[][] = [];
        
        // Get address components
        const addressParts = [
            branding.address1,
            branding.address2,
            `${branding.city}, ${branding.state} - ${branding.pincode}`
        ].filter(Boolean);
        const fullAddress = addressParts.join(", ");
        
        // Row 1: Company Name (centered, bold)
        const companyRow: (string | number)[] = new Array(maxCols).fill("");
        companyRow[0] = branding.companyName;
        headers.push(companyRow);
        
        // Row 2: Address
        const addressRow: (string | number)[] = new Array(maxCols).fill("");
        addressRow[0] = fullAddress;
        headers.push(addressRow);
        
        // Row 3: GST Number
        if (branding.gstin) {
            const gstRow: (string | number)[] = new Array(maxCols).fill("");
            gstRow[0] = `GSTIN: ${branding.gstin}`;
            headers.push(gstRow);
        }
        
        // Row 4: Blank row
        headers.push(new Array(maxCols).fill(""));
        
        // Row 5: Main Title - "Books of Accounts"
        const titleRow: (string | number)[] = new Array(maxCols).fill("");
        titleRow[0] = "Books of Accounts";
        headers.push(titleRow);
        
        // Row 6: Period - "From [date] to [date]"
        const periodRow: (string | number)[] = new Array(maxCols).fill("");
        const fromDateStr = format(dateFrom, "dd-MMM-yyyy");
        const toDateStr = format(dateTo, "dd-MMM-yyyy");
        periodRow[0] = `From ${fromDateStr} to ${toDateStr}`;
        headers.push(periodRow);
        
        // Row 7: Sub-heading - Sheet name (e.g., "Cash Book")
        const subTitleRow: (string | number)[] = new Array(maxCols).fill("");
        subTitleRow[0] = sheetName;
        headers.push(subTitleRow);
        
        // Row 8: Blank row
        headers.push(new Array(maxCols).fill(""));
        
        return headers;
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
                    // Get maximum columns for header alignment
                    const maxCols = Math.max(data.headers.length, ...data.rows.map(row => row.length));
                    
                    // Generate print-ready headers
                    const sheetHeaders = generateSheetHeaders(name, from, to, maxCols);
                    const headerRowCount = sheetHeaders.length;
                    
                    // Combine headers + data headers + data rows
                    const allRows = [
                        ...sheetHeaders,
                        data.headers,  // Column headers
                        ...data.rows   // Data rows
                    ];
                    
                    const worksheet = XLSX.utils.aoa_to_sheet(allRows);
                    
                    // Apply formatting (this will format the data headers and rows)
                    applyExcelFormatting(worksheet, data.headers, data.rows, headerRowCount);
                    
                    // Get cell range for styling
                    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
                    const maxCol = range.e.c;
                    const maxRow = range.e.r;
                    
                    // Style header rows (company name, title, etc.)
                    // Row 1: Company Name - Bold, larger font
                    const companyCell = XLSX.utils.encode_cell({ r: 0, c: 0 });
                    if (!worksheet[companyCell]) worksheet[companyCell] = { t: 's', v: sheetHeaders[0][0] };
                    worksheet[companyCell].s = {
                        font: { bold: true, sz: 16 },
                        alignment: { horizontal: 'center' }
                    };
                    
                    // Merge cells for company name across all columns
                    if (!worksheet['!merges']) worksheet['!merges'] = [];
                    worksheet['!merges'].push({
                        s: { r: 0, c: 0 },
                        e: { r: 0, c: maxCol }
                    });
                    
                    // Row 2: Address - Center
                    const addressCell = XLSX.utils.encode_cell({ r: 1, c: 0 });
                    if (!worksheet[addressCell]) worksheet[addressCell] = { t: 's', v: sheetHeaders[1][0] };
                    worksheet[addressCell].s = {
                        alignment: { horizontal: 'center' }
                    };
                    worksheet['!merges'].push({
                        s: { r: 1, c: 0 },
                        e: { r: 1, c: maxCol }
                    });
                    
                    // GST row if exists
                    if (sheetHeaders.length > 3 && sheetHeaders[2][0]) {
                        const gstCell = XLSX.utils.encode_cell({ r: 2, c: 0 });
                        if (!worksheet[gstCell]) worksheet[gstCell] = { t: 's', v: sheetHeaders[2][0] };
                        worksheet[gstCell].s = {
                            alignment: { horizontal: 'center' }
                        };
                        worksheet['!merges'].push({
                            s: { r: 2, c: 0 },
                            e: { r: 2, c: maxCol }
                        });
                    }
                    
                    // Title row - "Books of Accounts" - Bold, larger
                    const titleRowIndex = sheetHeaders.findIndex(row => row[0] === "Books of Accounts");
                    if (titleRowIndex >= 0) {
                        const titleCell = XLSX.utils.encode_cell({ r: titleRowIndex, c: 0 });
                        if (!worksheet[titleCell]) worksheet[titleCell] = { t: 's', v: "Books of Accounts" };
                        worksheet[titleCell].s = {
                            font: { bold: true, sz: 14 },
                            alignment: { horizontal: 'center' }
                        };
                        worksheet['!merges'].push({
                            s: { r: titleRowIndex, c: 0 },
                            e: { r: titleRowIndex, c: maxCol }
                        });
                    }
                    
                    // Period row
                    const periodRowIndex = sheetHeaders.findIndex(row => String(row[0]).startsWith("From"));
                    if (periodRowIndex >= 0) {
                        const periodCell = XLSX.utils.encode_cell({ r: periodRowIndex, c: 0 });
                        if (!worksheet[periodCell]) worksheet[periodCell] = { t: 's', v: sheetHeaders[periodRowIndex][0] };
                        worksheet[periodCell].s = {
                            alignment: { horizontal: 'center' }
                        };
                        worksheet['!merges'].push({
                            s: { r: periodRowIndex, c: 0 },
                            e: { r: periodRowIndex, c: maxCol }
                        });
                    }
                    
                    // Sub-title row (Sheet name) - Bold
                    const subTitleRowIndex = sheetHeaders.findIndex(row => row[0] === name);
                    if (subTitleRowIndex >= 0) {
                        const subTitleCell = XLSX.utils.encode_cell({ r: subTitleRowIndex, c: 0 });
                        if (!worksheet[subTitleCell]) worksheet[subTitleCell] = { t: 's', v: name };
                        worksheet[subTitleCell].s = {
                            font: { bold: true, sz: 12 },
                            alignment: { horizontal: 'center' }
                        };
                        worksheet['!merges'].push({
                            s: { r: subTitleRowIndex, c: 0 },
                            e: { r: subTitleRowIndex, c: maxCol }
                        });
                    }
                    
                    // Style column headers (bold)
                    data.headers.forEach((header, colIndex) => {
                        const headerCell = XLSX.utils.encode_cell({ r: headerRowCount, c: colIndex });
                        if (worksheet[headerCell]) {
                            if (!worksheet[headerCell].s) worksheet[headerCell].s = {};
                            worksheet[headerCell].s.font = { bold: true };
                            worksheet[headerCell].s.fill = { fgColor: { rgb: "E0E0E0" } }; // Light gray background
                            worksheet[headerCell].s.alignment = { horizontal: 'center', vertical: 'center' };
                        }
                    });
                    
                    // Set print area and page setup for better printing
                    const lastRow = maxRow + 1; // Excel is 1-indexed
                    const lastCol = String.fromCharCode(65 + maxCol); // Convert to column letter
                    worksheet['!printArea'] = `A1:${lastCol}${lastRow}`;
                    
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


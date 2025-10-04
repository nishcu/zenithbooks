"use client";

import React, { useContext, useMemo, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, query, where } from "firebase/firestore";
import { useCollection } from "react-firebase-hooks/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Download } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
  TableHeader,
  TableHead,
  TableFooter,
} from "@/components/ui/table";
import { DateRangePicker } from "@/components/date-range-picker";
import { Separator } from "@/components/ui/separator";
import { ReportRow } from "@/components/accounting/report-row";
import { useToast } from "@/hooks/use-toast";
import { AccountingContext, JournalVoucher } from "@/context/accounting-context";
import { allAccounts } from "@/lib/accounts";
import { formatCurrency, cn } from "@/lib/utils";

// --- UTILITY FUNCTIONS ---
interface Account {
  code: string;
  name: string;
  type: string;
  id?: string;
  userId?: string;
}

function isAccount(obj: any): obj is Account {
  return obj && typeof obj.code === "string" && typeof obj.name === "string" && typeof obj.type === "string";
}

function sanitizeNaN(value: number | undefined | null): number {
  if (value === undefined || value === null || isNaN(value) || !isFinite(value)) return 0;
  return value;
}

const DEBIT_INCREASING_TYPES = new Set([
  "Asset",
  "Fixed Asset",
  "Investment",
  "Current Asset",
  "Cash",
  "Bank",
  "Expense",
  "Cost of Goods Sold",
  "Direct Expense",
]);

export default function ProfitAndLossPage() {
  const { toast } = useToast();
  const context = useContext(AccountingContext);
  const journalVouchers: JournalVoucher[] = context?.journalVouchers ?? [];

  const [user] = useAuthState(auth);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const accountsQuery = user ? query(collection(db, "user_accounts"), where("userId", "==", user.uid)) : null;
  const [accountsSnapshot] = useCollection(accountsQuery);

  const userAccounts = useMemo(() => {
    if (!accountsSnapshot) return [];
    return accountsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter(isAccount);
  }, [accountsSnapshot]);

  const cleanAllAccounts = useMemo(() => allAccounts.filter(isAccount), []);
  const combinedAccounts = useMemo<Account[]>(() => [...cleanAllAccounts, ...userAccounts], [cleanAllAccounts, userAccounts]);

  const filteredJournalVouchers = useMemo(() => {
    if (!dateRange?.from) return journalVouchers;
    const fromDate = dateRange.from;
    const toDate = dateRange.to || fromDate;
    return journalVouchers.filter((voucher) => {
      if (!voucher || !voucher.date || typeof voucher.date !== "string") return false;
      const voucherDate = new Date(voucher.date);
      if (isNaN(voucherDate.getTime())) return false;
      return voucherDate >= fromDate && voucherDate <= toDate;
    });
  }, [journalVouchers, dateRange]);

  const accountBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    combinedAccounts.forEach((acc) => {
      balances[acc.code] = 0;
    });
    filteredJournalVouchers.forEach((voucher) => {
      voucher.lines.forEach((line) => {
        const accountDetails = combinedAccounts.find((a) => a.code === line.account);
        if (accountDetails) {
          const debit = parseFloat(line.debit) || 0;
          const credit = parseFloat(line.credit) || 0;
          balances[line.account] += DEBIT_INCREASING_TYPES.has(accountDetails.type) ? debit - credit : credit - debit;
        }
      });
    });
    return balances;
  }, [filteredJournalVouchers, combinedAccounts]);

  const revenueAccounts = useMemo(() => combinedAccounts.filter((a) => a.type === "Revenue"), [combinedAccounts]);
  const cogsAccounts = useMemo(() => combinedAccounts.filter((a) => a.type === "Cost of Goods Sold"), [combinedAccounts]);
  const expenseAccounts = useMemo(() => combinedAccounts.filter((a) => a.type === "Expense"), [combinedAccounts]);

  const totalRevenue = useMemo(() => revenueAccounts.reduce((sum, acc) => sum + (accountBalances[acc.code] || 0), 0), [accountBalances, revenueAccounts]);
  const totalCogs = useMemo(() => cogsAccounts.reduce((sum, acc) => sum + (accountBalances[acc.code] || 0), 0), [accountBalances, cogsAccounts]);
  const totalOperatingExpenses = useMemo(() => expenseAccounts.reduce((sum, acc) => sum + (accountBalances[acc.code] || 0), 0), [accountBalances, expenseAccounts]);

  const grossProfit = sanitizeNaN(totalRevenue) - sanitizeNaN(totalCogs);
  const netProfit = sanitizeNaN(grossProfit) - sanitizeNaN(totalOperatingExpenses);
  const tradingTotal = Math.max(
    sanitizeNaN(totalCogs) + (grossProfit > 0 ? sanitizeNaN(grossProfit) : 0),
    sanitizeNaN(totalRevenue) + (grossProfit < 0 ? -sanitizeNaN(grossProfit) : 0)
  );
  const plTotal = Math.max(
    sanitizeNaN(totalOperatingExpenses) + (grossProfit < 0 ? -sanitizeNaN(grossProfit) : 0) + (netProfit > 0 ? sanitizeNaN(netProfit) : 0),
    (grossProfit > 0 ? sanitizeNaN(grossProfit) : 0) + (netProfit < 0 ? -sanitizeNaN(netProfit) : 0)
  );

  const reportPeriodDescription = useMemo(() => {
    if (dateRange?.from) {
      return `For the period from ${format(dateRange.from, "dd-MMM-yyyy")} to ${format(dateRange.to || dateRange.from, "dd-MMM-yyyy")}`;
    }
    return "For the period covering all transactions";
  }, [dateRange]);

  const handleDownloadCsv = () => {
    const rows = [
      ["Section", "Particulars", "Amount"],
      ["TRADING ACCOUNT (DEBITS)"],
      ["", "To Purchases (COGS)", sanitizeNaN(totalCogs)],
    ];
    if (grossProfit >= 0) rows.push(["", "To Gross Profit c/d", sanitizeNaN(grossProfit)]);
    rows.push(["", "TOTAL", sanitizeNaN(tradingTotal)]);
    rows.push([]);
    rows.push(["TRADING ACCOUNT (CREDITS)"]);
    rows.push(["", "By Sales & Other Income", sanitizeNaN(totalRevenue)]);
    if (grossProfit < 0) rows.push(["", "By Gross Loss c/d", sanitizeNaN(-grossProfit)]);
    rows.push(["", "TOTAL", sanitizeNaN(tradingTotal)]);
    rows.push([]);
    rows.push(["PROFIT & LOSS ACCOUNT (DEBITS)"]);
    if (grossProfit < 0) rows.push(["", "To Gross Loss b/d", sanitizeNaN(-grossProfit)]);
    expenseAccounts.forEach((acc) => {
      rows.push(["", `To ${acc.name}`, sanitizeNaN(accountBalances[acc.code])]);
    });
    if (netProfit >= 0) rows.push(["", "To Net Profit", sanitizeNaN(netProfit)]);
    rows.push(["", "TOTAL", sanitizeNaN(plTotal)]);
    rows.push([]);
    rows.push(["PROFIT & LOSS ACCOUNT (CREDITS)"]);
    if (grossProfit >= 0) rows.push(["", "By Gross Profit b/d", sanitizeNaN(grossProfit)]);
    if (netProfit < 0) rows.push(["", "By Net Loss", sanitizeNaN(-netProfit)]);
    rows.push(["", "TOTAL", sanitizeNaN(plTotal)]);

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.map((cell) => `"${cell}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `P&L_Report_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "CSV Downloaded Successfully!" });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trading and Profit & Loss Account</h1>
          <p className="text-muted-foreground">Summary of revenues, costs, and expenses.</p>
        </div>
        <button className={cn(buttonVariants())} onClick={handleDownloadCsv}>
          <Download className="mr-2 h-4 w-4" />
          Download CSV
        </button>
      </div>

      {/* Date Range */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div>
              <CardTitle>Report Period</CardTitle>
              <CardDescription>Select a date range to generate the report.</CardDescription>
            </div>
            <DateRangePicker onDateChange={setDateRange} />
          </div>
        </CardHeader>
      </Card>

      {/* Trading & P&L T-shape */}
      <Card>
        <CardHeader>
          <CardTitle>Trading and Profit & Loss Account</CardTitle>
          <CardDescription>{reportPeriodDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Trading Account */}
          <div>
            <h3 className="text-xl font-semibold mb-4 text-center">Trading Account</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Particulars</TableHead>
                    <TableHead className="text-right">Amount (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <ReportRow label="To Purchases (COGS)" value={sanitizeNaN(totalCogs)} />
                  {grossProfit >= 0 && <ReportRow label="To Gross Profit c/d" value={sanitizeNaN(grossProfit)} />}
                </TableBody>
                <TableFooter>
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(sanitizeNaN(tradingTotal))}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Particulars</TableHead>
                    <TableHead className="text-right">Amount (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <ReportRow label="By Sales & Other Income" value={sanitizeNaN(totalRevenue)} />
                  {grossProfit < 0 && <ReportRow label="By Gross Loss c/d" value={sanitizeNaN(-grossProfit)} />}
                </TableBody>
                <TableFooter>
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(sanitizeNaN(tradingTotal))}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </div>

          <Separator />

          {/* Profit & Loss Account */}
          <div>
            <h3 className="text-xl font-semibold mb-4 text-center">Profit & Loss Account</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Particulars</TableHead>
                    <TableHead className="text-right">Amount (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grossProfit < 0 && <ReportRow label="To Gross Loss b/d" value={sanitizeNaN(-grossProfit)} />}
                  {expenseAccounts.map((acc) => (
                    <ReportRow key={acc.code} label={`To ${acc.name}`} value={sanitizeNaN(accountBalances[acc.code])} />
                  ))}
                  {netProfit >= 0 && <ReportRow label="To Net Profit" value={sanitizeNaN(netProfit)} />}
                </TableBody>
                <TableFooter>
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(sanitizeNaN(plTotal))}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Particulars</TableHead>
                    <TableHead className="text-right">Amount (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grossProfit >= 0 && <ReportRow label="By Gross Profit b/d" value={sanitizeNaN(grossProfit)} />}
                  {netProfit < 0 && <ReportRow label="By Net Loss" value={sanitizeNaN(-netProfit)} />}
                </TableBody>
                <TableFooter>
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(sanitizeNaN(plTotal))}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </div>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground pt-4">
          Note: This is a system-generated report. Figures are in INR.
        </CardFooter>
      </Card>
    </div>
  );
}

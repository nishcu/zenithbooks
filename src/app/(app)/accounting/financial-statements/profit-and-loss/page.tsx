
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
  TableHeader,
  TableHead,
  TableFooter,
} from "@/components/ui/table";
import { FileDown, CalendarDays, Printer } from "lucide-react";
import { DateRangePicker } from "@/components/date-range-picker";
import { Separator } from "@/components/ui/separator";
import { ReportRow } from "@/components/accounting/report-row";
import { useToast } from "@/hooks/use-toast";
import { useContext, useMemo, useRef } from "react";
import { AccountingContext } from "@/context/accounting-context";
import { allAccounts } from "@/lib/accounts";
import { format } from "date-fns";
import { useCollection } from "react-firebase-hooks/firestore";
import { collection, query, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useReactToPrint } from "react-to-print";
import { formatCurrency } from "@/lib/utils";


export default function ProfitAndLossPage() {
    const { toast } = useToast();
    const { journalVouchers, loading } = useContext(AccountingContext)!;
    const [user] = useAuthState(auth);
    const reportRef = useRef(null);

    const handlePrint = useReactToPrint({
        content: () => reportRef.current,
        documentTitle: `P&L_Report_${format(new Date(), "yyyy-MM-dd")}`
    });

    // Fetch custom accounts to include them in calculations
    const accountsQuery = user ? query(collection(db, 'user_accounts'), where("userId", "==", user.uid)) : null;
    const [accountsSnapshot] = useCollection(accountsQuery);
    const userAccounts = useMemo(() => accountsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [], [accountsSnapshot]);

    const combinedAccounts = useMemo(() => {
        return [...allAccounts, ...userAccounts];
    }, [userAccounts]);
    
    const accountBalances = useMemo(() => {
        const balances: Record<string, number> = {};

        combinedAccounts.forEach((acc: any) => {
            balances[acc.code] = 0;
        });

        journalVouchers.forEach(voucher => {
            voucher.lines.forEach(line => {
                if (balances.hasOwnProperty(line.account)) {
                    const accountDetails = combinedAccounts.find((a: any) => a.code === line.account);
                    const debit = parseFloat(line.debit);
                    const credit = parseFloat(line.credit);

                    if (accountDetails && ['Asset', 'Expense', 'Cost of Goods Sold'].includes(accountDetails.type)) {
                        balances[line.account] += debit - credit;
                    } else { // Liability, Equity, Revenue, Other Income
                        balances[line.account] += credit - debit;
                    }
                }
            });
        });
        return balances;
    }, [journalVouchers, combinedAccounts]);
    
    const revenueAccounts = combinedAccounts.filter((a: any) => a.type === 'Revenue' || a.type === 'Other Income');
    const cogsAccounts = combinedAccounts.filter((a: any) => a.type === 'Cost of Goods Sold');
    const expenseAccounts = combinedAccounts.filter((a: any) => a.type === 'Expense');

    const totalRevenue = useMemo(() => revenueAccounts.reduce((sum, acc: any) => {
        // Sales returns (Credit Notes) are debits to sales accounts, so they naturally reduce the balance.
        return sum + (accountBalances[acc.code] || 0)
    }, 0), [accountBalances, revenueAccounts]);

    const totalCogs = useMemo(() => cogsAccounts.reduce((sum, acc: any) => {
        // Purchase returns (Debit Notes) are credits to purchase accounts, reducing the balance.
        return sum + (accountBalances[acc.code] || 0)
    }, 0), [accountBalances, cogsAccounts]);
    
    const grossProfit = totalRevenue - totalCogs;
    
    const tradingDebits = totalCogs + (grossProfit >= 0 ? grossProfit : 0);
    const tradingCredits = totalRevenue + (grossProfit < 0 ? -grossProfit : 0);
    const tradingTotal = Math.max(tradingDebits, tradingCredits);
    
    const operatingExpenses = expenseAccounts;
    const totalOperatingExpenses = operatingExpenses.reduce((sum, acc: any) => sum + (accountBalances[acc.code] || 0), 0);
    
    const grossProfitBroughtDown = grossProfit >= 0 ? grossProfit : 0;
    const grossLossBroughtDown = grossProfit < 0 ? -grossProfit : 0;
    
    // Assuming 'Other Income' is part of totalRevenue now
    const plCreditSideTotal = grossProfitBroughtDown;
    const plDebitSideTotal = totalOperatingExpenses + grossLossBroughtDown;
    
    const netProfit = plCreditSideTotal - plDebitSideTotal;
    
    const finalPlDebits = plDebitSideTotal + (netProfit >= 0 ? netProfit : 0);
    const finalPlCredits = plCreditSideTotal + (netProfit < 0 ? -netProfit : 0);
    const plTotal = Math.max(finalPlDebits, finalPlCredits);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trading and Profit &amp; Loss Account</h1>
          <p className="text-muted-foreground">
            Summary of revenues, costs, and expenses in a horizontal T-form.
          </p>
        </div>
        <Button onClick={handlePrint}>
          <Printer className="mr-2"/>
          Print / Save PDF
        </Button>
      </div>

       <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                    <div>
                        <CardTitle>Report Period</CardTitle>
                        <CardDescription>Select a date range to generate the report. (Currently shows live data)</CardDescription>
                    </div>
                    <DateRangePicker onDateChange={() => {}} />
                </div>
            </CardHeader>
        </Card>
      
      <div ref={reportRef} className="print:p-8">
        <Card>
            <CardHeader>
                <CardTitle>Trading and Profit &amp; Loss Account</CardTitle>
                <CardDescription>For the period from 01-Apr-2023 to 31-Mar-2024 (Live Data)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Trading Account Section */}
              <div>
                  <h3 className="text-xl font-semibold mb-4 text-center">Trading Account</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                      {/* Debits Column */}
                      <Table>
                          <TableHeader><TableRow><TableHead>Particulars</TableHead><TableHead className="text-right">Amount (₹)</TableHead></TableRow></TableHeader>
                          <TableBody>
                              <ReportRow label="To Purchases (COGS)" value={totalCogs} />
                              {grossProfit >= 0 && <ReportRow label="To Gross Profit c/d" value={grossProfit} />}
                          </TableBody>
                           <TableFooter>
                              <TableRow className="font-bold bg-muted/50">
                                  <TableCell>Total</TableCell>
                                  <TableCell className="text-right font-mono">{formatCurrency(tradingTotal)}</TableCell>
                              </TableRow>
                          </TableFooter>
                      </Table>
                      {/* Credits Column */}
                      <Table>
                          <TableHeader><TableRow><TableHead>Particulars</TableHead><TableHead className="text-right">Amount (₹)</TableHead></TableRow></TableHeader>
                          <TableBody>
                              <ReportRow label="By Sales &amp; Other Income" value={totalRevenue} />
                              {grossProfit < 0 && <ReportRow label="By Gross Loss c/d" value={-grossProfit} />}
                          </TableBody>
                           <TableFooter>
                              <TableRow className="font-bold bg-muted/50">
                                  <TableCell>Total</TableCell>
                                  <TableCell className="text-right font-mono">{formatCurrency(tradingTotal)}</TableCell>
                              </TableRow>
                          </TableFooter>
                      </Table>
                  </div>
              </div>

              <Separator/>

              {/* Profit & Loss Account Section */}
               <div>
                  <h3 className="text-xl font-semibold mb-4 text-center">Profit &amp; Loss Account</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                      {/* Debits Column */}
                      <Table>
                          <TableHeader><TableRow><TableHead>Particulars</TableHead><TableHead className="text-right">Amount (₹)</TableHead></TableRow></TableHeader>
                          <TableBody>
                               {grossProfit < 0 && <ReportRow label="To Gross Loss b/d" value={-grossProfit} />}
                               {operatingExpenses.map((acc: any) => (
                                  <ReportRow key={acc.code} label={`To ${acc.name}`} value={accountBalances[acc.code] || 0} />
                               ))}
                               {netProfit >= 0 && <ReportRow label="To Net Profit" value={netProfit} />}
                          </TableBody>
                           <TableFooter>
                              <TableRow className="font-bold bg-muted/50">
                                  <TableCell>Total</TableCell>
                                  <TableCell className="text-right font-mono">{formatCurrency(plTotal)}</TableCell>
                              </TableRow>
                          </TableFooter>
                      </Table>
                      {/* Credits Column */}
                      <Table>
                          <TableHeader><TableRow><TableHead>Particulars</TableHead><TableHead className="text-right">Amount (₹)</TableHead></TableRow></TableHeader>
                          <TableBody>
                              {grossProfit >= 0 && <ReportRow label="By Gross Profit b/d" value={grossProfit} />}
                              {netProfit < 0 && <ReportRow label="By Net Loss" value={-netProfit} />}
                          </TableBody>
                           <TableFooter>
                              <TableRow className="font-bold bg-muted/50">
                                  <TableCell>Total</TableCell>
                                  <TableCell className="text-right font-mono">{formatCurrency(plTotal)}</TableCell>
                              </TableRow>
                          </TableFooter>
                      </Table>
                  </div>
              </div>
              
            </CardContent>
             <CardFooter className="text-xs text-muted-foreground pt-4">
                Note: This is a system-generated report based on ledger balances. Figures are in INR.
            </CardFooter>
        </Card>
      </div>
    </div>
  );
}

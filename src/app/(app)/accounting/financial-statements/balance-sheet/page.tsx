
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FileDown, Calendar as CalendarIcon, Printer } from "lucide-react";
import { ReportRow } from "@/components/accounting/report-row";
import { useToast } from "@/hooks/use-toast";
import { useState, useContext, useMemo, useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn, formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { AccountingContext } from "@/context/accounting-context";
import { allAccounts } from "@/lib/accounts";
import { useCollection } from "react-firebase-hooks/firestore";
import { collection, query, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useReactToPrint } from "react-to-print";


export default function BalanceSheetPage() {
    const { toast } = useToast();
    const { journalVouchers } = useContext(AccountingContext)!;
    const [user] = useAuthState(auth);
    const [date, setDate] = useState<Date | undefined>(new Date());
    const reportRef = useRef(null);

    const handlePrint = useReactToPrint({
        content: () => reportRef.current,
        documentTitle: `Balance_Sheet_${format(date || new Date(), "yyyy-MM-dd")}`
    });

    const customersQuery = user ? query(collection(db, 'customers'), where("userId", "==", user.uid)) : null;
    const [customersSnapshot] = useCollection(customersQuery);
    const customers = useMemo(() => customersSnapshot?.docs.map(doc => ({ id: doc.id, name: doc.data().name, type: 'Asset' })) || [], [customersSnapshot]);
    
    const vendorsQuery = user ? query(collection(db, 'vendors'), where("userId", "==", user.uid)) : null;
    const [vendorsSnapshot] = useCollection(vendorsQuery);
    const vendors = useMemo(() => vendorsSnapshot?.docs.map(doc => ({ id: doc.id, name: doc.data().name, type: 'Liability' })) || [], [vendorsSnapshot]);
    
    const accountsQuery = user ? query(collection(db, 'user_accounts'), where("userId", "==", user.uid)) : null;
    const [accountsSnapshot] = useCollection(accountsQuery);
    const userAccounts = useMemo(() => accountsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [], [accountsSnapshot]);

    const combinedAccounts = useMemo(() => {
        return [
            ...allAccounts,
            ...userAccounts,
            ...customers.map(c => ({ code: c.id, name: c.name, type: c.type })),
            ...vendors.map(v => ({ code: v.id, name: v.name, type: v.type })),
        ];
    }, [userAccounts, customers, vendors]);


    const accountBalances = useMemo(() => {
        const balances: Record<string, number> = {};

        combinedAccounts.forEach((acc: any) => { balances[acc.code] = acc.openingWdv || 0; });
        
        journalVouchers.forEach(voucher => {
            voucher.lines.forEach(line => {
                if (!balances.hasOwnProperty(line.account)) {
                    balances[line.account] = 0;
                }
                 const debit = parseFloat(line.debit);
                 const credit = parseFloat(line.credit);
                 balances[line.account] += debit - credit;
            });
        });
        
        Object.keys(balances).forEach(key => {
            const accDetails = combinedAccounts.find((a: any) => a.code === key);
            if (accDetails && ["Liability", "Equity", "Revenue", "Other Income"].includes(accDetails.type)) {
                if(balances[key] !== 0) balances[key] = -balances[key];
            }
        });
        
        return balances;
    }, [journalVouchers, combinedAccounts]);
    
    // Calculate P&L for Retained Earnings
    const netProfit = useMemo(() => {
        const revenueAccounts = combinedAccounts.filter((a: any) => ['Revenue', 'Other Income'].includes(a.type));
        const expenseAccounts = combinedAccounts.filter((a: any) => ['Expense', 'Cost of Goods Sold', 'Depreciation'].includes(a.type));
        
        const totalRevenue = revenueAccounts.reduce((sum, acc: any) => sum + (accountBalances[acc.code] || 0), 0);
        const totalExpenses = expenseAccounts.reduce((sum, acc: any) => sum + (accountBalances[acc.code] || 0), 0);
        
        return totalRevenue - totalExpenses;
    }, [accountBalances, combinedAccounts]);

    // Aggregate Liabilities and Equity
    const capitalAccount = (accountBalances['2010'] || 0);
    const reservesAndSurplus = (accountBalances['2020'] || 0) + (accountBalances['2030'] || 0) + netProfit;
    
    const longTermLiabilitiesAccounts = combinedAccounts.filter((a: any) => a.type === 'Long Term Liability');
    const longTermLiabilities = longTermLiabilitiesAccounts.reduce((sum, acc: any) => sum + (accountBalances[acc.code] || 0), 0);

    const currentLiabilitiesAccounts = combinedAccounts.filter((a: any) => a.type === 'Current Liability' || a.type === 'Vendor');
    const totalCurrentLiabilities = currentLiabilitiesAccounts.reduce((sum, acc: any) => sum + (accountBalances[acc.code] || 0), 0);

    const totalEquityAndLiabilities = capitalAccount + reservesAndSurplus + longTermLiabilities + totalCurrentLiabilities;

    // Aggregate Assets
    const fixedAssetsAccounts = combinedAccounts.filter((a: any) => a.type === 'Fixed Asset');
    const netFixedAssets = fixedAssetsAccounts.reduce((sum, acc: any) => sum + (accountBalances[acc.code] || 0), 0);
    
    const investmentAccounts = combinedAccounts.filter((a: any) => a.type === 'Investment');
    const totalInvestments = investmentAccounts.reduce((sum, acc: any) => sum + (accountBalances[acc.code] || 0), 0);
    
    const receivableAccounts = combinedAccounts.filter((a: any) => a.type === 'Customer' || a.code === '1320');
    const totalReceivables = receivableAccounts.reduce((sum, acc: any) => sum + (accountBalances[acc.code] || 0), 0);
    
    const currentAssetsAccounts = combinedAccounts.filter((a: any) => ['Current Asset', 'Cash', 'Bank'].includes(a.type) && a.code !== '1320');
    const totalOtherCurrentAssets = currentAssetsAccounts.reduce((sum, acc: any) => sum + (accountBalances[acc.code] || 0), 0);
    
    const totalAssets = netFixedAssets + totalInvestments + totalReceivables + totalOtherCurrentAssets;


    // Schedules
    const depreciationSchedule = useMemo(() => {
        return userAccounts.filter((a: any) => a.type === 'Fixed Asset').map((asset: any) => {
            const openingWdv = asset.openingWdv || 0;
            const additions = 0; // Simplified for now
            const depreciationRate = asset.depreciationRate || 0;
            const depreciation = openingWdv * (depreciationRate / 100);
            const closingWdv = openingWdv - depreciation;
            return {
                asset: asset.name,
                openingWdv,
                additions,
                depreciationRate,
                depreciation,
                closingWdv,
            };
        });
    }, [userAccounts]);
    const totalDepreciation = depreciationSchedule.reduce((acc, item) => acc + item.depreciation, 0);

    const capitalAccounts = useMemo(() => {
        if (journalVouchers.length === 0 && capitalAccount === 0) return [];
        return [
            { partner: "Owner's Equity", opening: 0, introduced: capitalAccount, drawings: 0, profitShare: netProfit, closing: capitalAccount + reservesAndSurplus },
        ];
    }, [journalVouchers, netProfit, capitalAccount, reservesAndSurplus]);
    
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Balance Sheet</h1>
          <p className="text-muted-foreground">
            A snapshot of your company's financial health.
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
                        <CardTitle>Report Date</CardTitle>
                        <CardDescription>Select a date to generate the balance sheet. (Currently shows live data)</CardDescription>
                    </div>
                     <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                            "w-full md:w-[280px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, "dd MMM, yyyy") : <span>Pick a date</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                </div>
            </CardHeader>
        </Card>
      
      <div ref={reportRef} className="print:p-8">
        <Card>
            <CardHeader>
                <CardTitle>Balance Sheet</CardTitle>
                <CardDescription>As on {date ? format(date, "dd MMM, yyyy") : 'selected date'}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  {/* Liabilities + Equity Column */}
                  <div className="w-full">
                      <Table className="w-full">
                          <TableHeader><TableRow><TableHead>Liabilities & Equity</TableHead><TableHead className="text-right">Amount (₹)</TableHead></TableRow></TableHeader>
                          <TableBody>
                              <TableRow><TableCell className="font-semibold">Capital & Reserves</TableCell><TableCell></TableCell></TableRow>
                              <ReportRow label="Capital Account" value={capitalAccount} isSub />
                              <ReportRow label="Reserves & Surplus (incl. P&L)" value={reservesAndSurplus} isSub />
                              
                              <TableRow><TableCell className="font-semibold pt-4">Long-Term Liabilities</TableCell><TableCell></TableCell></TableRow>
                              {longTermLiabilitiesAccounts.map((acc: any) => (
                                  <ReportRow key={acc.code} label={acc.name} value={accountBalances[acc.code] || 0} isSub />
                              ))}

                              <TableRow><TableCell className="font-semibold pt-4">Current Liabilities</TableCell><TableCell></TableCell></TableRow>
                               {currentLiabilitiesAccounts.map((acc: any) => (
                                  <ReportRow key={acc.code} label={acc.name} value={accountBalances[acc.code] || 0} isSub />
                              ))}
                          </TableBody>
                          <TableFooter>
                              <TableRow className="font-bold bg-muted/50">
                                  <TableCell>Total</TableCell>
                                  <TableCell className="text-right font-mono">{formatCurrency(totalEquityAndLiabilities)}</TableCell>
                              </TableRow>
                          </TableFooter>
                      </Table>
                  </div>

                  {/* Assets Column */}
                  <div className="w-full">
                      <Table className="w-full">
                          <TableHeader><TableRow><TableHead>Assets</TableHead><TableHead className="text-right">Amount (₹)</TableHead></TableRow></TableHeader>
                          <TableBody>
                              <TableRow><TableCell className="font-semibold">Fixed Assets</TableCell><TableCell></TableCell></TableRow>
                              {fixedAssetsAccounts.map((acc: any) => (
                                  <ReportRow key={acc.code} label={acc.name} value={accountBalances[acc.code] || 0} isSub />
                              ))}
                              <TableRow><TableCell className="font-semibold pl-8">Net Fixed Assets</TableCell><TableCell className="text-right font-mono font-semibold">{formatCurrency(netFixedAssets)}</TableCell></TableRow>

                              <TableRow><TableCell className="font-semibold pt-4">Investments</TableCell><TableCell className="text-right font-mono">{formatCurrency(totalInvestments)}</TableCell></TableRow>

                              <TableRow><TableCell className="font-semibold pt-4">Current Assets</TableCell><TableCell></TableCell></TableRow>
                              <ReportRow label="Accounts Receivable" value={totalReceivables} isSub />
                              {currentAssetsAccounts.map((acc: any) => (
                                  <ReportRow key={acc.code} label={acc.name} value={accountBalances[acc.code] || 0} isSub />
                              ))}
                          </TableBody>
                          <TableFooter>
                              <TableRow className="font-bold bg-muted/50">
                                  <TableCell>Total</TableCell>
                                  <TableCell className="text-right font-mono">{formatCurrency(totalAssets)}</TableCell>
                              </TableRow>
                          </TableFooter>
                      </Table>
                  </div>
              </div>
              
              {Math.abs(totalAssets - totalEquityAndLiabilities) > 0.01 && (
                   <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive font-semibold text-center">
                      Warning: Balance Sheet is out of balance by {formatCurrency(Math.abs(totalAssets - totalEquityAndLiabilities))}!
                  </div>
              )}
            </CardContent>
             <CardFooter className="text-xs text-muted-foreground pt-4">
                Note: This is a system-generated report. Figures are in INR.
            </CardFooter>
        </Card>

        <Card className="mt-8">
            <CardHeader>
                <CardTitle>Schedules to the Balance Sheet</CardTitle>
                <CardDescription>Detailed breakdown of key Balance Sheet items.</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" defaultValue={["depreciation", "capital-accounts"]} className="w-full">
                  <AccordionItem value="depreciation">
                      <AccordionTrigger>Schedule 1: Depreciation on Fixed Assets</AccordionTrigger>
                      <AccordionContent>
                          <div className="overflow-x-auto">
                              <Table>
                                  <TableHeader>
                                      <TableRow>
                                          <TableHead>Asset</TableHead>
                                          <TableHead className="text-right">Opening WDV</TableHead>
                                          <TableHead className="text-right">Additions</TableHead>
                                          <TableHead className="text-right">Depreciation Rate (%)</TableHead>
                                          <TableHead className="text-right">Depreciation for Year</TableHead>
                                          <TableHead className="text-right">Closing WDV</TableHead>
                                      </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                      {depreciationSchedule.length > 0 ? depreciationSchedule.map((item, index) => (
                                          <TableRow key={index}>
                                              <TableCell className="font-medium">{item.asset}</TableCell>
                                              <TableCell className="text-right font-mono">{formatCurrency(item.openingWdv)}</TableCell>
                                              <TableCell className="text-right font-mono">{formatCurrency(item.additions)}</TableCell>
                                              <TableCell className="text-right">{item.depreciationRate}%</TableCell>
                                              <TableCell className="text-right font-mono">{formatCurrency(item.depreciation)}</TableCell>
                                              <TableCell className="text-right font-mono">{formatCurrency(item.closingWdv)}</TableCell>
                                          </TableRow>
                                      )) : (
                                          <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No fixed asset data found. Add fixed assets in the Chart of Accounts.</TableCell></TableRow>
                                      )}
                                  </TableBody>
                                  <TableFooter>
                                      <TableRow className="font-bold bg-muted/50">
                                          <TableCell colSpan={4}>Total</TableCell>
                                          <TableCell className="text-right font-mono">{formatCurrency(totalDepreciation)}</TableCell>
                                          <TableCell></TableCell>
                                      </TableRow>
                                  </TableFooter>
                              </Table>
                          </div>
                      </AccordionContent>
                  </AccordionItem>
                   <AccordionItem value="capital-accounts">
                      <AccordionTrigger>Schedule 2: Capital Accounts</AccordionTrigger>
                      <AccordionContent>
                          <div className="overflow-x-auto">
                              <Table>
                                  <TableHeader>
                                      <TableRow>
                                          <TableHead>Particulars</TableHead>
                                          {capitalAccounts.map(p => <TableHead key={p.partner} className="text-right">{p.partner}</TableHead>)}
                                          <TableHead className="text-right font-bold">Total</TableHead>
                                      </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                       {capitalAccounts.length > 0 ? (
                                          <>
                                              <TableRow>
                                                  <TableCell className="font-medium">Opening Balance</TableCell>
                                                  {capitalAccounts.map(p => <TableCell key={p.partner} className="text-right font-mono">{formatCurrency(p.opening)}</TableCell>)}
                                                  <TableCell className="text-right font-mono font-bold">{formatCurrency(capitalAccounts.reduce((acc, p) => acc + p.opening, 0))}</TableCell>
                                              </TableRow>
                                              <TableRow>
                                                  <TableCell className="font-medium">Capital Introduced</TableCell>
                                                  {capitalAccounts.map(p => <TableCell key={p.partner} className="text-right font-mono">{formatCurrency(p.introduced)}</TableCell>)}
                                                  <TableCell className="text-right font-mono font-bold">{formatCurrency(capitalAccounts.reduce((acc, p) => acc + p.introduced, 0))}</TableCell>
                                              </TableRow>
                                              <TableRow>
                                                  <TableCell className="font-medium">Drawings</TableCell>
                                                  {capitalAccounts.map(p => <TableCell key={p.partner} className="text-right font-mono">{formatCurrency(p.drawings)}</TableCell>)}
                                                  <TableCell className="text-right font-mono font-bold">{formatCurrency(capitalAccounts.reduce((acc, p) => acc + p.drawings, 0))}</TableCell>
                                              </TableRow>
                                              <TableRow>
                                                  <TableCell className="font-medium">Share of Profit/(Loss)</TableCell>
                                                  {capitalAccounts.map(p => <TableCell key={p.partner} className="text-right font-mono">{formatCurrency(p.profitShare)}</TableCell>)}
                                                  <TableCell className="text-right font-mono font-bold">{formatCurrency(capitalAccounts.reduce((acc, p) => acc + p.profitShare, 0))}</TableCell>
                                              </TableRow>
                                          </>
                                       ) : (
                                          <TableRow><TableCell colSpan={3} className="text-center h-24 text-muted-foreground">No capital account data for this period.</TableCell></TableRow>
                                       )}
                                  </TableBody>
                                  <TableFooter>
                                      <TableRow className="font-bold bg-muted/50">
                                          <TableCell>Closing Balance</TableCell>
                                           {capitalAccounts.map(p => <TableCell key={p.partner} className="text-right font-mono">{formatCurrency(p.closing)}</TableCell>)}
                                          <TableCell className="text-right font-mono">{formatCurrency(capitalAccounts.reduce((acc, p) => acc + p.closing, 0))}</TableCell>
                                      </TableRow>
                                  </TableFooter>
                              </Table>
                          </div>
                      </AccordionContent>
                  </AccordionItem>
              </Accordion>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Printer, FileDown, AlertTriangle, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useContext, useMemo, useRef, FC, ReactNode } from "react";
import { format } from "date-fns";
import { AccountingContext } from "@/context/accounting-context";
import { allAccounts, Account } from "@/lib/accounts";
import { useCollection } from "react-firebase-hooks/firestore";
import { collection, query, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useReactToPrint } from "react-to-print";
import { formatCurrency, cn } from "@/lib/utils";
import { ShareButtons } from "@/components/documents/share-buttons";

// --- Type Definitions ---
type CombinedAccount = Account & { id?: string };
type Balances = Record<string, number>;

// --- Sub-Components ---
const ReportTableRow: FC<{ label: string; amount?: number; isSub?: boolean; isTotal?: boolean; className?: string }> = ({ label, amount, isSub, isTotal, className }) => (
    <TableRow className={cn(isTotal && 'bg-secondary', className)}>
        <TableCell className={cn('font-medium', isSub && 'pl-8', isTotal && 'font-bold')}>{label}</TableCell>
        <TableCell className={cn('text-right font-mono', isTotal && 'font-bold')}>{amount !== undefined ? formatCurrency(amount) : ''}</TableCell>
    </TableRow>
);

// --- Main Component ---
export default function BalanceSheetPage() {
  const { toast } = useToast();
  const { journalVouchers } = useContext(AccountingContext)!;
  const [user] = useAuthState(auth);
  const [isMismatchDialogOpen, setIsMismatchDialogOpen] = useState(false);
  const reportRef = useRef(null);
  const [date, setDate] = useState<Date | undefined>(new Date());

  const handlePrint = useReactToPrint({ content: () => reportRef.current, documentTitle: `Balance_Sheet_${format(date || new Date(), 'yyyy-MM-dd')}` } as any);

  // --- Data Fetching Hooks ---
  const customersQuery = user ? query(collection(db, 'customers'), where('userId', '==', user.uid)) : null;
  const [customersSnapshot] = useCollection(customersQuery);
  const vendorsQuery = user ? query(collection(db, 'vendors'), where('userId', '==', user.uid)) : null;
  const [vendorsSnapshot] = useCollection(vendorsQuery);
  const accountsQuery = user ? query(collection(db, 'user_accounts'), where('userId', '==', user.uid)) : null;
  const [accountsSnapshot] = useCollection(accountsQuery);

  // --- Data & Calculation Logic (Memoized) ---
  const { combinedAccounts, accountBalances, netProfit } = useMemo(() => {
    const safeParseFloat = (value: any): number => {
        const parsed = parseFloat(value);
        return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
    };

    const customers = customersSnapshot?.docs.map(doc => ({ id: doc.id, code: doc.id, name: doc.data().name, type: 'Asset' })) || [];
    const vendors = vendorsSnapshot?.docs.map(doc => ({ id: doc.id, code: doc.id, name: doc.data().name, type: 'Liability' })) || [];
    const userAccounts = accountsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (Account & { id: string})[] || [];
    const combinedAccounts: CombinedAccount[] = [...allAccounts, ...userAccounts, ...customers, ...vendors];

    const balances: Balances = {};
    combinedAccounts.forEach(account => {
        const openingBalance = safeParseFloat(account.openingWdv);
        if (['Liability', 'Equity', 'Revenue', 'Other Income'].includes(account.type)) {
            balances[account.code] = openingBalance;
        } else {
            balances[account.code] = -openingBalance;
        }
    });
    journalVouchers.forEach(voucher => {
        voucher.lines.forEach(line => {
            if (balances[line.account] === undefined) balances[line.account] = 0;
            balances[line.account] += safeParseFloat(line.credit) - safeParseFloat(line.debit);
        });
    });

    const revenue = combinedAccounts.filter(a => ['Revenue', 'Other Income'].includes(a.type)).reduce((sum, acc) => sum + (balances[acc.code] || 0), 0);
    const expenses = combinedAccounts.filter(a => ['Expense', 'Cost of Goods Sold', 'Depreciation'].includes(a.type)).reduce((sum, acc) => sum + (balances[acc.code] || 0), 0);
    const netProfit = revenue + expenses;

    return { combinedAccounts, accountBalances: balances, netProfit };

  }, [customersSnapshot, vendorsSnapshot, accountsSnapshot, journalVouchers]);

  const getBalance = (code: string): number => accountBalances[code] || 0;
  const getDisplayBalance = (code: string, type: 'Asset' | 'Liability'): number => type === 'Asset' ? -getBalance(code) : getBalance(code);

  // --- Liabilities & Equity Rows ---
  const { liabilityRows, totalEquityAndLiabilities } = useMemo(() => {
    const rows: ReactNode[] = [];
    const capitalAccount = getDisplayBalance('2010', 'Liability');
    const reservesAndSurplus = getDisplayBalance('2020', 'Liability') + getDisplayBalance('2030', 'Liability') + netProfit;
    const longTermLiabilitiesAccounts = combinedAccounts.filter(a => a.type === 'Long Term Liability');
    const totalLongTermLiabilities = longTermLiabilitiesAccounts.reduce((sum, acc) => sum + getDisplayBalance(acc.code, 'Liability'), 0);
    const currentLiabilitiesAccounts = combinedAccounts.filter(a => a.type === 'Current Liability' || a.type === 'Vendor');
    const totalCurrentLiabilities = currentLiabilitiesAccounts.reduce((sum, acc) => sum + getDisplayBalance(acc.code, 'Liability'), 0);
    const total = capitalAccount + reservesAndSurplus + totalLongTermLiabilities + totalCurrentLiabilities;

    rows.push(<TableRow key="le-cr-header" className='font-bold'><TableCell colSpan={2}>Capital & Reserves</TableCell></TableRow>);
    rows.push(<ReportTableRow key="le-capital" label="Capital Account" amount={capitalAccount} isSub />);
    rows.push(<ReportTableRow key="le-reserves" label="Reserves & Surplus (incl. P&L)" amount={reservesAndSurplus} isSub />);
    rows.push(<TableRow key="le-ltl-header" className='font-bold'><TableCell colSpan={2}>Long-Term Liabilities</TableCell></TableRow>);
    longTermLiabilitiesAccounts.forEach(acc => rows.push(<ReportTableRow key={`le-${acc.code}`} label={acc.name} amount={getDisplayBalance(acc.code, 'Liability')} isSub />));
    rows.push(<TableRow key="le-cl-header" className='font-bold'><TableCell colSpan={2}>Current Liabilities</TableCell></TableRow>);
    currentLiabilitiesAccounts.forEach(acc => rows.push(<ReportTableRow key={`le-${acc.code}`} label={acc.name} amount={getDisplayBalance(acc.code, 'Liability')} isSub />));
    
    return { liabilityRows: rows, totalEquityAndLiabilities: total };
  }, [combinedAccounts, getDisplayBalance, netProfit]);

  // --- Asset Rows ---
  const { assetRows, totalAssets } = useMemo(() => {
    const rows: ReactNode[] = [];
    const fixedAssetsAccounts = combinedAccounts.filter(a => a.type === 'Fixed Asset');
    const netFixedAssets = fixedAssetsAccounts.reduce((sum, acc) => sum + getDisplayBalance(acc.code, 'Asset'), 0);
    const totalInvestments = combinedAccounts.filter(a => a.type === 'Investment').reduce((sum, acc) => sum + getDisplayBalance(acc.code, 'Asset'), 0);
    const totalReceivables = combinedAccounts.filter(a => a.type === 'Customer' || a.code === '1320').reduce((sum, acc) => sum + getDisplayBalance(acc.code, 'Asset'), 0);
    const otherCurrentAssetsAccounts = combinedAccounts.filter(a => ['Current Asset', 'Cash', 'Bank'].includes(a.type) && a.code !== '1320');
    const totalOtherCurrentAssets = otherCurrentAssetsAccounts.reduce((sum, acc) => sum + getDisplayBalance(acc.code, 'Asset'), 0);
    const totalCurrentAssets = totalReceivables + totalOtherCurrentAssets;
    const total = netFixedAssets + totalInvestments + totalCurrentAssets;

    rows.push(<TableRow key="as-fa-header" className='font-bold'><TableCell colSpan={2}>Fixed Assets</TableCell></TableRow>);
    fixedAssetsAccounts.forEach(acc => rows.push(<ReportTableRow key={`as-${acc.code}`} label={acc.name} amount={getDisplayBalance(acc.code, 'Asset')} isSub />));
    rows.push(<ReportTableRow key="as-nfa-total" label='Net Fixed Assets' amount={netFixedAssets} isTotal />);
    rows.push(<ReportTableRow key="as-inv" label='Investments' amount={totalInvestments} />);
    rows.push(<TableRow key="as-ca-header" className='font-bold'><TableCell colSpan={2}>Current Assets</TableCell></TableRow>);
    rows.push(<ReportTableRow key="as-ar" label="Accounts Receivable" amount={totalReceivables} isSub />);
    otherCurrentAssetsAccounts.forEach(acc => rows.push(<ReportTableRow key={`as-${acc.code}`} label={acc.name} amount={getDisplayBalance(acc.code, 'Asset')} isSub />));
    rows.push(<ReportTableRow key="as-tca-total" label='Total Current Assets' amount={totalCurrentAssets} isTotal />);
    
    return { assetRows: rows, totalAssets: total };
  }, [combinedAccounts, getDisplayBalance]);

  // --- Mismatch & Download Logic ---
  const difference = totalEquityAndLiabilities - totalAssets;
  const isMismatched = Math.abs(difference) > 0.01;
  const handleDownloadCsv = () => { /* Restore this if needed */ toast({ title: "Not Implemented", description: "CSV download will be restored shortly." }) };


  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>Balance Sheet</h1>
          <p className='text-muted-foreground'>A snapshot of your company's financial health.</p>
        </div>
        <div className='flex gap-2 flex-wrap'>
          <ShareButtons
            contentRef={reportRef}
            fileName={`Balance-Sheet-${format(date || new Date(), 'yyyy-MM-dd')}`}
            whatsappMessage={`Check out my Balance Sheet from ZenithBooks`}
            emailSubject="Balance Sheet"
            emailBody="Please find attached the Balance Sheet."
            shareTitle="Balance Sheet"
          />
          <Button variant="outline" onClick={handleDownloadCsv}><FileDown className='mr-2 h-4 w-4' /> Download CSV</Button>
        </div>
      </div>

      <div ref={reportRef} className='p-4 md:p-8'>
        <div className='text-center mb-6'>
          <h2 className='text-xl md:text-2xl font-bold'>Balance Sheet</h2>
          <p className='text-sm md:text-base text-muted-foreground'>As on {format(date || new Date(), 'PPP')}</p>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <BalanceSheetSide title="Liabilities & Equity" total={totalEquityAndLiabilities} rows={liabilityRows} />
          <BalanceSheetSide title="Assets" total={totalAssets} rows={assetRows} />
        </div>

        {isMismatched && (
          <Dialog open={isMismatchDialogOpen} onOpenChange={setIsMismatchDialogOpen}>
             <div className="mt-8 p-4 rounded-md bg-destructive/10 text-destructive font-semibold text-center">
                <div className="flex items-center justify-center gap-4">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        <span>Warning: Totals do not match! Difference: {formatCurrency(difference)}.</span>
                    </div>
                    <DialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="bg-destructive/90 hover:bg-destructive">
                           View Details <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                </div>
            </div>
            <MismatchDialogContent combinedAccounts={combinedAccounts} getBalance={getBalance} />
          </Dialog>
        )}
      </div>
    </div>
  );
}

// --- Updated Sub-Component ---
interface BalanceSheetSideProps { title: string; total: number; rows: ReactNode; }
const BalanceSheetSide: FC<BalanceSheetSideProps> = ({ title, total, rows }) => (
    <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent className="pt-0">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Particulars</TableHead>
                        <TableHead className='text-right'>Amount (₹)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>{rows}</TableBody>
                <TableFooter>
                    <TableRow>
                        <TableCell className='font-bold text-lg'>Total {title}</TableCell>
                        <TableCell className='text-right font-bold text-lg'>{formatCurrency(total)}</TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
        </CardContent>
    </Card>
);

// --- Mismatch Dialog Component ---
interface MismatchDialogContentProps { combinedAccounts: CombinedAccount[]; getBalance: (code: string) => number; }
const MismatchDialogContent: FC<MismatchDialogContentProps> = ({ combinedAccounts, getBalance }) => (
    <DialogContent className="max-w-4xl">
        <DialogHeader>
            <DialogTitle>Balance Sheet Discrepancy</DialogTitle>
            <DialogDescription>
                The total of Liabilities & Equity does not match the total Assets. Below is a list of all accounts and their raw debit/credit balances.
            </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-4 -mr-4 mt-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Code</TableHead><TableHead>Account Name</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Raw Balance (₹)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {combinedAccounts
                        .filter(acc => getBalance(acc.code) !== 0)
                        .sort((a,b) => a.code.localeCompare(b.code))
                        .map((acc) => {
                            const balance = getBalance(acc.code);
                            return (
                                <TableRow key={`mismatch-${acc.code}`}>
                                    <TableCell>{acc.code}</TableCell>
                                    <TableCell>{acc.name}</TableCell>
                                    <TableCell>{acc.type}</TableCell>
                                    <TableCell className={cn('text-right font-mono', balance > 0 ? 'text-green-600' : 'text-red-600')}>{formatCurrency(balance)}</TableCell>
                                </TableRow>
                            )
                        })}
                </TableBody>
            </Table>
        </div>
    </DialogContent>
);
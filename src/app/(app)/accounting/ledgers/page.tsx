'use client';
import { useState, useMemo, useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { UpgradeRequiredAlert } from '@/components/upgrade-required-alert';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRangeSelector } from '@/components/date-range-selector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { ResponsiveTable, ResponsiveTableColumn } from '@/components/ui/responsive-table';
import { allAccounts, Account } from '@/lib/accounts';
import { useCollection } from 'react-firebase-hooks/firestore';
import { formatCurrency } from '@/lib/utils';
import { Calendar, FileText, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { useToast } from '@/hooks/use-toast';

// --- Type Definitions ---
interface JournalVoucher { id: string; date: string; lines: { account: string; debit: number; credit: number }[]; narrative: string; voucherType: string; }
interface LedgerEntry { id: string; date: string; particulars: string; type: string; debit: number; credit: number; balance: number; }
interface StatCardProps { title: string; value: string | number; icon: React.ElementType; loading: boolean; }

// --- Components ---
const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, loading }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent><div className="text-2xl font-bold">{loading ? <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" /> : value}</div></CardContent>
  </Card>
);

const isValidDate = (d: any): d is Date => d instanceof Date && !isNaN(d.getTime());

export default function LedgersPage() {
  // ALL HOOKS MUST BE CALLED UNCONDITIONALLY AT THE TOP LEVEL
  const [user] = useAuthState(auth);
  const userDocRef = user ? doc(db, 'users', user.uid) : null;
  const [userData] = useDocumentData(userDocRef);
  const subscriptionPlan = userData?.subscriptionPlan || 'freemium';
  const isFreemium = subscriptionPlan === 'freemium';

  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>();
  const [accounts, setAccounts] = useState<(Account & { id?: string })[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [journalVouchers, setJournalVouchers] = useState<JournalVoucher[]>([]);

  // --- Data Fetching ---
  const accountsQuery = user ? query(collection(db, 'user_accounts'), where('userId', '==', user.uid)) : null;
  const [userAccountsSnapshot] = useCollection(accountsQuery);
  const customersQuery = user ? query(collection(db, 'customers'), where('userId', '==', user.uid)) : null;
  const [customersSnapshot] = useCollection(customersQuery);
  const vendorsQuery = user ? query(collection(db, 'vendors'), where('userId', '==', user.uid)) : null;
  const [vendorsSnapshot] = useCollection(vendorsQuery);

  // --- Effects ---
  useEffect(() => {
    const combined = [...allAccounts];
    if (userAccountsSnapshot) combined.push(...userAccountsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Account)));
    // Use accountCode if available, otherwise fall back to Firebase ID
    if (customersSnapshot) combined.push(...customersSnapshot.docs.map(doc => {
      const data = doc.data();
      return { code: data.accountCode || doc.id, name: data.name, type: 'Customer' };
    }));
    if (vendorsSnapshot) combined.push(...vendorsSnapshot.docs.map(doc => {
      const data = doc.data();
      return { code: data.accountCode || doc.id, name: data.name, type: 'Vendor' };
    }));
    setAccounts(combined.sort((a, b) => a.name.localeCompare(b.name)));
  }, [userAccountsSnapshot, customersSnapshot, vendorsSnapshot]);

  useEffect(() => {
    if (!fromDate && !toDate) {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      setFromDate(startOfMonth);
      setToDate(today);
      setDateRange({ from: startOfMonth, to: today });
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    if (!(user && selectedAccount && dateRange?.from && dateRange?.to)) {
      setJournalVouchers([]);
      return;
    }

    let isMounted = true;
    const fetchVouchers = async () => {
      try {
        setLoading(true);
        const start = dateRange.from;
        const end = dateRange.to;
        const q = query(collection(db, "journal_vouchers"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const vouchers = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as JournalVoucher))
          .filter(voucher => {
            const voucherDate = new Date(voucher.date);
            const inRange = isValidDate(start) && isValidDate(end) && isValidDate(voucherDate)
              ? voucherDate >= start && voucherDate <= end
              : true;
            const hasAccount = voucher.lines.some(line => line.account === selectedAccount);
            return inRange && hasAccount;
          })
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (isMounted) {
          setJournalVouchers(vouchers);
        }
      } catch (err) {
        console.error("Error fetching vouchers: ", err);
        toast({ title: "Error", description: "Could not fetch ledger data.", variant: "destructive"});
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchVouchers();

    return () => {
      isMounted = false;
    };
  }, [user, selectedAccount, dateRange, toast]);

  // --- Memoized Calculations ---
  const { ledgerEntries, balances } = useMemo(() => {
    if (!selectedAccount) return { ledgerEntries: [], balances: { opening: 0, closing: 0, totalDebits: 0, totalCredits: 0 } };
    let runningBalance = 0, totalDebits = 0, totalCredits = 0;
    const entries: LedgerEntry[] = journalVouchers.flatMap((voucher, vIndex) => 
        voucher.lines
            .filter(line => line.account === selectedAccount)
            .map((line, lIndex) => {
                const debit = Number(line.debit) || 0;
                const credit = Number(line.credit) || 0;
                runningBalance += debit - credit;
                totalDebits += debit;
                totalCredits += credit;
                return { id: `${voucher.id}-${lIndex}`, date: voucher.date, particulars: voucher.narrative, type: voucher.voucherType, debit, credit, balance: runningBalance };
            })
    );
    return { ledgerEntries: entries, balances: { opening: 0, closing: runningBalance, totalDebits, totalCredits } };
  }, [journalVouchers, selectedAccount]);
  
  const selectedAccountDetails = useMemo(() => accounts.find(acc => acc.code === selectedAccount) || null, [accounts, selectedAccount]);

  // --- Render --- 
  const tableContent = useMemo(() => {
      if (loading) {
          return [...Array(3)].map((_, i) => (
              <TableRow key={`skl-${i}`}>
                  <TableCell colSpan={6}><div className="h-8 w-full bg-gray-200 rounded animate-pulse" /></TableCell>
              </TableRow>
          ));
      }
      if (ledgerEntries.length > 0) {
          return ledgerEntries.map(entry => (
              <TableRow key={entry.id}>
                  <TableCell>{isValidDate(new Date(entry.date)) ? format(new Date(entry.date), "dd-MMM-yy") : "-"}</TableCell>
                  <TableCell>{entry.particulars}</TableCell>
                  <TableCell>{entry.type}</TableCell>
                  <TableCell className="text-right">{formatCurrency(entry.debit)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(entry.credit)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(entry.balance)}</TableCell>
              </TableRow>
          ));
      }
      return (
          <TableRow key="no-entries-row">
              <TableCell colSpan={6} className="text-center">No entries for this account in the selected period.</TableCell>
          </TableRow>
      );
  }, [ledgerEntries, loading]);

  // Early return AFTER all hooks are called
  if (user && isFreemium) {
    return (
      <div className="space-y-8 p-8">
        <h1 className="text-3xl font-bold">General Ledger</h1>
        <UpgradeRequiredAlert
          featureName="General Ledger"
          description="Access detailed account-wise transaction history with a Business or Professional plan."
          backHref="/dashboard"
          backLabel="Back to Dashboard"
        />
      </div>
    );
  }

  const handleGenerateReport = () => {
    if (fromDate && toDate) {
      setDateRange({ from: fromDate, to: toDate });
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Ledgers</h1>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Select Account</p>
            <SearchableSelect
              options={accounts.map(acc => ({
                value: acc.code,
                label: `${acc.name} (${acc.code})`,
                group: acc.type
              }))}
              value={selectedAccount || ''}
              onValueChange={setSelectedAccount}
              placeholder="Search for an account..."
              searchPlaceholder="Type to search accounts..."
              emptyMessage="No accounts found."
              groupBy={true}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleExportPdf} disabled={!selectedAccount || loading} className="w-full">
              <Download className="mr-2 h-4 w-4"/> Export PDF
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Select Date Range</p>
          <DateRangeSelector
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
            onSubmit={handleGenerateReport}
            submitLabel="Generate Report"
            disabled={!selectedAccount}
          />
        </div>
      </div>

      {selectedAccount && (
        <Card>
          <CardHeader><CardTitle>Account: {selectedAccountDetails?.name}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4 mb-4">
                <StatCard key="stat-open" title="Opening Balance" value={formatCurrency(balances.opening)} icon={Calendar} loading={loading} />
                <StatCard key="stat-debit" title="Total Debits" value={formatCurrency(balances.totalDebits)} icon={FileText} loading={loading} />
                <StatCard key="stat-credit" title="Total Credits" value={formatCurrency(balances.totalCredits)} icon={FileText} loading={loading} />
                <StatCard key="stat-close" title="Closing Balance" value={formatCurrency(balances.closing)} icon={FileText} loading={loading} />
            </div>
            <ResponsiveTable
              data={ledgerEntries}
              columns={[
                {
                  key: 'date',
                  header: 'Date',
                  accessor: (entry: any) => entry.date,
                  priority: 'high',
                  mobileLabel: 'Date',
                },
                {
                  key: 'particulars',
                  header: 'Particulars',
                  accessor: (entry: any) => entry.particulars,
                  priority: 'high',
                  mobileLabel: 'Description',
                },
                {
                  key: 'vchType',
                  header: 'Vch Type',
                  accessor: (entry: any) => entry.type,
                  priority: 'medium',
                  mobileLabel: 'Type',
                },
                {
                  key: 'debit',
                  header: 'Debit',
                  accessor: (entry: any) => entry.debit > 0 ? formatCurrency(entry.debit) : '-',
                  className: 'text-right',
                  priority: 'high',
                  mobileLabel: 'Debit',
                },
                {
                  key: 'credit',
                  header: 'Credit',
                  accessor: (entry: any) => entry.credit > 0 ? formatCurrency(entry.credit) : '-',
                  className: 'text-right',
                  priority: 'high',
                  mobileLabel: 'Credit',
                },
                {
                  key: 'balance',
                  header: 'Balance',
                  accessor: (entry: any) => formatCurrency(entry.balance),
                  className: 'text-right',
                  priority: 'high',
                  mobileLabel: 'Balance',
                },
              ]}
              mobileCardTitle={(entry: any) => entry.particulars}
              mobileCardSubtitle={(entry: any) => entry.date}
              loading={loading}
              emptyMessage="No ledger entries found for the selected period"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

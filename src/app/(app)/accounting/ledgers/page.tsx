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
interface JournalVoucher { 
  id: string; 
  date: string; 
  lines: { account: string; debit: string | number; credit: string | number }[]; 
  narration?: string;
  narrative?: string;
  voucherType?: string;
  userId?: string;
}
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
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchVouchers = async () => {
      try {
        setLoading(true);
        const start = new Date(dateRange.from);
        start.setHours(0, 0, 0, 0);
        const end = new Date(dateRange.to);
        end.setHours(23, 59, 59, 999);
        
        // Try both collection names (journalVouchers and journal_vouchers)
        let vouchers: JournalVoucher[] = [];
        
        try {
          const q1 = query(collection(db, "journalVouchers"), where("userId", "==", user.uid));
          const querySnapshot1 = await getDocs(q1);
          vouchers = querySnapshot1.docs.map(doc => ({ id: doc.id, ...doc.data() } as JournalVoucher));
        } catch (err1) {
          console.log("Trying journal_vouchers collection...");
          try {
            const q2 = query(collection(db, "journal_vouchers"), where("userId", "==", user.uid));
            const querySnapshot2 = await getDocs(q2);
            vouchers = querySnapshot2.docs.map(doc => ({ id: doc.id, ...doc.data() } as JournalVoucher));
          } catch (err2) {
            console.error("Error fetching from both collections:", err1, err2);
            throw err2;
          }
        }

        // Filter vouchers by date range and account
        const filteredVouchers = vouchers
          .filter(voucher => {
            if (!voucher.lines || !Array.isArray(voucher.lines)) {
              return false;
            }
            
            // Parse date - handle both string and Date formats
            let voucherDate: Date;
            if (typeof voucher.date === 'string') {
              // Handle yyyy-MM-dd format
              const dateParts = voucher.date.split('-');
              if (dateParts.length === 3) {
                voucherDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
              } else {
                voucherDate = new Date(voucher.date);
              }
            } else {
              voucherDate = new Date(voucher.date);
            }
            
            // Check if date is valid and in range
            if (!isValidDate(voucherDate)) {
              return false;
            }
            
            const inRange = voucherDate >= start && voucherDate <= end;
            
            // Check if voucher has the selected account (normalize account codes)
            const hasAccount = voucher.lines.some(line => {
              const lineAccount = String(line.account || '').trim();
              const selected = String(selectedAccount || '').trim();
              return lineAccount === selected;
            });
            
            return inRange && hasAccount;
          })
          .sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateB.getTime() - dateA.getTime();
          });

        if (isMounted) {
          setJournalVouchers(filteredVouchers);
          if (filteredVouchers.length === 0 && vouchers.length > 0) {
            toast({ 
              title: "No Entries Found", 
              description: `No entries found for account ${selectedAccount} in the selected date range. Found ${vouchers.length} total vouchers.`,
              variant: "default"
            });
          } else if (filteredVouchers.length > 0) {
            toast({ 
              title: "Report Generated", 
              description: `Found ${filteredVouchers.length} entries for the selected period.`,
            });
          }
        }
      } catch (err) {
        console.error("Error fetching vouchers: ", err);
        toast({ 
          title: "Error", 
          description: `Could not fetch ledger data: ${err instanceof Error ? err.message : 'Unknown error'}.`, 
          variant: "destructive"
        });
        if (isMounted) {
          setJournalVouchers([]);
        }
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
    if (!selectedAccount || !journalVouchers || journalVouchers.length === 0) {
      return { ledgerEntries: [], balances: { opening: 0, closing: 0, totalDebits: 0, totalCredits: 0 } };
    }
    
    let runningBalance = 0, totalDebits = 0, totalCredits = 0;
    const entries: LedgerEntry[] = [];
    
    // Sort vouchers by date first
    const sortedVouchers = [...journalVouchers].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });
    
    sortedVouchers.forEach((voucher, vIndex) => {
      if (!voucher.lines || !Array.isArray(voucher.lines)) {
        return;
      }
      
      voucher.lines
        .filter(line => {
          const lineAccount = String(line.account || '').trim();
          const selected = String(selectedAccount || '').trim();
          return lineAccount === selected;
        })
        .forEach((line, lIndex) => {
          const debit = parseFloat(String(line.debit || '0').replace(/,/g, '')) || 0;
          const credit = parseFloat(String(line.credit || '0').replace(/,/g, '')) || 0;
          runningBalance += debit - credit;
          totalDebits += debit;
          totalCredits += credit;
          
          const narration = voucher.narration || voucher.narrative || 'Journal Entry';
          const voucherType = voucher.voucherType || voucher.id?.substring(0, 3) || 'JV';
          
          entries.push({ 
            id: `${voucher.id}-${lIndex}`, 
            date: voucher.date, 
            particulars: narration, 
            type: voucherType, 
            debit, 
            credit, 
            balance: runningBalance 
          });
        });
    });
    
    return { 
      ledgerEntries: entries, 
      balances: { 
        opening: 0, 
        closing: runningBalance, 
        totalDebits, 
        totalCredits 
      } 
    };
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
    if (!selectedAccount) {
      toast({
        variant: "destructive",
        title: "Account Required",
        description: "Please select an account first.",
      });
      return;
    }
    
    if (!fromDate || !toDate) {
      toast({
        variant: "destructive",
        title: "Date Range Required",
        description: "Please select both from and to dates.",
      });
      return;
    }
    
    // Normalize dates to start and end of day
    const start = new Date(fromDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);
    
    setDateRange({ from: start, to: end });
    
    toast({
      title: "Generating Report",
      description: `Fetching ledger entries for ${selectedAccountDetails?.name || selectedAccount} from ${format(start, "dd MMM yyyy")} to ${format(end, "dd MMM yyyy")}.`,
    });
  };

  const handleExportPdf = () => {
    if (!selectedAccount || !selectedAccountDetails) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select an account to export.",
      });
      return;
    }

    try {
      const doc = new jsPDF();
      const accountName = selectedAccountDetails.name;
      const accountCode = selectedAccountDetails.code;
      
      // Header
      doc.setFontSize(18);
      doc.text("General Ledger", 14, 15);
      
      doc.setFontSize(12);
      doc.text(`Account: ${accountName} (${accountCode})`, 14, 25);
      
      if (dateRange?.from && dateRange?.to) {
        const fromDateStr = format(dateRange.from, "dd-MMM-yyyy");
        const toDateStr = format(dateRange.to, "dd-MMM-yyyy");
        doc.text(`Period: ${fromDateStr} to ${toDateStr}`, 14, 32);
      }
      
      // Prepare table data
      const tableData = ledgerEntries.map(entry => [
        format(new Date(entry.date), "dd-MMM-yy"),
        entry.particulars || "-",
        entry.type || "-",
        formatCurrency(entry.debit),
        formatCurrency(entry.credit),
        formatCurrency(entry.balance),
      ]);

      // Add table headers
      const headers = [["Date", "Particulars", "Type", "Debit", "Credit", "Balance"]];
      
      // Add opening balance row if available
      const openingBalance = balances.opening || 0;
      if (openingBalance !== 0) {
        tableData.unshift([
          format(dateRange?.from || new Date(), "dd-MMM-yy"),
          "Opening Balance",
          "",
          openingBalance >= 0 ? formatCurrency(openingBalance) : "",
          openingBalance < 0 ? formatCurrency(-openingBalance) : "",
          formatCurrency(openingBalance),
        ]);
      }

      // Add totals row
      tableData.push([
        "",
        "Total",
        "",
        formatCurrency(balances.totalDebits),
        formatCurrency(balances.totalCredits),
        formatCurrency(balances.closing),
      ]);

      // Generate table using autoTable
      (doc as any).autoTable({
        head: headers,
        body: tableData,
        startY: 40,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 60 },
          2: { cellWidth: 20 },
          3: { cellWidth: 25, halign: 'right' },
          4: { cellWidth: 25, halign: 'right' },
          5: { cellWidth: 25, halign: 'right' },
        },
      });

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `Generated by ZenithBooks - Page ${i} of ${pageCount}`,
          14,
          doc.internal.pageSize.height - 10
        );
      }

      // Save PDF
      const fileName = `Ledger_${accountCode}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
      doc.save(fileName);

      toast({
        title: "PDF Exported",
        description: `Ledger for ${accountName} has been exported successfully.`,
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "An error occurred while exporting the PDF. Please try again.",
      });
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

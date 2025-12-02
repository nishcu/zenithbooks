

"use client";

import React, { useState, useMemo, useContext, useCallback, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileUp,
  GitCompareArrows,
  Check,
  PlusCircle,
  Loader2,
  FileText,
  Download,
  Trash2,
  Calendar as CalendarIcon,
  ChevronsUpDown,
  AlertTriangle
} from "lucide-react";
import { DateRangePicker } from "@/components/date-range-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from '@/hooks/use-toast';
import { allAccounts, costCentres } from '@/lib/accounts';
import { AccountingContext } from '@/context/accounting-context';
import { format, parse } from "date-fns";
import * as XLSX from 'xlsx';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/dashboard/stat-card';
import { useCollection, useDocumentData } from "react-firebase-hooks/firestore";
import { collection, query, where, getFirestore, doc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { UpgradeRequiredAlert } from "@/components/upgrade-required-alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { parseCSV, parseExcel, parsePDF, categorizeTransaction, type ParsedTransaction, type SkippedRow } from '@/lib/bank-statement-parser';
  import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
  } from "@/components/ui/command";
  import { DateRange } from "react-day-picker";

type StatementTransaction = {
  id: string;
  date: string;
  description: string;
  withdrawal: number | null;
  deposit: number | null;
  matchedId?: string | null;
};

type BookTransaction = {
  id: string;
  date: string;
  description: string;
  type: 'Receipt' | 'Payment';
  amount: number;
  matchedId?: string | null;
};

type JournalLine = {
  account: string;
  debit: string;
  credit: string;
  costCentre: string;
};

type StoredReconAccountState = {
  bankAccount: string;
  statementTransactions: StatementTransaction[];
  matchedPairs: [string, string][];
  jvDraft: {
    narration: string;
    date: string | null;
    lines: JournalLine[];
  };
  dateRange?: {
    from: string | null;
    to: string | null;
  };
  updatedAt: number;
};

type ReconStorageMap = Record<string, StoredReconAccountState>;

const createDefaultJvLines = (): JournalLine[] => ([
  { account: '', debit: '0', credit: '0', costCentre: '' },
  { account: '', debit: '0', credit: '0', costCentre: '' }
]);

type ImportSummary = {
  totalRows: number;
  parsedRows: number;
  skippedRows: number;
  warnings: string[];
};

const readStorageMap = (key: string): ReconStorageMap => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as ReconStorageMap;
    }
  } catch (error) {
    console.error("Could not read bank reconciliation state:", error);
  }
  return {};
};

const writeStorageMap = (key: string, data: ReconStorageMap) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error("Could not persist bank reconciliation state:", error);
  }
};

const parseDateString = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const formats = ['dd-MM-yyyy', 'dd/MM/yyyy', 'MM-dd-yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd', 'yyyy/MM/dd', 'dd MMM yyyy', 'dd MMMM yyyy'];
  for (const fmt of formats) {
    try {
      const parsedDate = parse(dateStr, fmt, new Date());
      if (!isNaN(parsedDate.getTime())) return parsedDate;
    } catch (e) {}
  }
  const directParse = new Date(dateStr);
  if (!isNaN(directParse.getTime())) return directParse;
  return null;
};

export default function BankReconciliationPage() {
    // ALL HOOKS MUST BE CALLED UNCONDITIONALLY AT THE TOP LEVEL
    const { toast } = useToast();
    const accountingContext = useContext(AccountingContext);
    const [user] = useAuthState(auth);
    const userDocRef = user ? doc(db, 'users', user.uid) : null;
    const [userData] = useDocumentData(userDocRef);
    const subscriptionPlan = userData?.subscriptionPlan || 'freemium';
    const isFreemium = subscriptionPlan === 'freemium';

    // Get context values (but don't use them in hooks if context is null)
    const { journalVouchers, addJournalVoucher, loading } = accountingContext || { 
        journalVouchers: [], 
        addJournalVoucher: () => {}, 
        loading: false 
    };

     const [statementTransactions, setStatementTransactions] = useState<StatementTransaction[]>([]);
     const [bookTransactions, setBookTransactions] = useState<BookTransaction[]>([]);
     
     const [selectedStatementTxs, setSelectedStatementTxs] = useState<Set<string>>(new Set());
     const [selectedBookTxs, setSelectedBookTxs] = useState<Set<string>>(new Set());

     const [matchedPairs, setMatchedPairs] = useState<Map<string, string>>(new Map());

     const [bankAccount, setBankAccount] = useState<string>("1520");
     const [reconDateRange, setReconDateRange] = useState<DateRange | undefined>(undefined);
     const [hydrationKey, setHydrationKey] = useState<string | null>(null);
     const storageKey = useMemo(() => user ? `bankReconState_${user.uid}` : 'bankReconState_local', [user]);

    const [isAddEntryDialogOpen, setIsAddEntryDialogOpen] = useState(false);
    const [entryToCreate, setEntryToCreate] = useState<StatementTransaction | null>(null);
    
    // Bulk transaction entry
    const [isBulkEntryDialogOpen, setIsBulkEntryDialogOpen] = useState(false);
    const [bulkTransactions, setBulkTransactions] = useState<StatementTransaction[]>([]);
    const [isProcessingFile, setIsProcessingFile] = useState(false);
    const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
    const [skippedRowsDetail, setSkippedRowsDetail] = useState<SkippedRow[]>([]);
    const [isSkippedRowsDialogOpen, setIsSkippedRowsDialogOpen] = useState(false);

    // For the Journal Voucher dialog
    const [jvNarration, setJvNarration] = useState("");
    const [jvDate, setJvDate] = useState<Date | undefined>(new Date());
    const [jvLines, setJvLines] = useState<JournalLine[]>(createDefaultJvLines());
    const [jvDateInput, setJvDateInput] = useState("");
    
    const customersQuery = user ? query(collection(db, 'customers'), where("userId", "==", user.uid)) : null;
    const [customersSnapshot] = useCollection(customersQuery);
    const customers = useMemo(() => customersSnapshot?.docs.map(doc => ({ value: doc.id, label: `${doc.data().name} (Customer)`, group: "Customers" })) || [], [customersSnapshot]);

    const vendorsQuery = user ? query(collection(db, 'vendors'), where("userId", "==", user.uid)) : null;
    const [vendorsSnapshot] = useCollection(vendorsQuery);
    const vendors = useMemo(() => vendorsSnapshot?.docs.map(doc => ({ value: doc.id, label: `${doc.data().name} (Vendor)`, group: "Vendors" })) || [], [vendorsSnapshot]);

      const combinedAccounts = useMemo(() => {
          return [
              ...allAccounts.map(acc => ({ value: acc.code, label: `${acc.name} (${acc.code})`, group: "Main Accounts" })),
              ...customers,
              ...vendors,
          ];
      }, [customers, vendors]);

      const groupedAccounts = useMemo(() => {
          return combinedAccounts.reduce<Record<string, { value: string; label: string; group?: string }[]>>((acc, account) => {
              const groupName = account.group || "Other";
              if (!acc[groupName]) acc[groupName] = [];
              acc[groupName].push(account);
              return acc;
          }, {});
      }, [combinedAccounts]);

      const entryCategory = useMemo(() => {
          if (!entryToCreate) return null;
          return categorizeTransaction(entryToCreate.description);
      }, [entryToCreate]);

      const counterpartyRecommendations = useMemo(() => {
          if (!entryToCreate) return [];
          const codes = new Set<string>();
          if (entryCategory?.suggestedAccount) {
              codes.add(entryCategory.suggestedAccount);
          }
          const amount = (entryToCreate.deposit || 0) - (entryToCreate.withdrawal || 0);
          if (amount > 0) {
              codes.add('4010');
          } else if (amount < 0) {
              codes.add('5050');
          }
          return Array.from(codes);
      }, [entryCategory, entryToCreate]);

      const recommendedAccountLabel = useMemo(() => {
          if (!entryCategory?.suggestedAccount) return null;
          const match = combinedAccounts.find(acc => acc.value === entryCategory.suggestedAccount);
          return match?.label || entryCategory.suggestedAccount;
      }, [entryCategory, combinedAccounts]);

      useEffect(() => {
          if (typeof window === 'undefined') return;
          try {
              const lastAccount = localStorage.getItem(`${storageKey}__lastAccount`);
              if (lastAccount) {
                  setBankAccount(lastAccount);
              }
          } catch (error) {
              console.error("Could not restore last bank account:", error);
          }
      }, [storageKey]);

      useEffect(() => {
          if (typeof window === 'undefined' || !bankAccount) return;
          try {
              localStorage.setItem(`${storageKey}__lastAccount`, bankAccount);
          } catch (error) {
              console.error("Could not persist last bank account:", error);
          }
      }, [bankAccount, storageKey]);

      useEffect(() => {
          if (typeof window === 'undefined' || !bankAccount) return;

          const currentHydrationKey = `${storageKey}:${bankAccount}`;
          setHydrationKey(null);
          setImportSummary(null);

          const storage = readStorageMap(storageKey);
          const savedState = storage[bankAccount];

          if (savedState) {
              setStatementTransactions(savedState.statementTransactions || []);
              setMatchedPairs(new Map(savedState.matchedPairs || []));

              if (savedState.jvDraft) {
                  setJvNarration(savedState.jvDraft.narration || "");
                  setJvLines(savedState.jvDraft.lines && savedState.jvDraft.lines.length > 0 ? savedState.jvDraft.lines : createDefaultJvLines());
                  setJvDate(savedState.jvDraft.date ? new Date(savedState.jvDraft.date) : new Date());
              } else {
                  setJvNarration("");
                  setJvLines(createDefaultJvLines());
                  setJvDate(new Date());
              }

              if (savedState.dateRange) {
                  const from = savedState.dateRange.from ? new Date(savedState.dateRange.from) : undefined;
                  const to = savedState.dateRange.to ? new Date(savedState.dateRange.to) : undefined;
                  if (from || to) {
                      setReconDateRange({ from, to });
                  } else {
                      setReconDateRange(undefined);
                  }
              } else {
                  setReconDateRange(undefined);
              }
          } else {
              setStatementTransactions([]);
              setMatchedPairs(new Map());
              setJvNarration("");
              setJvLines(createDefaultJvLines());
              setJvDate(new Date());
              setReconDateRange(undefined);
          }

          setHydrationKey(currentHydrationKey);
      }, [bankAccount, storageKey]);

      const currentHydrationKey = `${storageKey}:${bankAccount}`;
      const canPersistState = hydrationKey === currentHydrationKey && !!bankAccount;

      useEffect(() => {
          if (!canPersistState || typeof window === 'undefined' || !bankAccount) return;

          const storage = readStorageMap(storageKey);
          storage[bankAccount] = {
              bankAccount,
              statementTransactions,
              matchedPairs: Array.from(matchedPairs.entries()),
              jvDraft: {
                  narration: jvNarration,
                  date: jvDate ? jvDate.toISOString() : null,
                  lines: jvLines,
              },
              dateRange: {
                  from: reconDateRange?.from ? reconDateRange.from.toISOString() : null,
                  to: reconDateRange?.to ? reconDateRange.to.toISOString() : null,
              },
              updatedAt: Date.now(),
          };

          writeStorageMap(storageKey, storage);
      }, [
          bankAccount,
          statementTransactions,
          matchedPairs,
          jvNarration,
          jvDate,
          jvLines,
          reconDateRange,
          storageKey,
          canPersistState
      ]);

    useEffect(() => {
        const derivedTransactions = journalVouchers
            .filter(v => v.lines.some(l => l.account === bankAccount))
            .map(v => {
                const bankLine = v.lines.find(l => l.account === bankAccount);
                if (!bankLine) return null;
                const isDebit = parseFloat(bankLine.debit || '0') > 0;
                return {
                    id: v.id,
                    date: v.date,
                    description: v.narration,
                    type: isDebit ? 'Receipt' : 'Payment',
                    amount: v.amount,
                    matchedId: null,
                };
            })
            .filter((tx): tx is BookTransaction => tx !== null)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setBookTransactions(derivedTransactions);
    }, [journalVouchers, bankAccount]);

    useEffect(() => {
        setJvDateInput(jvDate ? format(jvDate, 'yyyy-MM-dd') : '');
    }, [jvDate]);

    // Early return AFTER all hooks are called
    if (user && isFreemium) {
        return (
            <div className="space-y-8 p-8">
                <h1 className="text-3xl font-bold">Bank Reconciliation</h1>
                <UpgradeRequiredAlert
                    featureName="Bank Reconciliation"
                    description="Reconcile bank statements with your books of account and track unmatched transactions with a Business or Professional plan."
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

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setSkippedRowsDetail([]);
        setIsSkippedRowsDialogOpen(false);
        setImportSummary(null);
        setIsProcessingFile(true);
        const fileExtension = file.name.split('.').pop()?.toLowerCase();

        try {
            let parsedResult;
            
            if (fileExtension === 'csv') {
                parsedResult = await parseCSV(file);
            } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
                parsedResult = await parseExcel(file);
            } else if (fileExtension === 'pdf') {
                try {
                    parsedResult = await parsePDF(file);
                } catch (pdfError: any) {
                    toast({ 
                        variant: "destructive", 
                        title: "PDF Parsing Not Available", 
                        description: pdfError.message || "Please convert your PDF to CSV or Excel format, or use our API endpoint for PDF processing." 
                    });
                    setIsProcessingFile(false);
                    return;
                }
            } else {
                toast({ variant: "destructive", title: "Unsupported File Format", description: "Please upload a CSV, Excel, or PDF file." });
                setIsProcessingFile(false);
                return;
            }

            const parsedData: StatementTransaction[] = parsedResult.transactions.map((tx, index) => ({
                id: `stmt-${index}-${Date.now()}`,
                date: tx.date,
                description: tx.description,
                withdrawal: tx.withdrawal,
                deposit: tx.deposit,
            }));

            const totalRows = parsedResult.rawRowCount ?? parsedResult.transactions.length;
            const parsedRows = parsedResult.transactions.length;
            const skippedRows = parsedResult.skippedRowCount ?? Math.max(0, totalRows - parsedRows);
            const warnings = parsedResult.warnings ?? [];
            setImportSummary({
                totalRows,
                parsedRows,
                skippedRows,
                warnings,
            });
            setSkippedRowsDetail(parsedResult.skippedRows || []);

            setStatementTransactions(parsedData);
            
            // Show unmatched transactions for bulk entry
            const unmatched = parsedData.filter(tx => !matchedPairs.has(tx.id));
            if (unmatched.length > 0) {
                setBulkTransactions(unmatched);
                setIsBulkEntryDialogOpen(true);
            }
            
            const summaryPieces = [
                `${parsedRows} transaction${parsedRows === 1 ? '' : 's'} ready`,
                `${unmatched.length} unmatched transaction${unmatched.length === 1 ? '' : 's'} found`
            ];
            if (skippedRows > 0) {
                summaryPieces.splice(1, 0, `${skippedRows} row${skippedRows === 1 ? '' : 's'} skipped`);
            }
            toast({ 
                title: "Statement Uploaded", 
                description: summaryPieces.join(". ") 
            });
        } catch (error: any) {
            console.error("Error parsing file:", error);
            setImportSummary(null);
            setSkippedRowsDetail([]);
            toast({ 
                variant: "destructive", 
                title: "File Parsing Error", 
                description: error.message || "Could not parse the file. Please check the format and try again." 
            });
        } finally {
            setIsProcessingFile(false);
            // Reset file input
            if (event.target) {
                event.target.value = '';
            }
        }
    };
    
    const handleDownloadTemplate = () => {
        const headers = "Date,Description,Withdrawal,Deposit";
        const exampleData = [
            `"${format(new Date(), 'yyyy-MM-dd')}","Sample Deposit from Client",,"50000.00"`,
            `"${format(new Date(), 'yyyy-MM-dd')}","Sample Withdrawal for Rent","15000.00",`,
        ].join("\n");
        const csvContent = `data:text/csv;charset=utf-8,${headers}\n${exampleData}`;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "bank_statement_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Template Downloaded", description: "A sample CSV template has been downloaded." });
    };

    const handleDownloadSkippedRows = useCallback(() => {
        if (!skippedRowsDetail.length) return;
        const escapeCsv = (value: string) => `"${(value || '').replace(/"/g, '""')}"`;
        const header = 'Row Number,Reason,Row Data\n';
        const body = skippedRowsDetail
            .map(row => {
                const rowData = row.raw ?? '';
                return `${row.rowNumber},${escapeCsv(row.reason)},${escapeCsv(rowData)}`;
            })
            .join('\n');
        const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `skipped-rows-${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [skippedRowsDetail]);

    const toggleSelection = useCallback((id: string, type: 'statement' | 'book') => {
        if (type === 'statement') {
            setSelectedStatementTxs(prev => {
                const newSelection = new Set(prev);
                if (newSelection.has(id)) newSelection.delete(id);
                else newSelection.add(id);
                return newSelection;
            });
        } else {
             setSelectedBookTxs(prev => {
                const newSelection = new Set(prev);
                if (newSelection.has(id)) newSelection.delete(id);
                else newSelection.add(id);
                return newSelection;
            });
        }
    }, []);
    
    const handleMatch = () => {
        const currentlySelectedStatementTxs = Array.from(selectedStatementTxs).filter(id => !matchedPairs.has(id));
        const currentlySelectedBookTxs = Array.from(selectedBookTxs).filter(id => !matchedPairs.has(id));

        if (currentlySelectedStatementTxs.length === 0 || currentlySelectedBookTxs.length === 0) {
            toast({ variant: "destructive", title: "Selection Error", description: "You must select at least one new transaction from each side to match." });
            return;
        }

        const totalStatement = currentlySelectedStatementTxs.reduce((acc, id) => {
            const tx = statementTransactions.find(t => t.id === id);
            return acc + (tx?.deposit || 0) - (tx?.withdrawal || 0);
        }, 0);

        const totalBook = currentlySelectedBookTxs.reduce((acc, id) => {
            const tx = bookTransactions.find(t => t.id === id);
            const amount = tx ? (tx.type === 'Receipt' ? tx.amount : -tx.amount) : 0;
            return acc + amount;
        }, 0);
        
        if (Math.abs(totalStatement - totalBook) > 0.01) {
             toast({ variant: "destructive", title: "Mismatch Error", description: `Selected totals do not match. Bank: ${totalStatement.toFixed(2)}, Book: ${totalBook.toFixed(2)}` });
             return;
        }
        
        const matchId = `match-${Date.now()}`;
        const newMatchedPairs = new Map(matchedPairs);
        currentlySelectedStatementTxs.forEach(stmtId => newMatchedPairs.set(stmtId, matchId));
        currentlySelectedBookTxs.forEach(bookId => newMatchedPairs.set(bookId, matchId));
        setMatchedPairs(newMatchedPairs);
        
        toast({ title: "Transactions Matched", description: `${currentlySelectedStatementTxs.length} bank transaction(s) matched with ${currentlySelectedBookTxs.length} book transaction(s).` });

        setSelectedStatementTxs(new Set());
        setSelectedBookTxs(new Set());
    };
    
    const handleOpenAddEntryDialog = (tx: StatementTransaction) => {
        if (matchedPairs.has(tx.id)) {
             toast({ variant: "destructive", title: "Already Matched", description: "This transaction has already been reconciled." });
             return;
        }
        setEntryToCreate(tx);
        setJvDate(new Date(tx.date));
        setJvNarration(tx.description);
        const amount = (tx.deposit || 0) - (tx.withdrawal || 0);
        const isReceipt = amount > 0;
        
        // Auto-categorize transaction
        const category = categorizeTransaction(tx.description);
        const suggestedAccount = category.suggestedAccount || '';
        
        const initialLines = isReceipt 
            ? [
                { account: bankAccount, debit: String(Math.abs(amount)), credit: '0', costCentre: '' },
                { account: suggestedAccount, debit: '0', credit: String(Math.abs(amount)), costCentre: '' }
              ]
            : [
                { account: suggestedAccount, debit: String(Math.abs(amount)), credit: '0', costCentre: '' },
                { account: bankAccount, debit: '0', credit: String(Math.abs(amount)), costCentre: '' }
              ];
        setJvLines(initialLines);
        setIsAddEntryDialogOpen(true);
    };
    
    const handleBulkCreateEntries = async () => {
        if (bulkTransactions.length === 0) {
            toast({ variant: "destructive", title: "No Transactions", description: "No transactions to create entries for." });
            return;
        }

        setIsProcessingFile(true);
        let successCount = 0;
        let errorCount = 0;

        for (const tx of bulkTransactions) {
            try {
                const amount = (tx.deposit || 0) - (tx.withdrawal || 0);
                if (amount === 0) continue;

                const isReceipt = amount > 0;
                const category = categorizeTransaction(tx.description);
                const suggestedAccount = category.suggestedAccount || (isReceipt ? '4010' : '5050'); // Default accounts
                
                const voucherId = isReceipt ? `RV-RECON-${Date.now()}-${successCount}` : `PV-RECON-${Date.now()}-${successCount}`;
                
                const journalLines = isReceipt
                    ? [
                        { account: bankAccount, debit: String(Math.abs(amount)), credit: '0', costCentre: '' },
                        { account: suggestedAccount, debit: '0', credit: String(Math.abs(amount)), costCentre: '' }
                      ]
                    : [
                        { account: suggestedAccount, debit: String(Math.abs(amount)), credit: '0', costCentre: '' },
                        { account: bankAccount, debit: '0', credit: String(Math.abs(amount)), costCentre: '' }
                      ];

                const newVoucher = {
                    id: voucherId,
                    date: tx.date,
                    narration: tx.description,
                    lines: journalLines,
                    amount: Math.abs(amount)
                };

                await addJournalVoucher(newVoucher as any);
                
                const newMatchedPairs = new Map(matchedPairs);
                newMatchedPairs.set(tx.id, `created-${voucherId}`);
                setMatchedPairs(newMatchedPairs);
                
                successCount++;
            } catch (error) {
                console.error(`Error creating entry for transaction ${tx.id}:`, error);
                errorCount++;
            }
        }

        setIsProcessingFile(false);
        setIsBulkEntryDialogOpen(false);
        setBulkTransactions([]);

        if (successCount > 0) {
            toast({ 
                title: "Entries Created", 
                description: `Successfully created ${successCount} receipt/payment ${successCount === 1 ? 'entry' : 'entries'}.${errorCount > 0 ? ` ${errorCount} failed.` : ''}` 
            });
        } else {
            toast({ 
                variant: "destructive", 
                title: "Creation Failed", 
                description: `Could not create entries. ${errorCount} error${errorCount === 1 ? '' : 's'} occurred.` 
            });
        }
    };

    const handleManualDateInputChange = (value: string) => {
        setJvDateInput(value);
        const trimmed = value.trim();
        if (!trimmed) {
            setJvDate(undefined);
            return;
        }
        const parsed = parseDateString(trimmed);
        if (parsed) {
            setJvDate(parsed);
        }
    };

    const handleJvLineChange = (index: number, field: keyof typeof jvLines[0], value: string) => {
        const newLines = [...jvLines];
        const line = newLines[index];
        (line as any)[field] = value;
         if (field === 'debit' && parseFloat(value) > 0) line.credit = '0';
         if (field === 'credit' && parseFloat(value) > 0) line.debit = '0';
        setJvLines(newLines);
    }
    const handleAddJvLine = () => setJvLines([...jvLines, { account: '', debit: '0', credit: '0', costCentre: '' }]);
    const handleRemoveJvLine = (index: number) => {
        if (jvLines.length > 2) {
            setJvLines(jvLines.filter((_, i) => i !== index));
        }
    }
    
    const handleCreateMissingEntry = async () => {
        if (!entryToCreate || !jvDate) {
             toast({ variant: "destructive", title: "Error", description: "No entry to create." });
             return;
        }

        const totalDebits = jvLines.reduce((sum, line) => sum + parseFloat(line.debit || '0'), 0);
        const totalCredits = jvLines.reduce((sum, line) => sum + parseFloat(line.credit || '0'), 0);
        
        if (Math.abs(totalDebits - totalCredits) > 0.01 || totalDebits === 0) {
            toast({ variant: "destructive", title: "Unbalanced Entry", description: "Debit and credit totals must match and be greater than zero." });
            return;
        }
        
        // Determine if it's a receipt or payment
        const amount = (entryToCreate.deposit || 0) - (entryToCreate.withdrawal || 0);
        const isReceipt = amount > 0;
        const voucherPrefix = isReceipt ? 'RV-RECON' : 'PV-RECON';
        const voucherId = `${voucherPrefix}-${Date.now()}`;
        
        const newVoucher = {
            id: voucherId,
            date: format(jvDate, 'yyyy-MM-dd'),
            narration: jvNarration,
            lines: jvLines,
            amount: totalDebits
        };
        
        try {
            await addJournalVoucher(newVoucher as any);
            const newMatchedPairs = new Map(matchedPairs);
            newMatchedPairs.set(entryToCreate.id, `created-${voucherId}`);
            setMatchedPairs(newMatchedPairs);
            
            toast({ 
                title: "Entry Created", 
                description: `${isReceipt ? 'Receipt' : 'Payment'} entry ${voucherId} has been created and recorded in your books.`
            });
            setIsAddEntryDialogOpen(false);
            setEntryToCreate(null);
        } catch (error: any) {
            console.error("Error creating entry:", error);
            toast({ 
                variant: "destructive", 
                title: "Error", 
                description: error.message || "Could not create the accounting entry. Please try again." 
            });
        }
    };


    const bookBalance = useMemo(() => bookTransactions.reduce((acc, tx) => acc + (tx.type === 'Receipt' ? tx.amount : -tx.amount), 0), [bookTransactions]);
    const statementBalance = useMemo(() => statementTransactions.reduce((acc, tx) => acc + (tx.deposit || 0) - (tx.withdrawal || 0), 0), [statementTransactions]);
    const difference = statementBalance - bookBalance;
    const skippedRowsPreview = useMemo(() => skippedRowsDetail.slice(0, 100), [skippedRowsDetail]);


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Bank Reconciliation</h1>
        <p className="text-muted-foreground">
          Match your bank statement with your books.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reconciliation Setup</CardTitle>
          <CardDescription>Pick the bank, date range, and upload a clean statement for best results.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Bank Account</Label>
                <Select value={bankAccount} onValueChange={setBankAccount}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a bank" />
                    </SelectTrigger>
                    <SelectContent>
                        {allAccounts.filter(acc => acc.name.toLowerCase().includes("bank")).map(acc => (
                            <SelectItem key={acc.code} value={acc.code}>{acc.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reconciliation Period</Label>
                  <DateRangePicker
                      initialDateRange={reconDateRange}
                      onDateChange={setReconDateRange}
                  />
              </div>
          </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="space-y-2 w-full">
              <Label htmlFor="statement-upload">Bank Statement File</Label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input 
                    id="statement-upload" 
                    type="file" 
                    className="w-full sm:max-w-sm" 
                    accept=".csv,.xlsx,.xls,.pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/pdf" 
                    onChange={handleFileUpload}
                    disabled={isProcessingFile}
                />
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={handleDownloadTemplate} title="Download Template" disabled={isProcessingFile}>
                      <Download className="h-4 w-4" />
                  </Button>
                  {isProcessingFile && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Supports CSV, Excel (XLSX, XLS), and PDF formats</p>
            </div>
          </div>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Upload tips</AlertTitle>
            <AlertDescription>
              For better results, upload clean statements without blank lines, merged header rows, or invalid/empty dates.
              Fixing these issues upfront helps us import all {importSummary?.totalRows ?? "your"} rows without skips.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
      
       <div className="grid md:grid-cols-3 gap-4">
            <StatCard title="Bank Statement Balance" value={`₹${statementBalance.toFixed(2)}`} icon={FileText}/>
            <StatCard title="Book Balance" value={`₹${bookBalance.toFixed(2)}`} icon={FileText}/>
            <StatCard title="Difference" value={`₹${difference.toFixed(2)}`} className={Math.abs(difference) > 0.01 ? "text-destructive" : ""} icon={FileText}/>
      </div>

      {importSummary && (
        <Alert variant={importSummary.skippedRows > 0 ? "destructive" : "default"}>
            <AlertTitle>Statement import summary</AlertTitle>
            <AlertDescription>
                Imported {importSummary.parsedRows} of {importSummary.totalRows} row{importSummary.totalRows === 1 ? '' : 's'}.
                {importSummary.skippedRows > 0 ? (
                    <> {importSummary.skippedRows} row{importSummary.skippedRows === 1 ? '' : 's'} skipped due to missing dates or amounts.</>
                ) : (
                    <> All rows processed successfully.</>
                )}
                {importSummary.warnings.length > 0 && (
                    <ul className="mt-2 list-disc space-y-1 pl-4">
                        {importSummary.warnings.map((warning, index) => (
                            <li key={`import-warning-${index}`}>{warning}</li>
                        ))}
                    </ul>
                )}
            </AlertDescription>
            {skippedRowsDetail.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setIsSkippedRowsDialogOpen(true)}>
                  View skipped rows ({skippedRowsDetail.length})
                </Button>
                <Button size="sm" variant="outline" onClick={handleDownloadSkippedRows}>
                  Download skipped rows
                </Button>
              </div>
            )}
        </Alert>
      )}
      {importSummary?.skippedRows && importSummary.skippedRows > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Some rows were skipped</AlertTitle>
          <AlertDescription>
            {importSummary.skippedRows} row{importSummary.skippedRows === 1 ? '' : 's'} still have blank dates/descriptions.
            Please clean the file (remove blank lines or fix date formats) and upload again so all {importSummary.totalRows} entries—including the missing 167th row—get reconciled. Use “View skipped rows” above to review the exact lines.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Bank Statement Transactions</CardTitle>
                <CardDescription>Transactions from your uploaded statement.</CardDescription>
              </div>
              {statementTransactions.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const unmatched = statementTransactions.filter(tx => !matchedPairs.has(tx.id));
                    if (unmatched.length > 0) {
                      setBulkTransactions(unmatched);
                      setIsBulkEntryDialogOpen(true);
                    } else {
                      toast({ title: "All Matched", description: "All transactions have been matched or reconciled." });
                    }
                  }}
                  disabled={isProcessingFile}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Entries for Unmatched
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <TransactionTable
                transactions={statementTransactions.map(tx => ({
                    id: tx.id,
                    date: tx.date,
                    description: tx.description,
                    amount: tx.deposit !== null ? tx.deposit : tx.withdrawal !== null ? -tx.withdrawal : 0,
                    matched: matchedPairs.has(tx.id),
                    raw: tx,
                }))}
                selectedTxs={selectedStatementTxs}
                onToggle={id => toggleSelection(id, 'statement')}
                type="statement"
                onAddEntry={handleOpenAddEntryDialog}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
             <div className="flex justify-between items-start">
                 <div>
                    <CardTitle>ZenithBooks Transactions</CardTitle>
                    <CardDescription>Receipts and payments from your books.</CardDescription>
                </div>
             </div>
          </CardHeader>
          <CardContent>
             <TransactionTable
                transactions={bookTransactions.map(tx => ({
                    id: tx.id,
                    date: tx.date,
                    description: tx.description,
                    amount: tx.type === 'Receipt' ? tx.amount : -tx.amount,
                    matched: matchedPairs.has(tx.id),
                    raw: tx
                }))}
                selectedTxs={selectedBookTxs}
                onToggle={id => toggleSelection(id, 'book')}
                type="book"
            />
          </CardContent>
        </Card>
      </div>

      <div className="sticky bottom-16 md:bottom-0 p-4 bg-background/95 backdrop-blur-sm border-t shadow-lg z-35 -mx-6 -mb-6 md:mb-0">
        <div className="max-w-7xl mx-auto flex items-center justify-center">
            <Button size="lg" onClick={handleMatch} disabled={selectedStatementTxs.size === 0 || selectedBookTxs.size === 0}>
                <GitCompareArrows className="mr-2"/> Match Selected Transactions
            </Button>
        </div>
      </div>
      
      <Dialog open={isSkippedRowsDialogOpen} onOpenChange={setIsSkippedRowsDialogOpen}>
          <DialogContent className="max-w-3xl">
              <DialogHeader>
                  <DialogTitle>Skipped rows ({skippedRowsDetail.length})</DialogTitle>
                  <DialogDescription>
                      Fix the issues below (missing dates, descriptions, or amounts) and upload the statement again.
                  </DialogDescription>
              </DialogHeader>
              {skippedRowsDetail.length === 0 ? (
                  <p className="text-sm text-muted-foreground">All good! No skipped rows to review.</p>
              ) : (
                  <>
                      <div className="max-h-[420px] overflow-auto rounded-md border">
                          <Table>
                              <TableHeader>
                                  <TableRow>
                                      <TableHead className="w-20">Row #</TableHead>
                                      <TableHead>Reason</TableHead>
                                      <TableHead>Row snapshot</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {skippedRowsPreview.map((row, index) => (
                                      <TableRow key={`${row.rowNumber}-${index}`}>
                                          <TableCell className="font-mono text-xs">{row.rowNumber}</TableCell>
                                          <TableCell className="text-sm">{row.reason}</TableCell>
                                          <TableCell>
                                              <p className="text-xs text-muted-foreground break-words">{row.raw || '—'}</p>
                                          </TableCell>
                                      </TableRow>
                                  ))}
                              </TableBody>
                          </Table>
                      </div>
                      {skippedRowsDetail.length > skippedRowsPreview.length && (
                          <p className="text-xs text-muted-foreground mt-2">
                              Showing first {skippedRowsPreview.length} rows of {skippedRowsDetail.length}. Download the CSV for the full list.
                          </p>
                      )}
                  </>
              )}
              <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                  <Button variant="outline" onClick={() => setIsSkippedRowsDialogOpen(false)}>Close</Button>
                  {skippedRowsDetail.length > 0 && (
                      <Button onClick={handleDownloadSkippedRows}>Download CSV</Button>
                  )}
              </DialogFooter>
          </DialogContent>
      </Dialog>

       <Dialog open={isAddEntryDialogOpen} onOpenChange={setIsAddEntryDialogOpen}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Create Missing Journal Entry</DialogTitle>
                    <DialogDescription>
                        Create a journal entry for the selected bank transaction: "{entryToCreate?.description}".
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-6">
                {entryCategory?.suggestedAccount && (
                    <Alert>
                        <AlertTitle>Recommended account</AlertTitle>
                        <AlertDescription>
                            Based on this description we suggest posting against {recommendedAccountLabel}.
                            You can still choose a different ledger if needed.
                        </AlertDescription>
                    </Alert>
                )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                         <Label>Voucher Date</Label>
                         <div className="space-y-2">
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn("w-full justify-start text-left font-normal", !jvDate && "text-muted-foreground")}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {jvDate ? format(jvDate, "dd MMM, yyyy") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={jvDate} onSelect={setJvDate} initialFocus /></PopoverContent>
                                </Popover>
                                <Input
                                    value={jvDateInput}
                                    placeholder="YYYY-MM-DD or DD/MM/YYYY"
                                    onChange={(e) => handleManualDateInputChange(e.target.value)}
                                    className="w-full"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">Type a date manually or use the picker.</p>
                         </div>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="narration">Narration</Label>
                            <Textarea id="narration" value={jvNarration} onChange={(e) => setJvNarration(e.target.value)} />
                        </div>
                    </div>
                    <Separator />
                     <div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[40%]">Account</TableHead>
                                    <TableHead className="w-[20%]">Cost Centre</TableHead>
                                    <TableHead className="text-right">Debit</TableHead>
                                    <TableHead className="text-right">Credit</TableHead>
                                    <TableHead className="w-[50px] text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {jvLines.map((line, index) => {
                                    const accountDetails = allAccounts.find(acc => acc.code === line.account);
                                    const showCostCentre = accountDetails && ['Revenue', 'Expense'].includes(accountDetails.type);
                                    const recommendedAccounts = line.account === bankAccount && bankAccount
                                        ? [bankAccount]
                                        : counterpartyRecommendations;
                                    return (
                                        <TableRow key={index}>
                                              <TableCell>
                                                  <AccountSelect
                                                      value={line.account}
                                                      groupedAccounts={groupedAccounts}
                                                      recommendedAccounts={recommendedAccounts}
                                                      onChange={(value) => handleJvLineChange(index, 'account', value)}
                                                  />
                                              </TableCell>
                                             <TableCell>
                                                {showCostCentre && (
                                                    <Select value={line.costCentre} onValueChange={(value) => handleJvLineChange(index, 'costCentre', value)}>
                                                        <SelectTrigger><SelectValue placeholder="Select cost centre" /></SelectTrigger>
                                                        <SelectContent>{costCentres.map(cc => <SelectItem key={cc.id} value={cc.id}>{cc.name}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                )}
                                            </TableCell>
                                            <TableCell><Input type="number" className="text-right" value={line.debit} onChange={(e) => handleJvLineChange(index, 'debit', e.target.value)} /></TableCell>
                                            <TableCell><Input type="number" className="text-right" value={line.credit} onChange={(e) => handleJvLineChange(index, 'credit', e.target.value)} /></TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleRemoveJvLine(index)} disabled={jvLines.length <= 2}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                        <Button variant="outline" size="sm" className="mt-4" onClick={handleAddJvLine}><PlusCircle className="mr-2"/> Add Line</Button>
                     </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddEntryDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateMissingEntry}>Create Journal Entry</Button>
                </DialogFooter>
            </DialogContent>
    </Dialog>
    
    {/* Bulk Transaction Entry Dialog */}
    <Dialog open={isBulkEntryDialogOpen} onOpenChange={setIsBulkEntryDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
                <DialogTitle>Create Entries for Unmatched Transactions</DialogTitle>
                <DialogDescription>
                    Review and create receipt/payment entries for {bulkTransactions.length} unmatched bank statement transactions.
                    The system will automatically categorize transactions and create appropriate journal entries.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <Alert>
                    <AlertTitle>Automatic Entry Creation</AlertTitle>
                    <AlertDescription>
                        Clicking "Create All Entries" will automatically create receipt or payment entries based on transaction type.
                        Deposits will be created as receipts, and withdrawals will be created as payments.
                        Transactions are automatically categorized based on description.
                    </AlertDescription>
                </Alert>
                <div className="max-h-[400px] overflow-y-auto">
                    <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Category</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {bulkTransactions.map((tx) => {
                                const amount = (tx.deposit || 0) - (tx.withdrawal || 0);
                                const category = categorizeTransaction(tx.description);
                                return (
                                    <TableRow key={tx.id}>
                                        <TableCell className="text-xs whitespace-nowrap">
                                            {format(new Date(tx.date), "dd MMM, yyyy")}
                                        </TableCell>
                                        <TableCell className="text-xs">{tx.description}</TableCell>
                                        <TableCell className={`text-right font-mono text-xs ${amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            ₹{Math.abs(amount).toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={amount >= 0 ? "default" : "destructive"}>
                                                {amount >= 0 ? 'Receipt' : 'Payment'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {category.category && (
                                                <Badge variant="outline">{category.category}</Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => {
                    setIsBulkEntryDialogOpen(false);
                    setBulkTransactions([]);
                }}>
                    Cancel
                </Button>
                <Button onClick={handleBulkCreateEntries} disabled={isProcessingFile || bulkTransactions.length === 0}>
                    {isProcessingFile ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating Entries...
                        </>
                    ) : (
                        <>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Create All Entries ({bulkTransactions.length})
                        </>
                    )}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    </div>
  );
}

function TransactionTable({ transactions, selectedTxs, onToggle, type, onAddEntry }: { transactions: any[], selectedTxs: Set<string>, onToggle: (id: string) => void, type: 'statement' | 'book', onAddEntry?: (tx: any) => void }) {
    return (
        <div className="max-h-[500px] overflow-y-auto">
            <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        {type === 'statement' && <TableHead className="w-12"></TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {transactions.length === 0 ? (
                        <TableRow><TableCell colSpan={type === 'statement' ? 5 : 4} className="h-24 text-center text-muted-foreground">
                            {type === 'statement' ? 'Upload a statement to see transactions.' : 'No book transactions for this period.'}
                        </TableCell></TableRow>
                    ) : (
                        transactions.map((tx) => (
                            <TableRow key={tx.id} data-state={selectedTxs.has(tx.id) ? "selected" : ""}>
                                <TableCell>
                                    {tx.matched ? (
                                        <Badge variant="secondary" className="flex items-center justify-center h-6 w-6 p-0"><Check className="size-4 text-green-600"/></Badge>
                                    ) : (
                                        <Checkbox checked={selectedTxs.has(tx.id)} onCheckedChange={() => onToggle(tx.id)} />
                                    )}
                                </TableCell>
                                <TableCell className="text-xs whitespace-nowrap">{format(new Date(tx.date), "dd MMM, yyyy")}</TableCell>
                                <TableCell className="text-xs">{tx.description}</TableCell>
                                <TableCell className={`text-right font-mono text-xs ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {tx.amount.toFixed(2)}
                                </TableCell>
                                {type === 'statement' && (
                                    <TableCell>
                                        {!tx.matched && onAddEntry && (
                                            <Button variant="ghost" size="icon" onClick={() => onAddEntry(tx.raw)} title="Create Journal Entry">
                                                <PlusCircle className="size-4 text-blue-500" />
                                            </Button>
                                        )}
                                    </TableCell>
                                )}
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

type GroupedAccounts = Record<string, { value: string; label: string; group?: string }[]>;

function AccountSelect({
    value,
    onChange,
    groupedAccounts,
    recommendedAccounts = []
}: {
    value: string;
    onChange: (value: string) => void;
    groupedAccounts: GroupedAccounts;
    recommendedAccounts?: string[];
}) {
    const [open, setOpen] = React.useState(false);

    const flatAccounts = React.useMemo(() => Object.values(groupedAccounts).flat(), [groupedAccounts]);
    const selectedAccount = React.useMemo(
        () => flatAccounts.find(acc => acc.value === value),
        [flatAccounts, value]
    );

    const recommendationList = React.useMemo(() => {
        if (!recommendedAccounts.length) return [];
        const seen = new Set<string>();
        return recommendedAccounts
            .map(code => {
                if (!code || seen.has(code)) return null;
                seen.add(code);
                return flatAccounts.find(acc => acc.value === code) || null;
            })
            .filter((acc): acc is { value: string; label: string; group?: string } => Boolean(acc));
    }, [recommendedAccounts, flatAccounts]);

    const handleSelect = (accountValue: string) => {
        onChange(accountValue);
        setOpen(false);
    };

    const displayLabel = selectedAccount ? selectedAccount.label : "Select account";

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between text-left font-normal"
                >
                    <span className="truncate">{displayLabel}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="z-[140] w-[360px] p-0 shadow-xl">
                <Command>
                    <CommandInput placeholder="Search account name or code" className="border-b" />
                    <CommandList>
                        <CommandEmpty>No account found.</CommandEmpty>
                        {recommendationList.length > 0 && (
                            <>
                                <CommandGroup heading="Suggested">
                                    {recommendationList.map(account => (
                                        <CommandItem
                                            key={`suggested-${account.value}`}
                                            value={`${account.label} ${account.value}`}
                                            onSelect={() => handleSelect(account.value)}
                                        >
                                            <span className="truncate">{account.label}</span>
                                            <Badge variant="secondary" className="ml-auto">Suggested</Badge>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                                <CommandSeparator />
                            </>
                        )}
                        {Object.entries(groupedAccounts).map(([group, accounts]) => (
                            <CommandGroup key={group} heading={group}>
                                {accounts.map(account => (
                                    <CommandItem
                                        key={account.value}
                                        value={`${account.label} ${account.value}`}
                                        onSelect={() => handleSelect(account.value)}
                                    >
                                        <span className="truncate">{account.label}</span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        ))}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

    

    

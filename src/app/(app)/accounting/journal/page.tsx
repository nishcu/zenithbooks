
"use client";

import React, { useState, useContext, useEffect, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PlusCircle,
  MoreHorizontal,
  FileText,
  Edit,
  Trash2,
  Calendar as CalendarIcon,
  Loader2,
  Search,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { AccountingContext, type JournalVoucher } from "@/context/accounting-context";
import { allAccounts, costCentres } from "@/lib/accounts";
import { useCollection } from 'react-firebase-hooks/firestore';
import { db, auth } from '@/lib/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useAuthState } from "react-firebase-hooks/auth";


export default function JournalVoucherPage() {
    const accountingContext = useContext(AccountingContext);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingVoucher, setEditingVoucher] = useState<JournalVoucher | null>(null);
    const [narration, setNarration] = useState("");
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [lines, setLines] = useState([
        { account: '', debit: '0', credit: '0', costCentre: '' },
        { account: '', debit: '0', credit: '0', costCentre: '' }
    ]);
    const { toast } = useToast();
    const [selectedVoucher, setSelectedVoucher] = useState<JournalVoucher | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [user] = useAuthState(auth);

    // Fetch customers and vendors to resolve names
    const customersQuery = user ? query(collection(db, 'customers'), where("userId", "==", user.uid)) : null;
    const [customersSnapshot] = useCollection(customersQuery);
    const customers = useMemo(() => customersSnapshot?.docs.map(doc => ({ value: doc.id, label: `${doc.data().name} (Customer)`, group: "Customers", ...doc.data() })) || [], [customersSnapshot]);

    const vendorsQuery = user ? query(collection(db, 'vendors'), where("userId", "==", user.uid)) : null;
    const [vendorsSnapshot] = useCollection(vendorsQuery);
    const vendors = useMemo(() => vendorsSnapshot?.docs.map(doc => ({ value: doc.id, label: `${doc.data().name} (Vendor)`, group: "Vendors", ...doc.data() })) || [], [vendorsSnapshot]);

    const combinedAccounts = useMemo(() => {
        return [
            ...allAccounts.map(acc => ({ value: acc.code, label: `${acc.name} (${acc.code})`, group: "Main Accounts" })),
            ...customers,
            ...vendors,
        ];
    }, [customers, vendors]);


    useEffect(() => {
        if (editingVoucher) {
            setDate(new Date(editingVoucher.date));
            setNarration(editingVoucher.narration);
            setLines(editingVoucher.lines.map(l => ({...l, costCentre: l.costCentre || ''})));
            setIsAddDialogOpen(true);
        } else {
            // Reset form when not editing
            setDate(new Date());
            setNarration("");
            setLines([{ account: '', debit: '0', credit: '0', costCentre: '' }, { account: '', debit: '0', credit: '0', costCentre: '' }]);
        }
    }, [editingVoucher]);

    if (!accountingContext) {
        return <Loader2 className="animate-spin" />;
    }
    
    const { journalVouchers: allVouchers, addJournalVoucher, updateJournalVoucher, loading } = accountingContext;

    const visibleJournalVouchers = useMemo(() => {
      const reversedIds = new Set(
        allVouchers
          .filter(v => v && v.reverses)
          .map(v => v.reverses)
      );

      return allVouchers.filter(v => v && v.id && !reversedIds.has(v.id) && !v.reverses);
    }, [allVouchers]);
    
    const filteredJournalVouchers = useMemo(() => {
        if (!searchTerm) {
            return visibleJournalVouchers;
        }
        return visibleJournalVouchers.filter(voucher => 
            voucher.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            voucher.narration.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [visibleJournalVouchers, searchTerm]);

    const handleDeleteJournalVoucher = async (voucherId: string) => {
        const originalVoucher = allVouchers.find(v => v.id === voucherId);

        if (!originalVoucher) {
            toast({ variant: "destructive", title: "Error", description: "Original journal voucher not found." });
            return;
        }

        const reversalLines = originalVoucher.lines.map(line => ({
            account: line.account,
            debit: line.credit, // Swap debit and credit
            credit: line.debit,
            costCentre: line.costCentre || '',
        }));
        
        const reversalVoucher = {
            id: `REV-${voucherId}-${Date.now()}`,
            reverses: voucherId,
            date: new Date().toISOString().split('T')[0],
            narration: `Reversal of Voucher #${voucherId}`,
            lines: reversalLines,
            amount: originalVoucher.amount,
        };

        try {
            await addJournalVoucher(reversalVoucher as any);
            toast({ title: "Voucher Reversed", description: `A reversing entry for voucher #${voucherId} has been created.` });
        } catch (e: any) {
            toast({ variant: "destructive", title: "Reversal Failed", description: e.message });
        }
    };

    const handleVoucherAction = (action: string, voucher: JournalVoucher) => {
        if (action === 'Delete') {
             if (voucher.reverses) {
                toast({ variant: "destructive", title: "Cannot Delete", description: "This is a reversal entry and cannot be deleted." });
                return;
            }
            handleDeleteJournalVoucher(voucher.id);
        } else if (action === 'View') {
            setSelectedVoucher(voucher);
        } else if (action === 'Edit') {
             if (voucher.reverses) {
                toast({ variant: "destructive", title: "Cannot Edit", description: "Reversal entries cannot be edited." });
                return;
            }
            setEditingVoucher(voucher);
        } else {
            toast({
                title: `${action} Voucher`,
                description: `This would ${action.toLowerCase()} voucher ${voucher.id}. This feature is a placeholder.`,
            });
        }
    };

    const handleAddLine = () => {
        setLines([...lines, { account: '', debit: '0', credit: '0', costCentre: '' }]);
    };

    const handleLineChange = (index: number, field: 'account' | 'debit' | 'credit' | 'costCentre', value: any) => {
        const newLines = [...lines];
        const line = newLines[index] as any;
        line[field] = value;

        if (field === 'debit' && parseFloat(value) > 0) {
            line['credit'] = '0';
        } else if (field === 'credit' && parseFloat(value) > 0) {
            line['debit'] = '0';
        }
        
        if (field === 'account') {
            const accountDetails = allAccounts.find(acc => acc.code === value);
            if (accountDetails && !['Revenue', 'Expense'].includes(accountDetails.type)) {
                line['costCentre'] = '';
            }
        }

        setLines(newLines);
    };

    const handleRemoveLine = (index: number) => {
        const newLines = [...lines];
        newLines.splice(index, 1);
        setLines(newLines);
    };

    const handleDialogClose = (open: boolean) => {
        if (!open) {
            setEditingVoucher(null); 
        }
        setIsAddDialogOpen(open);
    }

    const handleSaveVoucher = async () => {
        if (!date || !narration) {
            toast({ variant: "destructive", title: "Missing Details", description: "Please provide a date and narration." });
            return;
        }

        const totalDebits = lines.reduce((sum, line) => sum + parseFloat(line.debit || '0'), 0);
        const totalCredits = lines.reduce((sum, line) => sum + parseFloat(line.credit || '0'), 0);
        
        if (Math.abs(totalDebits - totalCredits) > 0.01 || totalDebits === 0) {
            toast({ variant: "destructive", title: "Unbalanced Entry", description: "Debit and credit totals must match and be greater than zero." });
            return;
        }
        
        const voucherData = {
            date: format(date, "yyyy-MM-dd"),
            narration: narration,
            lines: lines,
            amount: totalDebits,
        };

        try {
            if (editingVoucher) {
                await updateJournalVoucher(editingVoucher.id, voucherData);
                toast({
                    title: "Voucher Updated",
                    description: "Your journal voucher has been updated successfully."
                });
            } else {
                 const newVoucherId = `JV-${Date.now()}`;
                await addJournalVoucher({ id: newVoucherId, ...voucherData });
                toast({
                    title: "Voucher Saved",
                    description: "Your journal voucher has been saved successfully."
                });
            }

            handleDialogClose(false);

        } catch (e: any) {
            toast({ variant: "destructive", title: "Save failed", description: e.message });
        }
    };

    const totalDebits = lines.reduce((sum, line) => sum + parseFloat(line.debit || '0'), 0);
    const totalCredits = lines.reduce((sum, line) => sum + parseFloat(line.credit || '0'), 0);
    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01 && totalDebits > 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Journal Vouchers</h1>
          <p className="text-muted-foreground">
            Create manual journal entries to adjust ledger accounts.
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2" />
                    New Journal Voucher
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>{editingVoucher ? "Edit Journal Voucher" : "New Journal Voucher"}</DialogTitle>
                    <DialogDescription>
                        {editingVoucher ? `Editing voucher #${editingVoucher.id}` : "Create a manual entry to record transactions."}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                             <Label>Voucher Date</Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="narration">Narration</Label>
                            <Textarea id="narration" value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="e.g., To record monthly depreciation expense" />
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
                                {lines.map((line, index) => {
                                    const accountDetails = allAccounts.find(acc => acc.code === line.account);
                                    const showCostCentre = accountDetails && ['Revenue', 'Expense'].includes(accountDetails.type);
                                    return (
                                        <TableRow key={index}>
                                            <TableCell>
                                                <Select value={line.account} onValueChange={(value) => handleLineChange(index, 'account', value)}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select an account" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Object.entries(combinedAccounts.reduce((acc, curr) => {
                                                            const group = curr.group || "Other";
                                                            if (!acc[group]) acc[group] = [];
                                                            acc[group].push(curr);
                                                            return acc;
                                                        }, {} as Record<string, any[]>)).map(([group, accounts]) => (
                                                            <React.Fragment key={group}>
                                                                <p className="px-2 py-1.5 text-sm font-semibold">{group}</p>
                                                                {accounts.map(account => (
                                                                    <SelectItem key={account.value} value={account.value}>{account.label}</SelectItem>
                                                                ))}
                                                                <Separator className="my-2"/>
                                                            </React.Fragment>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                             <TableCell>
                                                {showCostCentre && (
                                                    <Select value={line.costCentre} onValueChange={(value) => handleLineChange(index, 'costCentre', value)}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select cost centre" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {costCentres.map(cc => <SelectItem key={cc.id} value={cc.id}>{cc.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Input type="number" className="text-right" value={line.debit} onChange={(e) => handleLineChange(index, 'debit', e.target.value)} />
                                            </TableCell>
                                            <TableCell>
                                                <Input type="number" className="text-right" value={line.credit} onChange={(e) => handleLineChange(index, 'credit', e.target.value)} />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleRemoveLine(index)} disabled={lines.length <= 2}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                        <Button variant="outline" size="sm" className="mt-4" onClick={handleAddLine}>
                            <PlusCircle className="mr-2"/> Add Line
                        </Button>
                     </div>
                     <Separator />
                     <div className="flex justify-end">
                        <div className="w-full max-w-sm space-y-2">
                             <div className="flex justify-between font-medium">
                                <span>Total Debits</span>
                                <span className="font-mono">₹{totalDebits.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-medium">
                                <span>Total Credits</span>
                                <span className="font-mono">₹{totalCredits.toFixed(2)}</span>
                            </div>
                             {totalDebits !== totalCredits && <p className="text-sm text-destructive text-right">Totals must match.</p>}
                        </div>
                     </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSaveVoucher} disabled={!isBalanced}>{editingVoucher ? 'Save Changes' : 'Save Voucher'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Journal Voucher List</CardTitle>
          <CardDescription>
            A list of all manual journal entries. Reversed entries are hidden from this list.
          </CardDescription>
           <div className="relative pt-4">
                <Search className="absolute left-2.5 top-6 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by Voucher # or Narration..."
                  className="pl-8 w-full md:w-1/3"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Voucher #</TableHead>
                <TableHead>Narration</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={5} className="text-center"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>}
              {filteredJournalVouchers.map((voucher) => (
                <TableRow key={voucher.id}>
                  <TableCell>{format(new Date(voucher.date), "dd MMM, yyyy")}</TableCell>
                  <TableCell className="font-medium">{voucher.id}</TableCell>
                  <TableCell>{voucher.narration}</TableCell>
                  <TableCell className="text-right font-mono">₹{voucher.amount.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => handleVoucherAction("View", voucher)}>
                          <FileText className="mr-2 h-4 w-4" />
                          View Voucher
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleVoucherAction("Edit", voucher)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onSelect={() => handleVoucherAction("Delete", voucher)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Reverse / Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {selectedVoucher && (
        <Dialog open={!!selectedVoucher} onOpenChange={(open) => !open && setSelectedVoucher(null)}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Journal Voucher: {selectedVoucher.id}</DialogTitle>
                    <DialogDescription>
                        Date: {format(new Date(selectedVoucher.date), "dd MMMM, yyyy")}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50%]">Account</TableHead>
                                <TableHead className="w-[20%]">Cost Centre</TableHead>
                                <TableHead className="text-right">Debit</TableHead>
                                <TableHead className="text-right">Credit</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {selectedVoucher.lines.map((line, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{combinedAccounts.find(a => a.value === line.account)?.label || line.account}</TableCell>
                                    <TableCell>{costCentres.find(cc => cc.id === line.costCentre)?.name || '-'}</TableCell>
                                    <TableCell className="text-right font-mono">{parseFloat(line.debit) > 0 ? `₹${parseFloat(line.debit).toFixed(2)}` : '-'}</TableCell>
                                    <TableCell className="text-right font-mono">{parseFloat(line.credit) > 0 ? `₹${parseFloat(line.credit).toFixed(2)}` : '-'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                         <TableFooter>
                            <TableRow className="font-bold bg-muted/50">
                                <TableCell colSpan={2}>Total</TableCell>
                                <TableCell className="text-right font-mono">₹{selectedVoucher.amount.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-mono">₹{selectedVoucher.amount.toFixed(2)}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                     <div>
                        <p className="font-medium text-sm">Narration:</p>
                        <p className="text-muted-foreground text-sm">{selectedVoucher.narration}</p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
      )}

    </div>
  );
}


"use client";

import { useState, useContext, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
  Sparkles,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { AccountingContext } from "@/context/accounting-context";
import { Badge } from "@/components/ui/badge";
import { allAccounts } from "@/lib/accounts";
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuthState } from "react-firebase-hooks/auth";
import Link from "next/link";


export default function VouchersPage() {
    const accountingContext = useContext(AccountingContext);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [dialogType, setDialogType] = useState<'receipt' | 'payment'>('receipt');
    const [transactionType, setTransactionType] = useState<string>("on_account");
    const [date, setDate] = useState<Date | undefined>(new Date());
    const { toast } = useToast();
    const [user] = useAuthState(auth);

    const customersQuery = user ? query(collection(db, 'customers'), where("userId", "==", user.uid)) : null;
    const [customersSnapshot] = useCollection(customersQuery);
    const customers = useMemo(() => customersSnapshot?.docs.map(doc => ({ id: doc.id, name: doc.data().name })) || [], [customersSnapshot]);

    const vendorsQuery = user ? query(collection(db, 'vendors'), where("userId", "==", user.uid)) : null;
    const [vendorsSnapshot] = useCollection(vendorsQuery);
    const vendors = useMemo(() => vendorsSnapshot?.docs.map(doc => ({ id: doc.id, name: doc.data().name })) || [], [vendorsSnapshot]);

    const combinedAccounts = useMemo(() => {
        return [
            ...allAccounts.map(acc => ({ value: acc.code, label: `${acc.name} (${acc.code})`, group: "Main Accounts" })),
            ...customers.map(c => ({ value: c.id, label: `${c.name} (Customer)`, group: "Customers" })),
            ...vendors.map(v => ({ value: v.id, label: `${v.name} (Vendor)`, group: "Vendors" })),
        ];
    }, [allAccounts, customers, vendors]);


    if (!accountingContext) {
        return <Loader2 className="animate-spin" />;
    }
    
    const { journalVouchers, addJournalVoucher, loading } = accountingContext;

    const { receipts, payments } = useMemo(() => {
        const reversedIds = new Set(
            journalVouchers
              .filter(v => v && v.reverses)
              .map(v => v.reverses)
        );

        const allReceipts = journalVouchers
            .filter(v => v && v.id && v.id.startsWith("RV-"))
            .map(v => {
                const isReversed = reversedIds.has(v.id);
                return {
                    id: v.id,
                    date: v.date,
                    party: v.narration.split(" from ")[1]?.split(" against")[0] || v.narration,
                    amount: v.amount,
                    mode: v.lines.some(l => l.account === '1010') ? 'Cash' : 'Bank',
                    status: isReversed ? 'Reversed' : 'Active'
                };
            });

        const allPayments = journalVouchers
            .filter(v => v && v.id && v.id.startsWith("PV-"))
            .map(v => {
                const isReversed = reversedIds.has(v.id);
                 return {
                    id: v.id,
                    date: v.date,
                    party: v.narration.split(" to ")[1]?.split(" for")[0] || v.narration,
                    amount: v.amount,
                    mode: v.lines.some(l => l.account === '1010') ? 'Cash' : 'Bank',
                    status: isReversed ? 'Reversed' : 'Active'
                };
            });

        return { 
            receipts: allReceipts.filter(v => !reversedIds.has(v.id)),
            payments: allPayments.filter(v => !reversedIds.has(v.id))
        };
    }, [journalVouchers]);
    
    const handleDeleteVoucher = async (voucherId: string) => {
        const originalVoucher = journalVouchers.find(v => v.id === voucherId);

        if (!originalVoucher) {
            toast({ variant: "destructive", title: "Error", description: "Original voucher transaction not found." });
            return;
        }

        const reversalLines = originalVoucher.lines.map(line => ({
            account: line.account,
            debit: line.credit, // Swap debit and credit
            credit: line.debit,
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
            toast({ title: "Voucher Reversed", description: `Voucher #${voucherId} has been successfully reversed.` });
        } catch (e: any) {
            toast({ variant: "destructive", title: "Reversal Failed", description: e.message });
        }
    };
    
    const handleAction = (action: string, voucherId: string) => {
        if(action === 'Delete') {
            handleDeleteVoucher(voucherId);
        } else {
            toast({
                title: `${action} Voucher`,
                description: `Simulating ${action.toLowerCase()} action for voucher ${voucherId}.`,
            });
        }
    };

    const openDialog = (type: 'receipt' | 'payment') => {
        setDialogType(type);
        setTransactionType('on_account'); // Reset on open
        setIsAddDialogOpen(true);
    };

    const dialogTitle = dialogType === 'receipt' ? "New Receipt Voucher" : "New Payment Voucher";
    const dialogDescription = dialogType === 'receipt' ? "Record cash or bank receipts from customers or other income." : "Record cash or bank payments to vendors or for expenses.";


  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Receipt & Payment Vouchers</h1>
          <p className="text-muted-foreground">
            Record all cash and bank transactions.
          </p>
        </div>
      </div>
      
      <Tabs defaultValue="receipts">
        <div className="flex justify-between items-start">
            <TabsList className="grid w-full grid-cols-2 max-w-sm">
                <TabsTrigger value="receipts">Receipts</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
                 <Button onClick={() => openDialog('receipt')} variant="outline">
                    New Receipt
                </Button>
                <Button onClick={() => openDialog('payment')} variant="outline">
                    New Payment
                </Button>
                <Link href="/accounting/vouchers/rapid" passHref>
                    <Button>
                        <Sparkles className="mr-2"/>
                        Rapid Entry
                    </Button>
                </Link>
            </div>
        </div>
        <TabsContent value="receipts" className="mt-4">
            <Card>
                <CardHeader>
                <CardTitle>Receipts</CardTitle>
                <CardDescription>
                    A list of all cash and bank receipts.
                </CardDescription>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Voucher #</TableHead>
                        <TableHead>Received From</TableHead>
                        <TableHead>Mode</TableHead>
                         <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {loading && <TableRow><TableCell colSpan={7} className="text-center"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>}
                    {receipts.map((voucher) => (
                        <TableRow key={voucher.id}>
                        <TableCell>{format(new Date(voucher.date), "dd MMM, yyyy")}</TableCell>
                        <TableCell className="font-medium">{voucher.id}</TableCell>
                        <TableCell>{voucher.party}</TableCell>
                        <TableCell>{voucher.mode}</TableCell>
                         <TableCell><Badge variant={voucher.status === 'Reversed' ? 'destructive' : 'default'}>{voucher.status}</Badge></TableCell>
                        <TableCell className="text-right font-mono">₹{voucher.amount.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                           <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={() => handleAction("View", voucher.id)}><FileText className="mr-2"/>View Details</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleAction("Edit", voucher.id)}><Edit className="mr-2"/>Edit</DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive" onSelect={() => handleAction("Delete", voucher.id)} disabled={voucher.status === 'Reversed'}>
                                        <Trash2 className="mr-2"/>Delete
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
        </TabsContent>
         <TabsContent value="payments" className="mt-4">
            <Card>
                <CardHeader>
                <CardTitle>Payments</CardTitle>
                <CardDescription>
                    A list of all cash and bank payments.
                </CardDescription>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Voucher #</TableHead>
                        <TableHead>Paid To</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {loading && <TableRow><TableCell colSpan={7} className="text-center"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>}
                    {payments.map((voucher) => (
                        <TableRow key={voucher.id}>
                        <TableCell>{format(new Date(voucher.date), "dd MMM, yyyy")}</TableCell>
                        <TableCell className="font-medium">{voucher.id}</TableCell>
                        <TableCell>{voucher.party}</TableCell>
                        <TableCell>{voucher.mode}</TableCell>
                        <TableCell><Badge variant={voucher.status === 'Reversed' ? 'destructive' : 'default'}>{voucher.status}</Badge></TableCell>
                        <TableCell className="text-right font-mono">₹{voucher.amount.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={() => handleAction("View", voucher.id)}><FileText className="mr-2"/>View Details</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleAction("Edit", voucher.id)}><Edit className="mr-2"/>Edit</DropdownMenuItem>
                                     <DropdownMenuItem className="text-destructive" onSelect={() => handleAction("Delete", voucher.id)} disabled={voucher.status === 'Reversed'}>
                                        <Trash2 className="mr-2"/>Delete
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
        </TabsContent>
      </Tabs>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{dialogTitle}</DialogTitle>
                    <DialogDescription>{dialogDescription}</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                         <div className="space-y-2">
                             <Label>Voucher Date</Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")} >
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
                            <Label>{dialogType === 'receipt' ? 'Received From' : 'Paid To'}</Label>
                            <Select>
                                <SelectTrigger><SelectValue placeholder="Select Account" /></SelectTrigger>
                                <SelectContent>
                                    {Object.entries(combinedAccounts.reduce((acc, curr) => {
                                        if (!acc[curr.group]) acc[curr.group] = [];
                                        acc[curr.group].push(curr);
                                        return acc;
                                    }, {} as Record<string, any[]>)).map(([group, accounts]) => (
                                        <div key={group}>
                                            <p className="px-2 py-1.5 text-sm font-semibold capitalize">{group}</p>
                                            {accounts.map(acc => <SelectItem key={acc.value} value={acc.value}>{acc.label}</SelectItem>)}
                                            <Separator className="my-2" />
                                        </div>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Transaction Type</Label>
                             <Select defaultValue="on_account" onValueChange={(value) => setTransactionType(value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select transaction type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="against_invoice">Against Invoice</SelectItem>
                                    <SelectItem value="on_account">On Account</SelectItem>
                                    <SelectItem value="advance">Advance</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {transactionType === 'against_invoice' && (
                             <div className="space-y-2">
                                <Label>Select Invoice</Label>
                                <Select>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select an invoice to settle" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {/* Invoices would be dynamically populated here */}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <Separator/>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Amount (₹)</Label>
                            <Input type="number" placeholder="0.00"/>
                        </div>
                         <div className="space-y-2">
                             <Label>Mode</Label>
                             <Select defaultValue="bank">
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="bank">Bank</SelectItem>
                                    <SelectItem value="cash">Cash</SelectItem>
                                </SelectContent>
                             </Select>
                         </div>
                         <div className="space-y-2">
                            <Label>Reference No. / Cheque No.</Label>
                            <Input placeholder="e.g., Cheque 123456"/>
                         </div>
                     </div>
                     <div className="space-y-2">
                        <Label>Narration</Label>
                        <Textarea placeholder="A brief description of the transaction"/>
                     </div>
                </div>
                <DialogFooter>
                    <Button onClick={() => setIsAddDialogOpen(false)}>Save Voucher</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

    </div>
  );
}

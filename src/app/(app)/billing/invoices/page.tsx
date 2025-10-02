

"use client";

import { useState, useMemo, useContext, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, MoreHorizontal, FileText, IndianRupee, AlertCircle, CheckCircle, Edit, Download, Copy, Trash2, Zap, Search, MessageSquare, Printer, FileSpreadsheet } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, isPast, subDays } from 'date-fns';
import { AccountingContext, type JournalVoucher } from "@/context/accounting-context";
import { db, auth } from "@/lib/firebase";
import { collection, query, where } from "firebase/firestore";
import { useCollection } from 'react-firebase-hooks/firestore';
import { useAuthState } from "react-firebase-hooks/auth";
import { InvoicePreview } from "@/components/billing/invoice-preview";
import { ShareButtons } from "@/components/documents/share-buttons";
import { QuickInvoiceDialog } from "@/components/billing/quick-invoice-dialog";

type Invoice = {
  id: string;
  customer: string;
  date: string;
  dueDate: string;
  amount: number;
  status: string;
  raw: JournalVoucher;
}

function EwaybillDialog({ invoice, isOpen, onOpenChange }: { invoice: Invoice | null, isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    const { toast } = useToast();
    const handleGenerate = () => {
        toast({ title: "E-Waybill Generated (Simulated)", description: "The E-Waybill has been successfully generated." });
        onOpenChange(false);
    }

    if (!invoice) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Generate E-Waybill for Invoice {invoice.id}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label>Supply Type</Label>
                            <Input value="Outward" readOnly />
                        </div>
                        <div className="space-y-2">
                            <Label>Sub Type</Label>
                            <Input value="Supply" readOnly />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Transporter Name</Label>
                        <Input placeholder="Enter transporter's name" />
                    </div>
                    <div className="space-y-2">
                        <Label>Vehicle Number</Label>
                        <Input placeholder="Enter vehicle number (e.g., MH01AB1234)" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleGenerate}>Generate E-Waybill</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function InvoicesPage() {
  const { journalVouchers, addJournalVoucher, loading: journalLoading } = useContext(AccountingContext)!;
  const [user] = useAuthState(auth);
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isEwaybillDialogOpen, setIsEwaybillDialogOpen] = useState(false);
  const [isQuickInvoiceOpen, setIsQuickInvoiceOpen] = useState(false);

  const invoicePreviewRef = useRef<HTMLDivElement>(null);

  const customersQuery = user ? query(collection(db, 'customers'), where("userId", "==", user.uid)) : null;
  const [customersSnapshot, customersLoading] = useCollection(customersQuery);
  const customers = useMemo(() => customersSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [], [customersSnapshot]);

  const invoices: Invoice[] = useMemo(() => {
    const allInvoices = journalVouchers.filter(v => v && v.id && v.id.startsWith("INV-") && !v.reverses);
    
    const cancelledInvoiceIds = new Set(
        journalVouchers
            .filter(v => v && v.reverses && v.reverses.startsWith("INV-"))
            .map(v => v.reverses)
    );
    
    return allInvoices
        .map(v => {
            if (!v || !v.id) return null;
            const isCancelled = cancelledInvoiceIds.has(v.id);
            const dueDate = addDays(new Date(v.date), 30);
            const isOverdue = !isCancelled && isPast(dueDate);
            
            let status = "Pending";
            if (isCancelled) {
                status = "Cancelled";
            } else if (isOverdue) {
                status = "Overdue";
            }
            
            return {
                id: v.id,
                customer: v.narration.replace("Sale of ", "").split(" to ")[1] || "N/A",
                date: v.date,
                dueDate: format(dueDate, 'yyyy-MM-dd'),
                amount: v.amount,
                status: status,
                raw: v,
            }
        })
        .filter((v): v is Invoice => v !== null);
  }, [journalVouchers]);


    const handleCancelInvoice = async (invoiceId: string): Promise<boolean> => {
        const originalVoucher = journalVouchers.find(v => v.id === invoiceId);

        if (!originalVoucher) {
            toast({ variant: "destructive", title: "Error", description: "Original invoice transaction not found." });
            return false;
        }

        // Create the reversal entry
        const reversalLines = originalVoucher.lines.map(line => ({
            account: line.account,
            debit: line.credit, // Swap debit and credit
            credit: line.debit,
        }));

        const cancellationVoucher = {
            id: `CANCEL-${invoiceId}-${Date.now()}`,
            reverses: invoiceId,
            date: new Date().toISOString().split('T')[0],
            narration: `Cancellation of Invoice #${invoiceId}`,
            lines: reversalLines,
            amount: originalVoucher.amount,
            customerId: originalVoucher.customerId,
        };

        try {
            await addJournalVoucher(cancellationVoucher as any);
            toast({ title: "Invoice Cancelled", description: `Invoice has been successfully cancelled.` });
            return true;
        } catch (e: any) {
            toast({ variant: "destructive", title: "Cancellation Failed", description: e.message });
            return false;
        }
    };
    
    const companyInfo = {
        name: "ZenithBooks Solutions Pvt. Ltd.",
    };

    const handleAction = async (action: string, invoice: Invoice) => {
        if (action === 'View') {
            setSelectedInvoice(invoice);
        } else if (action === 'Cancel') {
            await handleCancelInvoice(invoice.id);
        } else if (action === 'Duplicate') {
            const queryParams = new URLSearchParams({
                duplicate: invoice.id
            }).toString();
            router.push(`/billing/invoices/new?${queryParams}`);
        } else if (action === 'Edit') {
            toast({ title: 'Editing Invoice...', description: `Cancelling ${invoice.id} and creating a new draft.` });
            const cancelled = await handleCancelInvoice(invoice.id);
            if (cancelled) {
                const queryParams = new URLSearchParams({
                    edit: invoice.id
                }).toString();
                router.push(`/billing/invoices/new?${queryParams}`);
            } else {
                 toast({ variant: 'destructive', title: 'Edit Failed', description: `Could not cancel the original invoice.` });
            }
        } else if (action === 'Remind') {
            const customer: any = customers.find(c => c.id === invoice.raw.customerId);
            if (customer && customer.phone) {
                const message = encodeURIComponent(
                    `Hi ${customer.name}, this is a friendly reminder for invoice ${invoice.id} amounting to ₹${invoice.amount.toFixed(2)}, which was due on ${format(new Date(invoice.dueDate), "dd MMM, yyyy")}. Please make the payment at your earliest convenience. Thank you, ${companyInfo.name}.`
                );
                window.open(`https://wa.me/${customer.phone}?text=${message}`, '_blank');
            } else {
                 toast({ variant: "destructive", title: "Cannot Send Reminder", description: "Customer phone number is not available." });
            }
        }
        else if (action === 'Ewaybill') {
          setSelectedInvoice(invoice);
          setIsEwaybillDialogOpen(true);
        }
        else {
            toast({
                title: `Action: ${action}`,
                description: `This would ${action.toLowerCase()} invoice ${invoice.id}. This is a placeholder.`
            });
        }
    }


  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return <Badge className="bg-green-600 hover:bg-green-700">Paid</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
       case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredInvoices = useMemo(() => {
    if (!searchTerm) return invoices;
    return invoices.filter(invoice =>
        invoice.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [invoices, searchTerm]);
  
  const totalOutstanding = useMemo(() => invoices.reduce((acc, inv) => (inv.status === 'Pending' || inv.status === 'Overdue') ? acc + inv.amount : acc, 0), [invoices]);
  const totalOverdue = useMemo(() => invoices.reduce((acc, inv) => inv.status === 'Overdue' ? acc + inv.amount : acc, 0), [invoices]);
  const overdueCount = useMemo(() => invoices.filter(inv => inv.status === 'Overdue').length, [invoices]);
  
  const paidLast30Days = useMemo(() => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    // Placeholder logic since we don't track payments yet
    return 0;
  }, [journalVouchers]);


  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">
            Create and manage your sales invoices.
          </p>
        </div>
        <div className="flex gap-2">
            <Link href="/billing/invoices/rapid" passHref>
                <Button variant="outline">
                    <Zap className="mr-2"/>
                    Rapid Entry
                </Button>
            </Link>
            <Link href="/billing/invoices/new" passHref>
            <Button>
                <PlusCircle className="mr-2"/>
                Create Full Invoice
            </Button>
            </Link>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard 
          title="Total Outstanding"
          value={`₹${totalOutstanding.toFixed(2)}`}
          icon={IndianRupee}
          description="Amount yet to be received"
          loading={journalLoading}
        />
        <StatCard 
          title="Total Overdue"
          value={`₹${totalOverdue.toFixed(2)}`}
          icon={AlertCircle}
          description={`${overdueCount} invoice${overdueCount === 1 ? '' : 's'} overdue`}
          className="text-destructive"
          loading={journalLoading}
        />
        <StatCard 
          title="Paid (Last 30 days)"
          value={`₹${paidLast30Days.toFixed(2)}`}
          icon={CheckCircle}
          description="From 0 invoices"
          loading={journalLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice List</CardTitle>
          <CardDescription>
            Here is a list of your most recent invoices.
          </CardDescription>
           <div className="relative pt-4">
                <Search className="absolute left-2.5 top-6 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by Invoice # or Customer..."
                  className="pl-8 w-full md:w-1/3"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.id}</TableCell>
                    <TableCell>{invoice.customer}</TableCell>
                    <TableCell>{format(new Date(invoice.date), "dd MMM, yyyy")}</TableCell>
                    <TableCell>{format(new Date(invoice.dueDate), "dd MMM, yyyy")}</TableCell>
                    <TableCell className="text-center">{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell className="text-right">₹{invoice.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => handleAction('View', invoice)}>
                              <FileText className="mr-2" /> View Invoice
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleAction('Edit', invoice)} disabled={invoice.status === 'Cancelled'}>
                              <Edit className="mr-2" /> Edit Invoice
                            </DropdownMenuItem>
                             <DropdownMenuItem onSelect={() => handleAction('Ewaybill', invoice)} disabled={invoice.status === 'Cancelled'}>
                              <FileSpreadsheet className="mr-2" /> Generate E-Waybill
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleAction('Remind', invoice)} disabled={invoice.status === 'Cancelled' || invoice.status === 'Paid'}>
                                <MessageSquare className="mr-2" /> Send Reminder
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleAction('Duplicate', invoice)}>
                              <Copy className="mr-2" /> Duplicate Invoice
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onSelect={() => handleAction('Cancel', invoice)} disabled={invoice.status === 'Cancelled'}>
                              <Trash2 className="mr-2" /> Cancel Invoice
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={!!selectedInvoice && !isEwaybillDialogOpen} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Invoice Preview: {selectedInvoice?.id}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
            {selectedInvoice && (
              <InvoicePreview
                invoice={selectedInvoice}
                customers={customers}
                ref={invoicePreviewRef}
              />
            )}
          </div>
          <DialogFooter>
             {selectedInvoice && <ShareButtons
                contentRef={invoicePreviewRef}
                fileName={`Invoice_${selectedInvoice.id}`}
                whatsappMessage={`Hi ${selectedInvoice.customer}, please find attached invoice ${selectedInvoice.id} for ₹${selectedInvoice.amount.toFixed(2)}. Thank you.`}
            />}
          </DialogFooter>
        </DialogContent>
      </Dialog>

       <EwaybillDialog invoice={selectedInvoice} isOpen={isEwaybillDialogOpen} onOpenChange={setIsEwaybillDialogOpen} />
       <QuickInvoiceDialog open={isQuickInvoiceOpen} onOpenChange={setIsQuickInvoiceOpen} />
    </div>
  );
}

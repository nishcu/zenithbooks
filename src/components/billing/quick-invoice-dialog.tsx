
"use client";

import { useState, useMemo, useContext, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AccountingContext } from "@/context/accounting-context";
import { db, auth } from "@/lib/firebase";
import { collection, query, where } from "firebase/firestore";
import { useCollection } from 'react-firebase-hooks/firestore';
import { useAuthState } from "react-firebase-hooks/auth";

export function QuickInvoiceDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const [user] = useAuthState(auth);
  const accountingContext = useContext(AccountingContext);

  const [quickInvNum, setQuickInvNum] = useState("");
  const [quickCustomer, setQuickCustomer] = useState("");
  const [quickItem, setQuickItem] = useState<{ id: string, name: string, sellingPrice: number} | null>(null);
  const [quickQty, setQuickQty] = useState(1);
  const [quickRate, setQuickRate] = useState(0);

  const customersQuery = user ? query(collection(db, 'customers'), where("userId", "==", user.uid)) : null;
  const [customersSnapshot, customersLoading] = useCollection(customersQuery);
  const customers = useMemo(() => customersSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [], [customersSnapshot]);

  const itemsQuery = user ? query(collection(db, 'items'), where("userId", "==", user.uid)) : null;
  const [itemsSnapshot, itemsLoading] = useCollection(itemsQuery);
  const items = useMemo(() => itemsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [], [itemsSnapshot]);
  
  useEffect(() => {
    if (quickItem) {
      setQuickRate(quickItem.sellingPrice || 0);
    }
  }, [quickItem]);


  if (!accountingContext) return null;
  const { addJournalVoucher } = accountingContext;

  const handleQuickInvoiceCreate = async () => {
    const selectedCustomer = customers.find((c: any) => c.id === quickCustomer);
    if (!quickInvNum || !selectedCustomer || !quickItem || quickRate <= 0) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill out all fields for the quick invoice.",
      });
      return;
    }
    
    const subtotal = quickQty * quickRate;
    const tax = subtotal * 0.18; // Assuming 18% GST for simplicity
    const totalAmount = subtotal + tax;
    const invoiceId = `INV-${quickInvNum}`;

    const journalLines = [
        { account: selectedCustomer.id, debit: totalAmount.toFixed(2), credit: '0' },
        { account: '4010', debit: '0', credit: subtotal.toFixed(2) },
        { account: '2110', debit: '0', credit: tax.toFixed(2) }
    ];

    try {
      await addJournalVoucher({
            id: invoiceId,
            date: new Date().toISOString().split('T')[0],
            narration: `Sale to ${selectedCustomer.name} via Invoice #${invoiceId}`,
            lines: journalLines,
            amount: totalAmount,
            customerId: quickCustomer,
        });

        toast({
            title: "Quick Invoice Created!",
            description: `Invoice ${invoiceId} has been created and recorded.`
        });

        // Reset form
        setQuickInvNum("");
        setQuickCustomer("");
        setQuickItem(null);
        setQuickQty(1);
        setQuickRate(0);
        onOpenChange(false);

    } catch (e: any) {
        toast({ variant: "destructive", title: "Failed to save invoice", description: e.message });
    }
  }

  const handleQuickItemChange = (itemId: string) => {
    const selectedItem = items.find((i: any) => i.id === itemId);
    if(selectedItem) {
        setQuickItem(selectedItem as any);
        setQuickRate((selectedItem as any).sellingPrice || 0);
    }
  }

  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Quick Invoice</DialogTitle>
                    <DialogDescription>Create a simple invoice with just the essentials.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="quick-inv-num">Invoice #</Label>
                        <Input id="quick-inv-num" placeholder="005" value={quickInvNum} onChange={e => setQuickInvNum(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="quick-customer">Customer</Label>
                        <Select value={quickCustomer} onValueChange={setQuickCustomer} disabled={customersLoading}>
                            <SelectTrigger id="quick-customer"><SelectValue placeholder={customersLoading ? "Loading..." : "Select customer"} /></SelectTrigger>
                            <SelectContent>{customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="quick-item">Item</Label>
                        <Select value={quickItem?.id || ""} onValueChange={handleQuickItemChange} disabled={itemsLoading}>
                            <SelectTrigger id="quick-item"><SelectValue placeholder={itemsLoading ? "Loading..." : "Select item"} /></SelectTrigger>
                            <SelectContent>{items.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="quick-qty">Qty</Label>
                            <Input id="quick-qty" type="number" placeholder="1" value={quickQty} onChange={e => setQuickQty(parseInt(e.target.value) || 1)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="quick-rate">Rate (₹)</Label>
                            <Input id="quick-rate" type="number" placeholder="0.00" value={quickRate} onChange={e => setQuickRate(parseFloat(e.target.value) || 0)} />
                        </div>
                     </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleQuickInvoiceCreate}>Create Quick Invoice</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
  )
}

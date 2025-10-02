
"use client";

import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { useToast } from "@/hooks/use-toast";
import { useAccountingContext } from "@/context/accounting-context";
import { db, auth } from "@/lib/firebase";
import { collection, query, where } from "firebase/firestore";
import { useCollection } from 'react-firebase-hooks/firestore';
import { useAuthState } from "react-firebase-hooks/auth";
import { RapidEntryForm, RapidEntryFormValues, rapidEntrySchema } from "@/components/billing/rapid-entry-form";

export default function RapidInvoiceEntryPage() {
  const accountingContext = useAccountingContext();
  const { toast } = useToast();
  const router = useRouter();
  const [user] = useAuthState(auth);
  
  const customersQuery = user ? query(collection(db, 'customers'), where("userId", "==", user.uid)) : null;
  const [customersSnapshot, customersLoading] = useCollection(customersQuery);
  const customers = useMemo(() => customersSnapshot?.docs.map(doc => ({ id: doc.id, name: doc.data().name, ...doc.data() })) || [], [customersSnapshot]);

  const itemsQuery = user ? query(collection(db, 'items'), where("userId", "==", user.uid)) : null;
  const [itemsSnapshot, itemsLoading] = useCollection(itemsQuery);
  const items = useMemo(() => itemsSnapshot?.docs.map(doc => ({ id: doc.id, name: doc.data().name, ...doc.data() })) || [], [itemsSnapshot]);

  const form = useForm<RapidEntryFormValues>({
    resolver: zodResolver(rapidEntrySchema),
    defaultValues: {
      partyId: "",
      voucherNumber: "",
      voucherDate: new Date().toISOString().split("T")[0],
      itemId: "",
      amount: 0,
    },
  });

  const handleSave = useCallback(async (values: RapidEntryFormValues, closeOnSave: boolean) => {
    if (!accountingContext) return;
    const { addJournalVoucher, journalVouchers } = accountingContext;

    const selectedParty = customers.find(c => c.id === values.partyId);
    const selectedItem: any = items.find((i:any) => i.id === values.itemId);

    if (!selectedParty || !selectedItem) {
        toast({ variant: "destructive", title: "Invalid Selection", description: "Please ensure customer and item are selected." });
        return;
    }
    
    const voucherId = `INV-${values.voucherNumber}`;
    const isDuplicate = journalVouchers.some(voucher => voucher.id === voucherId);

    if (isDuplicate) {
        toast({ variant: "destructive", title: "Duplicate Invoice", description: `An invoice with the number ${voucherId} already exists.` });
        return;
    }

    const subtotal = values.amount;
    const taxAmount = subtotal * 0.18;
    const totalAmount = subtotal + taxAmount;

    const journalLines = [
        { account: values.partyId, debit: totalAmount.toFixed(2), credit: '0' },
        { account: '4010', debit: '0', credit: subtotal.toFixed(2) },
        { account: '2110', debit: '0', credit: taxAmount.toFixed(2) }
    ];

    try {
        await addJournalVoucher({
            id: voucherId,
            date: values.voucherDate,
            narration: `Sale of ${selectedItem.name} to ${selectedParty.name}`,
            lines: journalLines,
            amount: totalAmount,
            customerId: values.partyId,
        });

        toast({ title: "Invoice Saved", description: `Invoice #${values.voucherNumber} has been created.` });

        if (closeOnSave) {
            router.push("/billing/invoices");
        } else {
            const currentInvNumber = parseInt(values.voucherNumber.replace(/[^0-9]/g, ''), 10);
            const nextInvNumber = isNaN(currentInvNumber) ? "" : String(currentInvNumber + 1).padStart(3, '0');
            form.reset({
                ...values,
                voucherNumber: nextInvNumber,
                itemId: "",
                amount: 0,
            });
            form.setFocus("itemId");
        }
    } catch (e: any) {
        toast({ variant: "destructive", title: "Failed to save invoice", description: e.message });
    }
  }, [accountingContext, customers, items, form, router, toast]);

  return (
    <RapidEntryForm
      form={form}
      handleSave={handleSave}
      entryType="invoice"
      partyList={customers}
      partyLoading={customersLoading}
      itemList={items}
      itemLoading={itemsLoading}
    />
  );
}

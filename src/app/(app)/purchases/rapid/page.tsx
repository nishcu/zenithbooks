
"use client";

import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useToast } from "@/hooks/use-toast";
import { useAccountingContext } from "@/context/accounting-context";
import { db, auth } from "@/lib/firebase";
import { collection, query, where } from "firebase/firestore";
import { useCollection } from 'react-firebase-hooks/firestore';
import { useAuthState } from "react-firebase-hooks/auth";
import { RapidEntryForm, RapidEntryFormValues, rapidEntrySchema } from "@/components/billing/rapid-entry-form";

export default function RapidPurchaseEntryPage() {
  const accountingContext = useAccountingContext();
  const { toast } = useToast();
  const router = useRouter();
  const [user] = useAuthState(auth);
  
  const vendorsQuery = user ? query(collection(db, 'vendors'), where("userId", "==", user.uid)) : null;
  const [vendorsSnapshot, vendorsLoading] = useCollection(vendorsQuery);
  const vendors = useMemo(() => vendorsSnapshot?.docs.map(doc => ({ id: doc.id, name: doc.data().name, ...doc.data() })) || [], [vendorsSnapshot]);

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

    const selectedParty = vendors.find(v => v.id === values.partyId);
    const selectedItem: any = items.find((i:any) => i.id === values.itemId);

    if (!selectedParty || !selectedItem) {
        toast({ variant: "destructive", title: "Invalid Selection", description: "Please ensure vendor and item are selected." });
        return;
    }
    
    const voucherId = `BILL-${values.voucherNumber}`;
    const isDuplicate = journalVouchers.some(voucher => voucher.id === voucherId);

    if (isDuplicate) {
        toast({ variant: "destructive", title: "Duplicate Bill Number", description: `A bill with the number ${voucherId} already exists.` });
        return;
    }

    const subtotal = values.amount;
    const taxAmount = subtotal * 0.18;
    const totalAmount = subtotal + taxAmount;

    const journalLines = [
        { account: '5050', debit: subtotal.toFixed(2), credit: '0' },
        { account: '2110', debit: taxAmount.toFixed(2), credit: '0' },
        { account: values.partyId, debit: '0', credit: totalAmount.toFixed(2) }
    ];

    try {
        await addJournalVoucher({
            id: voucherId,
            date: values.voucherDate,
            narration: `Purchase of ${selectedItem.name} from ${selectedParty.name}`,
            lines: journalLines,
            amount: totalAmount,
            vendorId: values.partyId,
        });

        toast({ title: "Purchase Saved", description: `Bill #${values.voucherNumber} has been created.` });

        if (closeOnSave) {
            router.push("/purchases");
        } else {
            const currentBillNumber = parseInt(values.voucherNumber.replace(/[^0-9]/g, ''), 10);
            const nextBillNumber = isNaN(currentBillNumber) ? "" : String(currentBillNumber + 1).padStart(3, '0');
            form.reset({
                ...values,
                voucherNumber: nextBillNumber,
                itemId: "",
                amount: 0,
            });
            form.setFocus("itemId");
        }
    } catch (e: any) {
        toast({ variant: "destructive", title: "Failed to save purchase", description: e.message });
    }
  }, [accountingContext, vendors, items, form, router, toast]);

  return (
    <RapidEntryForm
      form={form}
      handleSave={handleSave}
      entryType="purchase"
      partyList={vendors}
      partyLoading={vendorsLoading}
      itemList={items}
      itemLoading={itemsLoading}
    />
  );
}

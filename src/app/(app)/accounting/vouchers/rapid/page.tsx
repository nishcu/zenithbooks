
"use client";

import { useState, useContext, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AccountingContext } from "@/context/accounting-context";
import { generateAutoNarration, shouldAutoGenerateNarration } from "@/lib/narration-generator";
import { allAccounts } from "@/lib/accounts";
import { useToast } from "@/hooks/use-toast";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, doc, getDoc, getDocs } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { UpgradeRequiredAlert } from "@/components/upgrade-required-alert";

const rapidVoucherSchema = z.object({
  type: z.enum(["receipt", "payment"]),
  partyId: z.string().min(1, "Party is required."),
  voucherNumber: z.string().min(1, "Voucher number is required."),
  voucherDate: z.string().min(1, "Date is required."),
  mode: z.enum(["bank", "cash"]),
  amount: z.coerce.number().positive("Amount must be greater than zero."),
});

type RapidVoucherForm = z.infer<typeof rapidVoucherSchema>;

export default function RapidVoucherEntryPage() {
  // ALL HOOKS MUST BE CALLED UNCONDITIONALLY AT THE TOP LEVEL
  const accountingContext = useContext(AccountingContext);
  const { toast } = useToast();
  const router = useRouter();
  const [user] = useAuthState(auth);
  const uid = user?.uid || null;
  const [userData, setUserData] = useState<any>(null);
  const [userDataError, setUserDataError] = useState<string | null>(null);
  const subscriptionPlan = userData?.subscriptionPlan || 'freemium';
  const isFreemium = subscriptionPlan === 'freemium';
  
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState<string | null>(null);

  const [vendors, setVendors] = useState<Array<{ id: string; name: string }>>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [vendorsError, setVendorsError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setUserData(null);
      setCustomers([]);
      setVendors([]);
      return;
    }

    (async () => {
      // user
      try {
        setUserDataError(null);
        const snap = await getDoc(doc(db, "users", uid));
        setUserData(snap.exists() ? snap.data() : null);
      } catch (e: any) {
        console.error(e);
        setUserDataError(e?.message || "Failed to load user");
      }

      // customers
      try {
        setCustomersError(null);
        setCustomersLoading(true);
        const snap = await getDocs(query(collection(db, "customers"), where("userId", "==", uid)));
        setCustomers(snap.docs.map((d) => ({ id: d.id, name: (d.data() as any)?.name || "Unnamed" })));
      } catch (e: any) {
        console.error(e);
        setCustomersError(e?.message || "Failed to load customers");
      } finally {
        setCustomersLoading(false);
      }

      // vendors
      try {
        setVendorsError(null);
        setVendorsLoading(true);
        const snap = await getDocs(query(collection(db, "vendors"), where("userId", "==", uid)));
        setVendors(snap.docs.map((d) => ({ id: d.id, name: (d.data() as any)?.name || "Unnamed" })));
      } catch (e: any) {
        console.error(e);
        setVendorsError(e?.message || "Failed to load vendors");
      } finally {
        setVendorsLoading(false);
      }
    })();
  }, [uid]);

  const form = useForm<RapidVoucherForm>({
    resolver: zodResolver(rapidVoucherSchema),
    defaultValues: {
      type: "receipt",
      partyId: "",
      voucherNumber: "",
      voucherDate: format(new Date(), "yyyy-MM-dd"),
      mode: "bank",
      amount: 0,
    },
  });

  // Re-enabled: Rapid Voucher Entry UI (hooks remain above any returns).
  
  const voucherType = form.watch("type");
  const partyList = voucherType === 'receipt' ? customers : vendors;
  const partyLabel = voucherType === 'receipt' ? 'Received From (Customer)' : 'Paid To (Vendor)';
  const voucherPrefix = voucherType === 'receipt' ? 'RV' : 'PV';

  // Early return AFTER all hooks are called
  if (userDataError || customersError || vendorsError) {
    return (
      <div className="space-y-4 p-8">
        <h1 className="text-2xl font-bold">Rapid Voucher Entry</h1>
        <Card>
          <CardHeader>
            <CardTitle>Something went wrong</CardTitle>
            <CardDescription>Please refresh the page. If it persists, contact support.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {userDataError && <p><strong>User:</strong> {userDataError}</p>}
            {customersError && <p><strong>Customers:</strong> {customersError}</p>}
            {vendorsError && <p><strong>Vendors:</strong> {vendorsError}</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6 p-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold">Rapid Voucher Entry</h1>
        <Card>
          <CardHeader>
            <CardTitle>Please sign in</CardTitle>
            <CardDescription>You need to be logged in to create vouchers.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" onClick={() => router.push("/login")}>
              Go to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (user && isFreemium) {
    return (
      <div className="space-y-8 p-8">
        <h1 className="text-3xl font-bold">Rapid Voucher Entry</h1>
        <UpgradeRequiredAlert
          featureName="Rapid Voucher Entry"
          description="Quickly create receipt and payment vouchers with a Business or Professional plan."
          backHref="/accounting/vouchers"
          backLabel="Back to Vouchers"
        />
      </div>
    );
  }

  const handleSave = useCallback(async (values: RapidVoucherForm, closeOnSave: boolean) => {
    if (!accountingContext) return;
    const { addJournalVoucher } = accountingContext;

    const selectedParty = partyList.find(p => p.id === values.partyId);

    if (!selectedParty) {
        toast({ variant: "destructive", title: "Invalid Selection", description: "Please ensure a party is selected." });
        return;
    }
    
    const voucherId = `${voucherPrefix}-${values.voucherNumber}`;
    const cashOrBankAc = values.mode === 'cash' ? '1510' : '1520'; // Cash or HDFC Bank
    
    let journalLines, narration;
    if(values.type === 'receipt') {
        journalLines = [
            { account: cashOrBankAc, debit: values.amount.toFixed(2), credit: '0'}, // Debit Bank/Cash
            { account: values.partyId, debit: '0', credit: values.amount.toFixed(2)}  // Credit Customer
        ];
        narration = `Received payment from ${selectedParty.name}`;
    } else { // Payment
         journalLines = [
            { account: values.partyId, debit: values.amount.toFixed(2), credit: '0'}, // Debit Vendor
            { account: cashOrBankAc, debit: '0', credit: values.amount.toFixed(2)}  // Credit Bank/Cash
        ];
        narration = `Paid to ${selectedParty.name}`;
    }
    
    // Use auto-narration generator to enhance or validate narration
    const accounts = allAccounts.map(acc => ({ code: acc.code, name: acc.name, type: acc.type }));
    const customersList = customers.map(c => ({ id: c.id, name: c.name }));
    const vendorsList = vendors.map(v => ({ id: v.id, name: v.name }));
    const autoNarration = generateAutoNarration(journalLines, accounts, customersList, vendorsList);
    
    // Use auto-generated narration if it's more descriptive or if current narration is generic
    if (shouldAutoGenerateNarration(narration) || autoNarration.length > narration.length) {
        narration = autoNarration;
    }


    try {
        const newVoucher: any = {
            id: voucherId,
            date: values.voucherDate,
            narration,
            lines: journalLines,
            amount: values.amount,
        };

        if (values.type === 'receipt') {
            newVoucher.customerId = values.partyId;
        } else {
            newVoucher.vendorId = values.partyId;
        }

        await addJournalVoucher(newVoucher);

        toast({ title: "Voucher Saved", description: `${voucherId} has been created.` });

        if (closeOnSave) {
            router.push("/accounting/vouchers");
        } else {
            const currentVoucherNumber = parseInt(values.voucherNumber.replace(/[^0-9]/g, ''), 10);
            const nextVoucherNumber = isNaN(currentVoucherNumber) ? "" : String(currentVoucherNumber + 1).padStart(3, '0');

            form.reset({
                ...values,
                voucherNumber: nextVoucherNumber,
                partyId: "",
                amount: 0,
            });
            form.setFocus("partyId");
        }
    } catch (e: any) {
        toast({ variant: "destructive", title: "Failed to save voucher", description: e.message });
    }
  }, [accountingContext, partyList, toast, router, form, voucherPrefix]);

  const onSaveAndNew = form.handleSubmit(values => handleSave(values, false));
  const onSaveAndClose = form.handleSubmit(values => handleSave(values, true));

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Link href="/accounting/vouchers" passHref>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
      <div className="text-center">
        <h1 className="text-2xl font-bold flex items-center justify-center gap-2"><Sparkles className="text-primary"/> Rapid Voucher Entry</h1>
        <p className="text-muted-foreground">Quickly record multiple receipts and payments.</p>
      </div>
      <Form {...form}>
        <form>
            <Card>
                <CardHeader>
                <CardTitle>New Receipt / Payment</CardTitle>
                <CardDescription>
                    Fill details and click "Save &amp; New" to quickly add another.
                </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Voucher Type</FormLabel>
                          <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4">
                              <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="receipt" /></FormControl><FormLabel className="font-normal">Receipt</FormLabel></FormItem>
                              <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="payment" /></FormControl><FormLabel className="font-normal">Payment</FormLabel></FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid md:grid-cols-3 gap-4">
                        <FormField control={form.control} name="partyId" render={({ field }) => (
                            <FormItem>
                                <FormLabel>{partyLabel}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                      <SelectValue
                                        placeholder={
                                          customersLoading || vendorsLoading
                                            ? "Loading..."
                                            : partyList.length === 0
                                              ? (voucherType === "receipt" ? "No customers found" : "No vendors found")
                                              : "Select Party"
                                        }
                                      />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {partyList.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="voucherNumber" render={({ field }) => (
                            <FormItem><FormLabel>Voucher Number</FormLabel><FormControl><Input placeholder="001" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                         <FormField control={form.control} name="voucherDate" render={({ field }) => (
                            <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                    <Separator/>
                    <div className="grid md:grid-cols-2 gap-4">
                       <FormField control={form.control} name="mode" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Mode</FormLabel>
                                 <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="bank">Bank</SelectItem>
                                        <SelectItem value="cash">Cash</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}/>
                         <FormField control={form.control} name="amount" render={({ field }) => (
                            <FormItem><FormLabel>Amount (₹)</FormLabel><FormControl><Input type="number" placeholder="e.g., 50000" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={onSaveAndClose}>
                        Save & Close
                    </Button>
                    <Button type="button" onClick={onSaveAndNew}>
                        <Save className="mr-2"/>
                        Save & New
                    </Button>
                </CardFooter>
            </Card>
        </form>
      </Form>
    </div>
  );
}

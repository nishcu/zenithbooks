
"use client";

import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { collection, addDoc, doc, updateDoc, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { getUserOrganizationData, getDocumentData } from "@/lib/organization-utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { allAccounts } from "@/lib/accounts";
import { suggestHsnCodeAction } from "@/app/(app)/items/suggest-hsn/actions";
import { Wand2, Loader2 } from "lucide-react";

type Party = {
  id: string;
  name: string;
  gstin?: string;
  email?: string;
  phone?: string;
  address1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  accountCode?: string;
};

type Item = {
  id: string;
  name: string;
  description?: string;
  hsn?: string;
  gstRate?: number;
  stock?: number;
  purchasePrice?: number;
  sellingPrice?: number;
  stockGroupId?: string;
}

const partySchema = z.object({
    name: z.string().min(2, "Name is required."),
    gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN format.").optional().or(z.literal("")),
    email: z.string().email("Invalid email.").optional().or(z.literal("")),
    phone: z.string().optional(),
    address1: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
});

const itemSchema = z.object({
    name: z.string().min(2, "Item name is required."),
    description: z.string().optional(),
    hsn: z.string().optional(),
    gstRate: z.coerce.number().min(0).optional(),
    stock: z.coerce.number().min(0).optional(),
    purchasePrice: z.coerce.number().min(0).optional(),
    sellingPrice: z.coerce.number().min(0).optional(),
    stockGroupId: z.string().optional(),
});

const getNextAvailableCode = async (userId: string, type: string): Promise<string> => {
    const accountCodeRanges: Record<string, { start: number, end: number }> = {
        "Current Asset": { start: 1300, end: 1499 },
    };

    const range = accountCodeRanges[type];
    if (!range) return "";

    const userAccountsRef = collection(db, "user_accounts");
    const userAccountsQuery = query(userAccountsRef, where("userId", "==", userId));
    const userAccountsSnapshot = await getDocs(userAccountsQuery);
    const userAccounts = userAccountsSnapshot.docs.map(doc => doc.data());

    const combinedAccounts = [...allAccounts, ...userAccounts];
    const existingCodes = combinedAccounts
        .filter(acc => acc.type === type && acc.code)
        .map(acc => parseInt(acc.code));

    for (let i = range.start; i <= range.end; i++) {
        if (!existingCodes.includes(i)) {
            return String(i).padStart(4, '0');
        }
    }
    return ""; // No available code in range
};


export const assignAccountCode = async (party: Party, userId: string) => {
    if (party.accountCode) {
        return; // Already has an account code
    }

    const nextCode = await getNextAvailableCode(userId, "Current Asset");
    if (!nextCode) {
        throw new Error("No available account code in range.");
    }

    const batch = writeBatch(db);

    // 1. Create new account in user_accounts
    const newAccountRef = doc(collection(db, "user_accounts"));
    batch.set(newAccountRef, {
        code: nextCode,
        name: party.name,
        type: "Current Asset",
        userId: userId,
    });

    // 2. Update the party with the new account code
    const partyDocRef = doc(db, "customers", party.id);
    batch.update(partyDocRef, { accountCode: nextCode });

    await batch.commit();
    return nextCode;
};


export function PartyDialog({ open, onOpenChange, type, party }: { open: boolean, onOpenChange: (open: boolean) => void, type: 'Customer' | 'Vendor', party?: Party | null }) {
    const { toast } = useToast();
    const [user] = useAuthState(auth);

    const form = useForm<z.infer<typeof partySchema>>({
        resolver: zodResolver(partySchema),
        defaultValues: { name: '', gstin: '', email: '', phone: '', address1: '', city: '', state: '', pincode: '' },
    });

    useEffect(() => {
      if (party && open) {
        form.reset(party);
      } else if (!open) {
        form.reset({ name: '', gstin: '', email: '', phone: '', address1: '', city: '', state: '', pincode: '' });
      }
    }, [party, open, form]);

    const onSubmit = async (values: z.infer<typeof partySchema>) => {
         if (!user) {
            toast({ variant: "destructive", title: "Not Authenticated" });
            return;
        }
        const collectionName = type === 'Customer' ? 'customers' : 'vendors';
        try {
            // Get user organization data
            const orgData = await getUserOrganizationData(user);
            const docData = getDocumentData(user, orgData);

            if (party) {
                // Update existing party
                const partyDocRef = doc(db, collectionName, party.id);
                await updateDoc(partyDocRef, values);
                toast({ title: `${type} Updated`, description: `${values.name} has been updated.` });
            } else {
                // Add new party
                const nextCode = await getNextAvailableCode(user.uid, "Current Asset");
                if (!nextCode) {
                    toast({ variant: "destructive", title: "Error", description: "Could not generate an account code." });
                    return;
                }
                const batch = writeBatch(db);

                // 1. Create new account in user_accounts
                const newAccountRef = doc(collection(db, "user_accounts"));
                batch.set(newAccountRef, {
                    code: nextCode,
                    name: values.name,
                    type: "Current Asset",
                    userId: user.uid,
                    organizationId: docData.organizationId,
                });

                // 2. Add new party with the account code and organization data
                const newPartyRef = doc(collection(db, collectionName));
                batch.set(newPartyRef, { 
                    ...values, 
                    ...docData, // Includes userId, organizationId, clientId
                    accountCode: nextCode 
                });
                
                await batch.commit();

                toast({ title: `${type} Added`, description: `${values.name} has been saved with account code ${nextCode}.` });
            }

            onOpenChange(false);
        } catch (e) {
            console.error("Error saving document: ", e);
            toast({ variant: "destructive", title: "Error", description: `Could not save ${type.toLowerCase()}.` });
        }
    };

    const dialogTitle = party ? `Edit ${type}` : `Add New ${type}`;
    const dialogDescription = party ? `Update the details for ${party.name}.` : `Enter the details for your new ${type.toLowerCase()}.`;


    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[525px]">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <DialogHeader>
                            <DialogTitle>{dialogTitle}</DialogTitle>
                            <DialogDescription>{dialogDescription}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><Label>Name</Label><FormControl><Input placeholder={`${type}'s legal name`} {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="gstin" render={({ field }) => ( <FormItem><Label>GSTIN</Label><FormControl><Input placeholder="15-digit GSTIN" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <Separator/>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><Label>Email</Label><FormControl><Input placeholder="contact@example.com" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><Label>Phone</Label><FormControl><Input placeholder="+91 98765 43210" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                             <FormField control={form.control} name="address1" render={({ field }) => ( <FormItem><Label>Address</Label><FormControl><Input placeholder="Address Line 1" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                             <div className="grid grid-cols-3 gap-4">
                                <FormField control={form.control} name="city" render={({ field }) => ( <FormItem><Label>City</Label><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                 <FormField control={form.control} name="state" render={({ field }) => ( <FormItem><Label>State</Label><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                  <FormField control={form.control} name="pincode" render={({ field }) => ( <FormItem><Label>Pincode</Label><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                             </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit">Save {type}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export function ItemDialog({ open, onOpenChange, item, stockGroups }: { open: boolean, onOpenChange: (open: boolean) => void, item?: Item | null, stockGroups?: {id: string, name: string}[] }) {
    const { toast } = useToast();
    const [user] = useAuthState(auth);
    const [isSuggestingHsn, setIsSuggestingHsn] = useState(false);

    const form = useForm<z.infer<typeof itemSchema>>({
        resolver: zodResolver(itemSchema),
        defaultValues: { name: "", description: "", hsn: "", gstRate: 0, stock: 0, purchasePrice: 0, sellingPrice: 0, stockGroupId: "" },
    });

    useEffect(() => {
      if (item && open) {
        form.reset(item);
      } else if (!open) {
        form.reset({ name: "", description: "", hsn: "", gstRate: 0, stock: 0, purchasePrice: 0, sellingPrice: 0, stockGroupId: "" });
      }
    }, [item, open, form]);

    const handleSuggestHsn = async (description: string) => {
        if (!description || description.trim().length < 3) {
            toast({ 
                variant: "destructive", 
                title: "Description Required", 
                description: "Please enter at least 3 characters to get HSN code suggestion." 
            });
            return;
        }

        setIsSuggestingHsn(true);
        try {
            const result = await suggestHsnCodeAction({
                productOrServiceDescription: description,
            });
            
            if (result?.hsnCode) {
                form.setValue("hsn", result.hsnCode);
                toast({ 
                    title: "HSN Code Suggested", 
                    description: `Suggested HSN code: ${result.hsnCode}` 
                });
            } else {
                toast({ 
                    variant: "destructive", 
                    title: "Suggestion Failed", 
                    description: "Could not get HSN code suggestion. Please try again." 
                });
            }
        } catch (error: any) {
            console.error("Error suggesting HSN code:", error);
            toast({ 
                variant: "destructive", 
                title: "Error", 
                description: error.message || "Failed to get HSN code suggestion. Please try again." 
            });
        } finally {
            setIsSuggestingHsn(false);
        }
    };

    const onSubmit = async (values: z.infer<typeof itemSchema>) => {
        if (!user) {
           toast({ variant: "destructive", title: "Not authenticated" });
           return;
       }
       try {
            if (item) {
                const itemDocRef = doc(db, "items", item.id);
                await updateDoc(itemDocRef, values);
                toast({ title: "Item Updated", description: `${values.name} has been updated.` });
            } else {
                await addDoc(collection(db, 'items'), { ...values, userId: user.uid });
                toast({ title: "Item Added", description: `${values.name} has been added.` });
            }
           onOpenChange(false);
       } catch (e) {
           console.error("Error adding document: ", e);
           toast({ variant: "destructive", title: "Error", description: "Could not save the item." });
       }
    };

    const dialogTitle = item ? "Edit Item" : "Add New Item";
    const dialogDescription = item ? `Update the details for ${item.name}` : "Add a new product or service to your master list.";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[525px]">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <DialogHeader>
                            <DialogTitle>{dialogTitle}</DialogTitle>
                            <DialogDescription>{dialogDescription}</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <FormField 
                                control={form.control} 
                                name="name" 
                                render={({ field }) => (
                                    <FormItem>
                                        <Label>Item Name</Label>
                                        <div className="flex gap-2">
                                            <FormControl>
                                                <Input 
                                                    placeholder="e.g. Wireless Keyboard" 
                                                    {...field} 
                                                />
                                            </FormControl>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                onClick={() => {
                                                    const itemName = form.watch("name");
                                                    const description = form.watch("description") || itemName;
                                                    handleSuggestHsn(description || itemName);
                                                }}
                                                disabled={isSuggestingHsn || !form.watch("name")?.trim()}
                                                title="Suggest HSN Code from Item Name"
                                            >
                                                {isSuggestingHsn ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Wand2 className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><Label>Description</Label><FormControl><Textarea placeholder="A short description of the item" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                             <div className="grid grid-cols-2 gap-4">
                                <FormField 
                                    control={form.control} 
                                    name="hsn" 
                                    render={({ field }) => (
                                        <FormItem>
                                            <Label>HSN/SAC Code</Label>
                                            <div className="flex gap-2">
                                                <FormControl>
                                                    <Input placeholder="e.g. 8471" {...field} />
                                                </FormControl>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => {
                                                        const description = form.watch("description") || form.watch("name");
                                                        if (description) {
                                                            handleSuggestHsn(description);
                                                        }
                                                    }}
                                                    disabled={isSuggestingHsn || (!form.watch("name")?.trim() && !form.watch("description")?.trim())}
                                                    title="Suggest HSN Code using AI"
                                                >
                                                    {isSuggestingHsn ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Wand2 className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField control={form.control} name="gstRate" render={({ field }) => ( <FormItem><Label>GST Rate (%)</Label><FormControl><Input type="number" placeholder="e.g. 18" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField control={form.control} name="stockGroupId" render={({ field }) => ( <FormItem><Label>Stock Group</Label>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a group" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {(stockGroups || []).map(group => <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage /></FormItem> )}/>
                             </div>
                            <FormField control={form.control} name="stock" render={({ field }) => ( <FormItem><Label>Opening Stock</Label><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="purchasePrice" render={({ field }) => ( <FormItem><Label>Purchase Price (₹)</Label><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField control={form.control} name="sellingPrice" render={({ field }) => ( <FormItem><Label>Selling Price (₹)</Label><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit">Save Item</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

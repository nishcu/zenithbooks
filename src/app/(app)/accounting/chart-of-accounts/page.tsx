
"use client";

import { useState, useMemo } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, Loader2, Info } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, query, where, orderBy } from "firebase/firestore";
import { useCollection } from 'react-firebase-hooks/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { allAccounts } from "@/lib/accounts";

const accountTypes = {
    assets: ["Bank", "Cash", "Current Asset", "Fixed Asset", "Inventory", "Investment"],
    liabilities: ["Current Liability", "Long Term Liability"],
    equity: ["Equity"],
    revenue: ["Revenue", "Other Income"],
    expenses: ["Expense", "Cost of Goods Sold", "Depreciation"],
};

const accountCodeRanges = {
    "Fixed Asset": { start: 1000, end: 1199 },
    "Investment": { start: 1200, end: 1299 },
    "Current Asset": { start: 1300, end: 1499 },
    "Cash": { start: 1500, end: 1519 },
    "Bank": { start: 1520, end: 1599 },
    "Equity": { start: 2000, end: 2199 },
    "Long Term Liability": { start: 2200, end: 2399 },
    "Current Liability": { start: 2400, end: 2999 },
    "Revenue": { start: 4000, end: 4499 },
    "Other Income": { start: 4500, end: 4999 },
    "Cost of Goods Sold": { start: 5000, end: 5499 },
    "Expense": { start: 6000, end: 6999 },
    "Depreciation": { start: 6100, end: 6100 }, // Special case
};

const accountSchema = z.object({
    name: z.string().min(3, "Account name is required."),
    code: z.string().regex(/^\d{4}$/, "Account code must be 4 digits."),
    type: z.string().min(1, "Account type is required."),
    purchaseDate: z.date().optional(),
    putToUseDate: z.date().optional(),
    depreciationRate: z.number().optional(),
    openingWdv: z.number().optional(),
}).refine(data => {
    if (data.type === 'Fixed Asset') {
        return !!data.purchaseDate && !!data.putToUseDate && data.depreciationRate !== undefined && data.openingWdv !== undefined;
    }
    return true;
}, {
    message: "For Fixed Assets, all detail fields are required.",
    path: ["purchaseDate"],
});

export default function ChartOfAccountsPage() {
  const [user] = useAuthState(auth);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();
  
  // Custom accounts added by the user
  const userAccountsRef = collection(db, "user_accounts");
  const userAccountsQuery = user ? query(userAccountsRef, where("userId", "==", user.uid), orderBy("code")) : null;
  const [userAccountsSnapshot, loading, error] = useCollection(userAccountsQuery);
  
  const userAccounts = userAccountsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [];
  
  const combinedAccounts = useMemo(() => {
    return [...allAccounts, ...userAccounts].sort((a,b) => a.code.localeCompare(b.code));
  }, [userAccounts]);

  const form = useForm<z.infer<typeof accountSchema>>({
    resolver: zodResolver(accountSchema),
    defaultValues: { name: "", code: "", type: "", openingWdv: 0.00 }
  });
  
  const selectedAccountType = form.watch("type");

  const getNextAvailableCode = (type: string) => {
    const range = accountCodeRanges[type as keyof typeof accountCodeRanges];
    if (!range) return "";
    
    const existingCodes = combinedAccounts.filter(acc => acc.type === type).map(acc => parseInt(acc.code));
    
    for (let i = range.start; i <= range.end; i++) {
        if (!existingCodes.includes(i)) {
            return String(i).padStart(4, '0');
        }
    }
    return ""; // No available code in range
  };
  
  const handleTypeChange = (type: string) => {
    form.setValue("type", type);
    const nextCode = getNextAvailableCode(type);
    form.setValue("code", nextCode);
  };

  const onSubmit = async (values: z.infer<typeof accountSchema>) => {
    if (!user) {
        toast({ variant: "destructive", title: "Not Authenticated" });
        return;
    }

    const newAccount: any = { ...values, userId: user.uid };

    try {
        await addDoc(userAccountsRef, newAccount);
        toast({ title: "Account Added", description: `${values.name} has been added.` });
        form.reset();
        setIsAddDialogOpen(false);
    } catch (e) {
        console.error("Error adding document: ", e);
        toast({ variant: "destructive", title: "Error", description: "Could not save the account."})
    }
  };

  const renderAccountCategory = (title: string, types: string[]) => {
    const categoryAccounts = combinedAccounts.filter(acc => types.includes(acc.type));
    if (categoryAccounts.length === 0) return null;
    
    return (
        <div key={title} className="mb-4">
            <h3 className="font-semibold text-xl mb-2">{title}</h3>
            <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[20%]">Code</TableHead>
                        <TableHead className="w-[50%]">Account Name</TableHead>
                        <TableHead className="w-[30%]">Type</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {categoryAccounts.map((account) => (
                        <TableRow key={account.code}>
                            <TableCell className="font-mono">{account.code}</TableCell>
                            <TableCell className="font-medium">{account.name}</TableCell>
                            <TableCell className="text-muted-foreground">{account.type}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            </div>
        </div>
    );
  };


  return (
    <div className="space-y-8">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold">Chart of Accounts</h1>
                <p className="text-muted-foreground">
                    A complete list of your company's financial accounts.
                </p>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <PlusCircle className="mr-2"/>
                        Add Custom Account
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <DialogHeader>
                        <DialogTitle>Add New Custom Account</DialogTitle>
                        <DialogDescription>
                            Use this for accounts not covered in the standard list.
                        </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                             <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Account Name</FormLabel><FormControl><Input placeholder="e.g. Special Project Revenue" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Account Type</FormLabel>
                                    <Select onValueChange={handleTypeChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {Object.entries(accountTypes).map(([group, types]) => (
                                                <div key={group}>
                                                     <Separator className="my-2"/>
                                                     <p className="px-2 py-1.5 text-sm font-semibold capitalize">{group}</p>
                                                    {types.map(type => (
                                                        <SelectItem key={type} value={type}>{type}</SelectItem>
                                                    ))}
                                                </div>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                <FormMessage /></FormItem> )}/>
                                 <FormField control={form.control} name="code" render={({ field }) => ( <FormItem><FormLabel>Account Code (Auto)</FormLabel><FormControl><Input placeholder="Auto-generated" {...field} readOnly /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit">Save Account</Button>
                        </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
            </Dialog>
        </div>
      
      <Card>
          <CardHeader>
              <CardTitle>Accounts</CardTitle>
              <CardDescription>Browse all accounts, organized by category.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="animate-spin" /> : (
                <div className="space-y-8">
                  {renderAccountCategory("Assets", accountTypes.assets)}
                  {renderAccountCategory("Liabilities", accountTypes.liabilities)}
                  {renderAccountCategory("Equity", accountTypes.equity)}
                  {renderAccountCategory("Revenue", accountTypes.revenue)}
                  {renderAccountCategory("Expenses", accountTypes.expenses)}
                </div>
            )}
          </CardContent>
      </Card>
    </div>
  );
}

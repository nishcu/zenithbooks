
"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Save,
} from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, doc, getDoc, updateDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { useCollection } from 'react-firebase-hooks/firestore';
import { useAuthState } from "react-firebase-hooks/auth";
import { PartyDialog, ItemDialog } from "@/components/billing/add-new-dialogs";
import { ItemTable, type LineItem, type Item } from "@/components/billing/item-table";

const createNewLineItem = (): LineItem => ({
  id: `${Date.now()}-${Math.random()}`,
  itemId: "", description: "", hsn: "", qty: 1, rate: 0, taxRate: 18, amount: 0,
});

export default function NewSalesOrderPage() {
  const { toast } = useToast();
  const [user] = useAuthState(auth);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [editId, setEditId] = useState<string | null>(null);

  const [orderDate, setOrderDate] = useState<Date | undefined>(new Date());
  const [expiryDate, setExpiryDate] = useState<Date | undefined>();
  const [customer, setCustomer] = useState("");

  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);

  const [lineItems, setLineItems] = useState<LineItem[]>([createNewLineItem()]);

  const customersQuery = user ? query(collection(db, 'customers'), where("userId", "==", user.uid)) : null;
  const [customersSnapshot, customersLoading] = useCollection(customersQuery);
  const customers = useMemo(() => customersSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [], [customersSnapshot]);

  const itemsQuery = user ? query(collection(db, 'items'), where("userId", "==", user.uid)) : null;
  const [itemsSnapshot, itemsLoading] = useCollection(itemsQuery);
  const items: Item[] = useMemo(() => itemsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as Item)) || [], [itemsSnapshot]);

  useEffect(() => {
    const editParam = searchParams.get("edit");
    if (editParam && user) {
        setEditId(editParam);
        const fetchOrder = async () => {
            const orderDoc = await getDoc(doc(db, "sales-orders", editParam));
            if (orderDoc.exists()) {
                const orderData = orderDoc.data();
                setCustomer(orderData.customerId);
                setOrderDate(orderData.orderDate.toDate());
                if (orderData.expiryDate) {
                    setExpiryDate(orderData.expiryDate.toDate());
                }
                setLineItems(orderData.lineItems);
            } else {
                toast({ variant: "destructive", title: "Error", description: "Sales order not found." });
                router.push("/billing/sales-orders");
            }
        };
        fetchOrder();
    }
}, [searchParams, user, toast, router]);

  const handleCustomerChange = useCallback((value: string) => {
    if (value === 'add-new') {
      setIsCustomerDialogOpen(true);
    } else {
      setCustomer(value);
    }
  }, []);

  const subtotal = lineItems.reduce((acc, item) => acc + (item.qty * item.rate), 0);
  const totalTax = lineItems.reduce((acc, item) => acc + (item.qty * item.rate * item.taxRate / 100), 0);
  const totalAmount = subtotal + totalTax;

  const handleSave = async () => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to save.", variant: "destructive" });
      return;
    }
    if (!customer) {
      toast({ title: "Error", description: "Please select a customer.", variant: "destructive" });
      return;
    }
    if (!orderDate) {
      toast({ title: "Error", description: "Please select an order date.", variant: "destructive" });
      return;
    }
    if (lineItems.some(item => !item.itemId || item.qty <= 0 || item.rate < 0)) {
      toast({ title: "Error", description: "Please ensure all line items are valid.", variant: "destructive" });
      return;
    }

    const orderData = {
        userId: user.uid,
        customerId: customer,
        orderDate: orderDate,
        expiryDate: expiryDate || null,
        lineItems: lineItems,
        subtotal: subtotal,
        totalTax: totalTax,
        totalAmount: totalAmount,
        status: "Draft",
    };

    try {
        if (editId) {
            const orderRef = doc(db, "sales-orders", editId);
            await updateDoc(orderRef, {
                ...orderData,
                updatedAt: serverTimestamp(),
            });
            toast({
                title: "Sales Order Updated",
                description: `Sales order ${editId} has been updated successfully.`,
            });
        } else {
            const newId = await runTransaction(db, async (transaction) => {
                const counterRef = doc(db, "counters", "sales-orders");
                const counterDoc = await transaction.get(counterRef);
                const newCount = (counterDoc.data()?.count || 0) + 1;
                const newId = `SO-${String(newCount).padStart(4, '0')}`;

                const newOrderRef = doc(db, "sales-orders", newId);
                transaction.set(counterRef, { count: newCount });
                transaction.set(newOrderRef, {
                     ...orderData,
                    createdAt: serverTimestamp(),
                });

                return newId;
            });

            toast({
                title: "Sales Order Saved",
                description: `Sales order saved with ID: ${newId}`,
            });
        }
        setEditId(null);
        setCustomer("");
        setOrderDate(new Date());
        setExpiryDate(undefined);
        setLineItems([createNewLineItem()]);
        router.push("/billing/sales-orders");

    } catch (error) {
      console.error("Error saving document: ", error);
      toast({
        title: "Error Saving",
        description: "There was an error saving the sales order.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/billing/sales-orders" passHref>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{editId ? "Edit Sales Order" : "New Sales Order"}</h1>
      </div>

      <PartyDialog type="Customer" open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen} />
      <ItemDialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen} item={null} />

      <Card>
        <CardHeader>
          <CardTitle>{editId ? "Edit Sales Order" : "Sales Order Details"}</CardTitle>
          <CardDescription>
          {editId ? `Editing sales order ${editId}.` : "Fill out the details for the new sales order."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
             <div className="space-y-2 md:col-span-1">
              <Label>Customer</Label>
               <Select onValueChange={handleCustomerChange} value={customer} disabled={customersLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={customersLoading ? "Loading..." : "Select a customer"} />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                  <Separator />
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Order Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !orderDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {orderDate ? format(orderDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={orderDate} onSelect={setOrderDate} initialFocus /></PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !expiryDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expiryDate ? format(expiryDate, "PPP") : <span>Pick an expiry date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={expiryDate} onSelect={setExpiryDate} initialFocus /></PopoverContent>
              </Popover>
            </div>
          </div>
          
          <Separator />

          <div className="space-y-2">
            <h3 className="text-lg font-medium">Items</h3>
            <ItemTable 
              lineItems={lineItems}
              setLineItems={setLineItems}
              items={items}
              itemsLoading={itemsLoading}
              isPurchase={false}
              openItemDialog={() => setIsItemDialogOpen(true)}
            />
          </div>

          <div className="flex justify-end">
            <div className="w-full max-w-sm space-y-4">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total Tax</span><span>₹{totalTax.toFixed(2)}</span></div>
              <Separator/>
              <div className="flex justify-between font-bold text-lg"><span>Total Amount</span><span>₹{totalAmount.toFixed(2)}</span></div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleSave}>
            <Save className="mr-2" />
            {editId ? "Update Sales Order" : "Save Sales Order"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

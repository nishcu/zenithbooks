
"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  PlusCircle,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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

export default function NewPurchaseOrderPage() {
  const { toast } = useToast();
  const [user] = useAuthState(auth);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [editId, setEditId] = useState<string | null>(null);

  const [orderDate, setOrderDate] = useState<Date | undefined>(new Date());
  const [supplier, setSupplier] = useState("");

  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);

  const [lineItems, setLineItems] = useState<LineItem[]>([createNewLineItem()]);

  const suppliersQuery = user ? query(collection(db, 'suppliers'), where("userId", "==", user.uid)) : null;
  const [suppliersSnapshot, suppliersLoading] = useCollection(suppliersQuery);
  const suppliers = useMemo(() => suppliersSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [], [suppliersSnapshot]);

  const itemsQuery = user ? query(collection(db, 'items'), where("userId", "==", user.uid)) : null;
  const [itemsSnapshot, itemsLoading] = useCollection(itemsQuery);
  const items: Item[] = useMemo(() => itemsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as Item)) || [], [itemsSnapshot]);

  useEffect(() => {
    const editParam = searchParams.get("edit");
    if (editParam && user) {
        setEditId(editParam);
        const fetchOrder = async () => {
            const orderDoc = await getDoc(doc(db, "purchase-orders", editParam));
            if (orderDoc.exists()) {
                const orderData = orderDoc.data();
                setSupplier(orderData.supplierId);
                setOrderDate(orderData.orderDate.toDate());
                setLineItems(orderData.lineItems);
            } else {
                toast({ variant: "destructive", title: "Error", description: "Purchase order not found." });
                router.push("/purchases/purchase-orders");
            }
        };
        fetchOrder();
    }
}, [searchParams, user, toast, router]);

  const handleSupplierChange = useCallback((value: string) => {
    if (value === 'add-new') {
      setIsSupplierDialogOpen(true);
    } else {
      setSupplier(value);
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
    if (!supplier) {
      toast({ title: "Error", description: "Please select a supplier.", variant: "destructive" });
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
        supplierId: supplier,
        orderDate: orderDate,
        lineItems: lineItems,
        subtotal: subtotal,
        totalTax: totalTax,
        totalAmount: totalAmount,
        status: "Draft",
    };

    try {
        if (editId) {
            const orderRef = doc(db, "purchase-orders", editId);
            await updateDoc(orderRef, {
                ...orderData,
                updatedAt: serverTimestamp(),
            });
            toast({
                title: "Purchase Order Updated",
                description: `Purchase order ${editId} has been updated successfully.`,
            });
        } else {
            const newId = await runTransaction(db, async (transaction) => {
                const counterRef = doc(db, "counters", "purchase-orders");
                const counterDoc = await transaction.get(counterRef);
                const newCount = (counterDoc.data()?.count || 0) + 1;
                const newId = `PO-${String(newCount).padStart(4, '0')}`;

                const newOrderRef = doc(db, "purchase-orders", newId);
                transaction.set(counterRef, { count: newCount });
                transaction.set(newOrderRef, {
                     ...orderData,
                    createdAt: serverTimestamp(),
                });

                return newId;
            });

            toast({
                title: "Purchase Order Saved",
                description: `Purchase order saved with ID: ${newId}`,
            });
        }
        setEditId(null);
        setSupplier("");
        setOrderDate(new Date());
        setLineItems([createNewLineItem()]);
        router.push("/purchases/purchase-orders");

    } catch (error) {
      console.error("Error saving document: ", error);
      toast({
        title: "Error Saving",
        description: "There was an error saving the purchase order.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/purchases/purchase-orders" passHref>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{editId ? "Edit Purchase Order" : "New Purchase Order"}</h1>
      </div>

      <PartyDialog type="Supplier" open={isSupplierDialogOpen} onOpenChange={setIsSupplierDialogOpen} />
      <ItemDialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen} item={null} />

      <Card>
        <CardHeader>
          <CardTitle>{editId ? "Edit Purchase Order" : "Purchase Order Details"}</CardTitle>
          <CardDescription>
          {editId ? `Editing purchase order ${editId}.` : "Fill out the details for the new purchase order."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
             <div className="space-y-2 md:col-span-1">
              <Label>Supplier</Label>
               <Select onValueChange={handleSupplierChange} value={supplier} disabled={suppliersLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={suppliersLoading ? "Loading..." : "Select a supplier"} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                  <Separator />
                   <SelectItem value="add-new" className="text-primary focus:text-primary">
                    <div className="flex items-center gap-2">
                        <PlusCircle className="h-4 w-4" /> Add New Supplier
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Order Date</Label>
              <Input
                type="date"
                value={orderDate ? format(orderDate, "yyyy-MM-dd") : ""}
                onChange={(e) => setOrderDate(e.target.value ? new Date(e.target.value) : undefined)}
              />
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
            {editId ? "Update Purchase Order" : "Save Purchase Order"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

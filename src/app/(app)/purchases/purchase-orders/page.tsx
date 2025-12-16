
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, MoreHorizontal, FileText, Edit, Trash2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { db, auth } from "@/lib/firebase";
import { collection, query, where, doc, deleteDoc } from "firebase/firestore";
import { useCollection } from 'react-firebase-hooks/firestore';
import { useAuthState } from "react-firebase-hooks/auth";

type PurchaseOrder = {
  id: string;
  supplierId: string;
  orderDate: {
    seconds: number;
    nanoseconds: number;
  };
  totalAmount: number;
  status: string;
};

function PurchaseOrderPreview({ order, suppliers }: { order: PurchaseOrder | null, suppliers: any[] }) {
    if (!order) return null;

    const supplier = suppliers.find(s => s.id === order.supplierId);

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold">Purchase Order</h2>
                    <p className="text-muted-foreground">Order ID: {order.id}</p>
                </div>
                <div className="text-right">
                    <p className="font-bold">{supplier?.name}</p>
                    <p>{supplier?.address}</p>
                    <p>{supplier?.email}</p>
                </div>
            </div>
            <div className="flex justify-between mb-6">
                <div>
                    <p><span className="font-semibold">Order Date:</span> {format(new Date(order.orderDate.seconds * 1000), "dd MMM, yyyy")}</p>
                </div>
                <div className="text-right">
                    <p><span className="font-semibold">Status:</span> {order.status}</p>
                </div>
            </div>
            {/* You can add a table for line items here */}
            <div className="text-right mt-6">
                <p className="text-2xl font-bold">Total: ₹{order.totalAmount.toFixed(2)}</p>
            </div>
        </div>
    );
}


export default function PurchaseOrdersPage() {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);

  const purchaseOrdersQuery = user ? query(collection(db, 'purchase-orders'), where("userId", "==", user.uid)) : null;
  const [purchaseOrdersSnapshot, purchaseOrdersLoading] = useCollection(purchaseOrdersQuery);
  const purchaseOrders = useMemo(() => purchaseOrdersSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseOrder)) || [], [purchaseOrdersSnapshot]);

  const suppliersQuery = user ? query(collection(db, 'suppliers'), where("userId", "==", user.uid)) : null;
  const [suppliersSnapshot, suppliersLoading] = useCollection(suppliersQuery);
  const suppliers = useMemo(() => suppliersSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [], [suppliersSnapshot]);

  const handleAction = async (action: string, order: PurchaseOrder) => {
    if (action === 'View') {
      setSelectedOrder(order);
    } else if (action === 'Cancel') {
      try {
        await deleteDoc(doc(db, "purchase-orders", order.id));
        toast({ title: "Purchase Order Cancelled", description: `Purchase order ${order.id} has been successfully cancelled.` });
      } catch (error) {
        toast({ variant: "destructive", title: "Cancellation Failed", description: "There was an error cancelling the purchase order." });
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "sent":
        return <Badge className="bg-blue-600 hover:bg-blue-700">Sent</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredPurchaseOrders = useMemo(() => {
    if (!searchTerm) return purchaseOrders;
    return purchaseOrders.filter(order =>
        (suppliers.find(s => s.id === order.supplierId)?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [purchaseOrders, searchTerm, suppliers]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Purchase Orders</h1>
          <p className="text-muted-foreground">
            Create and manage your purchase orders.
          </p>
        </div>
        <div className="flex gap-2">
            <Link href="/purchases/purchase-orders/new" passHref>
            <Button>
                <PlusCircle className="mr-2"/>
                Create Purchase Order
            </Button>
            </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Order List</CardTitle>
          <CardDescription>
            Here is a list of your most recent purchase orders.
          </CardDescription>
           <div className="relative pt-4">
                <Search className="absolute left-2.5 top-6 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by Order # or Supplier..."
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
                    <TableHead>Order #</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {purchaseOrdersLoading || suppliersLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center">Loading...</TableCell></TableRow>
                ) : filteredPurchaseOrders.map((order) => (
                    <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell>{suppliers.find(s => s.id === order.supplierId)?.name || 'N/A'}</TableCell>
                    <TableCell>{format(new Date(order.orderDate.seconds * 1000), "dd MMM, yyyy")}</TableCell>
                    <TableCell className="text-center">{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-right">₹{order.totalAmount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => handleAction('View', order)}>
                              <FileText className="mr-2" /> View Order
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => {
                                const queryParams = new URLSearchParams({
                                    edit: order.id
                                }).toString();
                                window.location.href = `/purchases/purchase-orders/new?${queryParams}`;
                            }}>
                              <Edit className="mr-2" /> Edit Order
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onSelect={() => handleAction('Cancel', order)}>
                              <Trash2 className="mr-2" /> Cancel Order
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
      
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Purchase Order Preview: {selectedOrder?.id}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
            {selectedOrder && (
              <PurchaseOrderPreview
                order={selectedOrder}
                suppliers={suppliers}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

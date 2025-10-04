
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

type SalesOrder = {
  id: string;
  customerId: string;
  orderDate: {
    seconds: number;
    nanoseconds: number;
  };
  expiryDate?: {
    seconds: number;
    nanoseconds: number;
  };
  totalAmount: number;
  status: string;
};

function SalesOrderPreview({ order, customers }: { order: SalesOrder | null, customers: any[] }) {
    if (!order) return null;

    const customer = customers.find(c => c.id === order.customerId);

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold">Sales Order</h2>
                    <p className="text-muted-foreground">Order ID: {order.id}</p>
                </div>
                <div className="text-right">
                    <p className="font-bold">{customer?.name}</p>
                    <p>{customer?.address}</p>
                    <p>{customer?.email}</p>
                </div>
            </div>
            <div className="flex justify-between mb-6">
                <div>
                    <p><span className="font-semibold">Order Date:</span> {format(new Date(order.orderDate.seconds * 1000), "dd MMM, yyyy")}</p>
                    {order.expiryDate && <p><span className="font-semibold">Expiry Date:</span> {format(new Date(order.expiryDate.seconds * 1000), "dd MMM, yyyy")}</p>}
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


export default function SalesOrdersPage() {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);

  const salesOrdersQuery = user ? query(collection(db, 'sales-orders'), where("userId", "==", user.uid)) : null;
  const [salesOrdersSnapshot, salesOrdersLoading] = useCollection(salesOrdersQuery);
  const salesOrders = useMemo(() => salesOrdersSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalesOrder)) || [], [salesOrdersSnapshot]);

  const customersQuery = user ? query(collection(db, 'customers'), where("userId", "==", user.uid)) : null;
  const [customersSnapshot, customersLoading] = useCollection(customersQuery);
  const customers = useMemo(() => customersSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [], [customersSnapshot]);

  const handleAction = async (action: string, order: SalesOrder) => {
    if (action === 'View') {
      setSelectedOrder(order);
    } else if (action === 'Cancel') {
      try {
        await deleteDoc(doc(db, "sales-orders", order.id));
        toast({ title: "Sales Order Cancelled", description: `Sales order ${order.id} has been successfully cancelled.` });
      } catch (error) {
        toast({ variant: "destructive", title: "Cancellation Failed", description: "There was an error cancelling the sales order." });
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "confirmed":
        return <Badge className="bg-blue-600 hover:bg-blue-700">Confirmed</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredSalesOrders = useMemo(() => {
    if (!searchTerm) return salesOrders;
    return salesOrders.filter(order =>
        (customers.find(c => c.id === order.customerId)?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [salesOrders, searchTerm, customers]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Sales Orders</h1>
          <p className="text-muted-foreground">
            Create and manage your sales orders.
          </p>
        </div>
        <div className="flex gap-2">
            <Link href="/billing/sales-orders/new" passHref>
            <Button>
                <PlusCircle className="mr-2"/>
                Create Sales Order
            </Button>
            </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales Order List</CardTitle>
          <CardDescription>
            Here is a list of your most recent sales orders.
          </CardDescription>
           <div className="relative pt-4">
                <Search className="absolute left-2.5 top-6 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by Order # or Customer..."
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
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {salesOrdersLoading || customersLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center">Loading...</TableCell></TableRow>
                ) : filteredSalesOrders.map((order) => (
                    <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell>{customers.find(c => c.id === order.customerId)?.name || 'N/A'}</TableCell>
                    <TableCell>{format(new Date(order.orderDate.seconds * 1000), "dd MMM, yyyy")}</TableCell>
                    <TableCell>{order.expiryDate ? format(new Date(order.expiryDate.seconds * 1000), "dd MMM, yyyy") : 'N/A'}</TableCell>
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
                                window.location.href = `/billing/sales-orders/new?${queryParams}`;
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
            <DialogTitle>Sales Order Preview: {selectedOrder?.id}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
            {selectedOrder && (
              <SalesOrderPreview
                order={selectedOrder}
                customers={customers}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

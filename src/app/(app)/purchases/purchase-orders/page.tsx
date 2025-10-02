
"use client";

import { useState } from "react";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, MoreHorizontal, FileText, CheckCircle, Package, Edit, Trash2, ArrowRight } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { format } from "date-fns";

const samplePurchaseOrders = [
    { id: "PO-001", vendor: "Reliable Supplies Inc.", date: "2024-07-05", amount: 50000, status: "Open" },
    { id: "PO-002", vendor: "Tech Components Ltd.", date: "2024-07-02", amount: 125000, status: "Billed" },
    { id: "PO-003", vendor: "Office Essentials", date: "2024-06-28", amount: 25000, status: "Closed" },
];

export default function PurchaseOrdersPage() {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Open":
        return <Badge variant="secondary">{status}</Badge>;
      case "Billed":
        return <Badge className="bg-blue-500 text-white">{status}</Badge>;
      case "Closed":
        return <Badge className="bg-green-600">{status}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Purchase Orders</h1>
          <p className="text-muted-foreground">
            Create and track your orders with vendors.
          </p>
        </div>
        <Link href="/purchases/purchase-orders/new" passHref>
          <Button>
              <PlusCircle className="mr-2"/>
              New Purchase Order
          </Button>
        </Link>
      </div>

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Open POs" value="1" icon={Package} description="₹50,000.00" />
        <StatCard title="Received & Billed" value="1" icon={FileText} description="₹1,25,000.00" />
        <StatCard title="Closed POs (30d)" value="8" icon={CheckCircle} description="Total orders closed recently" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Order List</CardTitle>
          <CardDescription>
            A list of your most recent purchase orders.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {samplePurchaseOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.id}</TableCell>
                  <TableCell>{order.vendor}</TableCell>
                  <TableCell>{format(new Date(order.date), "dd MMM, yyyy")}</TableCell>
                  <TableCell className="text-center">{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="text-right">₹{order.amount.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><FileText className="mr-2"/> View Order</DropdownMenuItem>
                        <DropdownMenuItem><Edit className="mr-2"/> Edit Order</DropdownMenuItem>
                        <DropdownMenuItem><ArrowRight className="mr-2"/> Convert to Bill</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2"/> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}


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

const sampleSalesOrders = [
    { id: "SO-001", customer: "Innovate LLC", date: "2024-07-01", amount: 150000, status: "Open" },
    { id: "SO-002", customer: "Quantum Services", date: "2024-06-28", amount: 75000, status: "Invoiced" },
    { id: "SO-003", customer: "Synergy Corp", date: "2024-06-25", amount: 225000, status: "Closed" },
];

export default function SalesOrdersPage() {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Open":
        return <Badge variant="secondary">{status}</Badge>;
      case "Invoiced":
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
          <h1 className="text-3xl font-bold">Sales Orders</h1>
          <p className="text-muted-foreground">
            Create, manage, and track your customer sales orders.
          </p>
        </div>
        <Link href="/billing/sales-orders/new" passHref>
          <Button>
              <PlusCircle className="mr-2"/>
              New Sales Order
          </Button>
        </Link>
      </div>

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Open Orders" value="1" icon={Package} description="₹1,50,000.00" />
        <StatCard title="Invoiced Orders" value="1" icon={FileText} description="₹75,000.00" />
        <StatCard title="Fulfilled (30d)" value="5" icon={CheckCircle} description="Total orders closed recently" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales Order List</CardTitle>
          <CardDescription>
            A list of your most recent sales orders.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleSalesOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.id}</TableCell>
                  <TableCell>{order.customer}</TableCell>
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
                        <DropdownMenuItem><ArrowRight className="mr-2"/> Convert to Invoice</DropdownMenuItem>
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

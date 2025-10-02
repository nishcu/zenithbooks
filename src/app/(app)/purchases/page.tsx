
"use client";

import { useState, useMemo, useContext } from "react";
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
import { Badge } from "@/components/ui/badge";
import { PlusCircle, MoreHorizontal, FileText, IndianRupee, AlertCircle, CheckCircle, Edit, Copy, Trash2, Search, Zap } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format, isPast, subDays } from 'date-fns';
import { AccountingContext, type JournalVoucher } from "@/context/accounting-context";
import { db, auth } from "@/lib/firebase";
import { collection, query, where } from "firebase/firestore";
import { useCollection } from 'react-firebase-hooks/firestore';
import { useAuthState } from "react-firebase-hooks/auth";

type Bill = {
  id: string;
  vendor: string;
  date: string;
  amount: number;
  status: string;
  raw: JournalVoucher;
}

export default function PurchasesPage() {
  const { journalVouchers, loading: journalLoading, addJournalVoucher } = useContext(AccountingContext)!;
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  const vendorsQuery = user ? query(collection(db, 'vendors'), where("userId", "==", user.uid)) : null;
  const [vendorsSnapshot, vendorsLoading] = useCollection(vendorsQuery);
  const vendors = useMemo(() => vendorsSnapshot?.docs.map(doc => ({ id: doc.id, name: doc.data().name })) || [], [vendorsSnapshot]);

  const purchaseBills: Bill[] = useMemo(() => {
    const allBills = journalVouchers.filter(v => v && v.id && v.id.startsWith("BILL-") && !v.reverses);
    const cancelledBillIds = new Set(
        journalVouchers
            .filter(v => v && v.reverses && v.reverses.startsWith("BILL-"))
            .map(v => v.reverses)
    );
    
    return allBills.map(v => {
        if (!v || !v.id) return null;
        const isCancelled = cancelledBillIds.has(v.id);
        const vendorName = vendors.find(vnd => vnd.id === v.vendorId)?.name || 'N/A';
        
        return {
            id: v.id,
            vendor: vendorName,
            date: v.date,
            amount: v.amount,
            status: isCancelled ? "Cancelled" : "Pending",
            raw: v,
        }
    }).filter((v): v is Bill => v !== null);
  }, [journalVouchers, vendors]);

  const handleCancelBill = async (billId: string) => {
    const originalVoucher = journalVouchers.find(v => v.id === billId);
    if (!originalVoucher) return;

    const reversalLines = originalVoucher.lines.map(line => ({
        account: line.account,
        debit: line.credit,
        credit: line.debit,
    }));

    const cancellationVoucher = {
        id: `CANCEL-${billId}-${Date.now()}`,
        reverses: billId,
        date: new Date().toISOString().split('T')[0],
        narration: `Cancellation of Bill #${billId}`,
        lines: reversalLines,
        amount: originalVoucher.amount,
        vendorId: originalVoucher.vendorId,
    };
    await addJournalVoucher(cancellationVoucher as any);
    toast({ title: "Bill Cancelled", description: `Purchase bill #${billId} has been cancelled.` });
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Paid": return <Badge className="bg-green-600 hover:bg-green-700">Paid</Badge>;
      case "Pending": return <Badge variant="secondary">Pending</Badge>;
      case "Cancelled": return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredBills = useMemo(() => {
    if (!searchTerm) return purchaseBills;
    return purchaseBills.filter(bill =>
        bill.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [purchaseBills, searchTerm]);

  const totalPayables = useMemo(() => purchaseBills.reduce((acc, bill) => bill.status === "Pending" ? acc + bill.amount : acc, 0), [purchaseBills]);
  const purchasesLast30Days = useMemo(() => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    return purchaseBills.reduce((acc, bill) => 
        new Date(bill.date) >= thirtyDaysAgo ? acc + bill.amount : acc, 
    0);
  }, [purchaseBills]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Purchases</h1>
          <p className="text-muted-foreground">
            Record and manage all your vendor bills.
          </p>
        </div>
        <div className="flex gap-2">
            <Link href="/purchases/rapid" passHref>
              <Button variant="outline">
                  <Zap className="mr-2"/>
                  Rapid Entry
              </Button>
            </Link>
            <Link href="/purchases/new" passHref>
            <Button>
                <PlusCircle className="mr-2"/>
                New Purchase Bill
            </Button>
            </Link>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard 
          title="Total Payables"
          value={`₹${totalPayables.toFixed(2)}`}
          icon={IndianRupee}
          description="Total amount owed to vendors"
          loading={journalLoading || vendorsLoading}
        />
        <StatCard 
          title="Purchases (Last 30 days)"
          value={`₹${purchasesLast30Days.toFixed(2)}`}
          icon={CheckCircle}
          description="Total value of bills recorded recently"
          loading={journalLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Bill List</CardTitle>
          <CardDescription>
            A list of all bills recorded from your vendors.
          </CardDescription>
           <div className="relative pt-4">
                <Search className="absolute left-2.5 top-6 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by Bill # or Vendor..."
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
                    <TableHead>Bill #</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredBills.map((bill) => (
                    <TableRow key={bill.id}>
                    <TableCell className="font-medium">{bill.id}</TableCell>
                    <TableCell>{bill.vendor}</TableCell>
                    <TableCell>{format(new Date(bill.date), "dd MMM, yyyy")}</TableCell>
                    <TableCell className="text-center">{getStatusBadge(bill.status)}</TableCell>
                    <TableCell className="text-right">₹{bill.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem><FileText className="mr-2" /> View Details</DropdownMenuItem>
                            <DropdownMenuItem><Edit className="mr-2" /> Edit</DropdownMenuItem>
                            <DropdownMenuItem><Copy className="mr-2" /> Duplicate</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => handleCancelBill(bill.id)} disabled={bill.status === 'Cancelled'}>
                              <Trash2 className="mr-2" /> Cancel Bill
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
    </div>
  );
}


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
import { PlusCircle, MoreHorizontal, FileText, Edit, Copy, Trash2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from 'date-fns';
import { AccountingContext } from "@/context/accounting-context";

export default function DebitNotesPage() {
  const { journalVouchers, loading } = useContext(AccountingContext)!;
  const [searchTerm, setSearchTerm] = useState("");

  const debitNotes = useMemo(() => {
    const allDebitNotes = journalVouchers.filter(v => v && v.id && v.id.startsWith("DN-") && !v.reverses);
    const cancelledNoteIds = new Set(
        journalVouchers
            .filter(v => v && v.reverses && v.reverses.startsWith("DN-"))
            .map(v => v.reverses)
    );
    
    return allDebitNotes.map(v => {
        if (!v || !v.id) return null;
        const isCancelled = cancelledNoteIds.has(v.id);
        
        return {
            id: v.id,
            vendor: v.narration.split(" to ")[1]?.split(" against")[0] || "N/A",
            originalPurchase: v.narration.split("against Bill #")[1]?.trim() || "N/A",
            date: v.date,
            amount: v.amount,
            status: isCancelled ? "Cancelled" : "Active",
            raw: v,
        }
    }).filter(Boolean);
  }, [journalVouchers]);

  const filteredDebitNotes = useMemo(() => {
    if (!searchTerm) return debitNotes;
    return debitNotes.filter(note =>
        note!.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note!.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note!.originalPurchase.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [debitNotes, searchTerm]);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return <Badge className="bg-green-600 hover:bg-green-700">Active</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Debit Notes</h1>
          <p className="text-muted-foreground">
            Manage purchase returns and bill adjustments.
          </p>
        </div>
        <Link href="/billing/debit-notes/new" passHref>
          <Button>
              <PlusCircle className="mr-2"/>
              Create Debit Note
          </Button>
        </Link>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Debit Note List</CardTitle>
          <CardDescription>
            A list of all debit notes issued to your vendors.
          </CardDescription>
           <div className="relative pt-4">
                <Search className="absolute left-2.5 top-6 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by Note # or Vendor..."
                  className="pl-8 w-full md:w-1/3"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Debit Note #</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Original Bill #</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDebitNotes.map((note) => (
                <TableRow key={note!.id}>
                  <TableCell className="font-medium">{note!.id}</TableCell>
                  <TableCell>{note!.vendor}</TableCell>
                  <TableCell>{format(new Date(note!.date), "dd MMM, yyyy")}</TableCell>
                  <TableCell>{note!.originalPurchase}</TableCell>
                  <TableCell>{getStatusBadge(note!.status)}</TableCell>
                  <TableCell className="text-right">₹{note!.amount.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><FileText className="mr-2"/> View</DropdownMenuItem>
                        <DropdownMenuItem><Edit className="mr-2"/> Edit</DropdownMenuItem>
                        <DropdownMenuItem><Copy className="mr-2"/> Duplicate</DropdownMenuItem>
                        <DropdownMenuSeparator/>
                        <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2"/> Cancel</DropdownMenuItem>
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

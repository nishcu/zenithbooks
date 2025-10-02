
"use client";

import { useMemo, useContext } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AccountingContext } from "@/context/accounting-context";
import { db, auth } from "@/lib/firebase";
import { collection, query, where } from "firebase/firestore";
import { useCollection } from 'react-firebase-hooks/firestore';
import { useAuthState } from "react-firebase-hooks/auth";
import { formatCurrency } from "@/lib/utils";
import { format, parseISO } from "date-fns";

export default function PurchaseAnalysis() {
  const { journalVouchers, loading } = useContext(AccountingContext)!;
  const [user] = useAuthState(auth);

  const vendorsQuery = user ? query(collection(db, 'vendors'), where("userId", "==", user.uid)) : null;
  const [vendorsSnapshot] = useCollection(vendorsQuery);
  const vendors = useMemo(() => vendorsSnapshot?.docs.map(doc => ({ id: doc.id, name: doc.data().name })) || [], [vendorsSnapshot]);

  const analysisData = useMemo(() => {
    const purchaseBills = journalVouchers.filter(v => v && v.id && v.id.startsWith("BILL-"));
    
    // Monthly Analysis
    const monthlyData: { [key: string]: { month: string, amount: number } } = {};
    purchaseBills.forEach(v => {
      const month = format(parseISO(v.date), 'MMM yyyy');
      if (!monthlyData[month]) {
        monthlyData[month] = { month, amount: 0 };
      }
      monthlyData[month].amount += v.amount;
    });
    const monthlyPurchases = Object.values(monthlyData);
    
    // Top Vendors
    const vendorData: { [key: string]: { name: string, amount: number, count: number } } = {};
    purchaseBills.forEach(v => {
      if (v.vendorId) {
        const vendorName = vendors.find(vnd => vnd.id === v.vendorId)?.name || 'Unknown Vendor';
        if (!vendorData[v.vendorId]) {
          vendorData[v.vendorId] = { name: vendorName, amount: 0, count: 0 };
        }
        vendorData[v.vendorId].amount += v.amount;
        vendorData[v.vendorId].count += 1;
      }
    });
    const topVendors = Object.values(vendorData).sort((a, b) => b.amount - a.amount).slice(0, 5);

    // Top Items would require item details in vouchers, which is not fully implemented in this structure yet.

    return { monthlyPurchases, topVendors };
  }, [journalVouchers, vendors]);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Purchase Analysis</h1>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Purchase Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analysisData.monthlyPurchases}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `₹${(value as number / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => formatCurrency(value as number)}/>
              <Legend />
              <Bar dataKey="amount" fill="var(--color-purchases)" name="Purchase Amount" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Vendors by Value</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Total Purchases</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysisData.topVendors.map(vendor => (
                  <TableRow key={vendor.name}>
                    <TableCell className="font-medium">{vendor.name}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(vendor.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Items by Quantity</CardTitle>
            <CardDescription>This feature is under development.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">Item-wise purchase data will be displayed here.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

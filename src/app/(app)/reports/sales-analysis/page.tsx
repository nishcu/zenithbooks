
"use client";

import { useMemo, useContext, useRef, Suspense, memo } from "react";
import { LazyBarChart, LazyPieChart, LazyResponsiveContainer, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Pie, Cell } from "@/components/charts/lazy-charts";
import { Loader2 } from "lucide-react";
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
import { ShareButtons } from "@/components/documents/share-buttons";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const SalesAnalysis = memo(function SalesAnalysis() {
  const { journalVouchers, loading } = useContext(AccountingContext)!;
  const [user] = useAuthState(auth);
  const reportRef = useRef<HTMLDivElement>(null);

  const customersQuery = user ? query(collection(db, 'customers'), where("userId", "==", user.uid)) : null;
  const [customersSnapshot] = useCollection(customersQuery);
  const customers = useMemo(() => customersSnapshot?.docs.map(doc => ({ id: doc.id, name: doc.data().name })) || [], [customersSnapshot]);

  const analysisData = useMemo(() => {
    const salesInvoices = journalVouchers.filter(v => v && v.id && v.id.startsWith("INV-"));
    
    // Monthly Analysis
    const monthlyData: { [key: string]: { month: string, amount: number } } = {};
    salesInvoices.forEach(v => {
      const month = format(parseISO(v.date), 'MMM yyyy');
      if (!monthlyData[month]) {
        monthlyData[month] = { month, amount: 0 };
      }
      monthlyData[month].amount += v.amount;
    });
    const monthlySales = Object.values(monthlyData);
    
    // Top Customers
    const customerData: { [key: string]: { name: string, amount: number } } = {};
    salesInvoices.forEach(v => {
      if (v.customerId) {
        const customerName = customers.find(c => c.id === v.customerId)?.name || 'Unknown Customer';
        if (!customerData[v.customerId]) {
          customerData[v.customerId] = { name: customerName, amount: 0 };
        }
        customerData[v.customerId].amount += v.amount;
      }
    });
    const topCustomers = Object.values(customerData).sort((a, b) => b.amount - a.amount).slice(0, 5);

    // Top Items would require item details in vouchers, which is not fully implemented in this structure yet.

    return { monthlySales, topCustomers };
  }, [journalVouchers, customers]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Sales Analysis</h1>
        <ShareButtons
          contentRef={reportRef}
          fileName={`Sales-Analysis-${format(new Date(), 'yyyy-MM-dd')}`}
          whatsappMessage={`Check out my Sales Analysis Report from ZenithBooks`}
          emailSubject="Sales Analysis Report"
          emailBody="Please find attached the Sales Analysis Report."
          shareTitle="Sales Analysis Report"
        />
      </div>

      <div ref={reportRef}>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Sales Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="flex items-center justify-center h-[300px]"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <LazyResponsiveContainer width="100%" height={300}>
              <LazyBarChart data={analysisData.monthlySales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `₹${(value as number / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => formatCurrency(value as number)}/>
                <Legend />
                <Bar dataKey="amount" fill="var(--color-sales)" name="Sales Amount" />
              </LazyBarChart>
            </LazyResponsiveContainer>
          </Suspense>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Customers by Value</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="flex items-center justify-center h-[250px]"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
              <LazyResponsiveContainer width="100%" height={250}>
                <LazyPieChart>
                    <Pie
                        data={analysisData.topCustomers}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="amount"
                        nameKey="name"
                    >
                        {analysisData.topCustomers.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value as number)}/>
                    <Legend />
                </LazyPieChart>
              </LazyResponsiveContainer>
            </Suspense>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Items by Quantity</CardTitle>
             <CardDescription>This feature is under development.</CardDescription>
          </CardHeader>
          <CardContent>
             <p className="text-muted-foreground text-center py-8">Item-wise sales data will be displayed here.</p>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
});

export default SalesAnalysis;

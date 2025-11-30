
"use client"

import { useMemo, useContext, Suspense, memo } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { Bar, CartesianGrid, XAxis } from "recharts";
import { format, subMonths, startOfMonth, addMonths, parseISO } from 'date-fns';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { type ChartConfig } from "@/components/ui/chart";
import { AccountingContext } from "@/context/accounting-context";

// Lazy load heavy chart components
const LazyBarChart = dynamic(
  () => import("recharts").then((mod) => mod.BarChart),
  { 
    loading: () => <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>,
    ssr: false 
  }
);

const chartConfig = {
  sales: {
    label: "Sales",
    color: "hsl(var(--chart-2))",
  },
  purchases: {
    label: "Purchases",
    color: "hsl(var(--chart-1))",
  },
   net: {
    label: "Net",
    color: "hsl(var(--chart-3))",
  }
} satisfies ChartConfig

export const FinancialSummaryChart = memo(function FinancialSummaryChart() {
  const accountingContext = useContext(AccountingContext);
  
  // Handle context not being available
  if (!accountingContext) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Financial Summary - Last 6 Months</CardTitle>
          <CardDescription>A look at net sales, net purchases, and cash flow.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const { journalVouchers, loading } = accountingContext;

  const chartData = useMemo(() => {
    const data: { [key: string]: { sales: number; purchases: number; month: string; sortOrder: number } } = {};
    const today = new Date();
    const sixMonthsAgo = startOfMonth(subMonths(today, 5));
    const currentMonthStart = startOfMonth(today);
    const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    // Initialize last 6 months
    for (let i = 0; i < 6; i++) {
        const monthDate = addMonths(sixMonthsAgo, i);
        const month = format(monthDate, 'MMM yyyy');
        const yearMonth = format(monthDate, 'yyyy-MM');
        data[yearMonth] = { month, sales: 0, purchases: 0, sortOrder: i };
    }

    // Process vouchers if available
    if (journalVouchers && Array.isArray(journalVouchers)) {
      journalVouchers.forEach(voucher => {
          if (!voucher || !voucher.id || !voucher.date || voucher.reverses) return;
          
          // Parse date - handle both ISO format and 'yyyy-MM-dd' format
          let voucherDate: Date;
          try {
              if (typeof voucher.date === 'string') {
                  if (voucher.date.includes('T')) {
                      voucherDate = parseISO(voucher.date);
                  } else {
                      // Handle 'yyyy-MM-dd' format
                      const [year, month, day] = voucher.date.split('-').map(Number);
                      voucherDate = new Date(year, month - 1, day);
                  }
              } else if (voucher.date instanceof Date) {
                  voucherDate = voucher.date;
              } else {
                  // Handle Firestore Timestamp
                  voucherDate = (voucher.date as any)?.toDate?.() || new Date(voucher.date);
              }
          } catch (e) {
              console.warn('Invalid date format:', voucher.date);
              return;
          }
          
          if (isNaN(voucherDate.getTime())) {
              return;
          }
          
          // Check if date is within the last 6 months range (include current month)
          const monthStart = startOfMonth(voucherDate);
          if (monthStart < sixMonthsAgo || monthStart > currentMonthStart) {
              return;
          }
          
          const yearMonth = format(monthStart, 'yyyy-MM');
          
          if (data[yearMonth]) {
              const isInvoice = voucher.id.startsWith("INV-") && !voucher.id.startsWith("CANCEL-");
              const isBill = voucher.id.startsWith("BILL-") && !voucher.id.startsWith("CANCEL-");
              const isCreditNote = voucher.id.startsWith("CN-");
              const isDebitNote = voucher.id.startsWith("DN-");

              // Use the main voucher amount, which represents the total value
              const amount = Number(voucher.amount) || 0;
              if (isInvoice) {
                  data[yearMonth].sales += amount;
              } else if (isCreditNote) {
                  data[yearMonth].sales -= Math.abs(amount);
              } else if (isBill) {
                  data[yearMonth].purchases += amount;
              } else if (isDebitNote) {
                  data[yearMonth].purchases -= Math.abs(amount);
              }
          }
      });
    }
    
    // Sort by sortOrder to maintain chronological order
    // Always return 6 months of data (even if all zeros)
    return Object.values(data)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(d => ({ 
          month: d.month, 
          sales: Math.max(0, d.sales), 
          purchases: Math.max(0, d.purchases), 
          net: d.sales - d.purchases 
        }));

  }, [journalVouchers]);


  // Show loading state
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Financial Summary - Last 6 Months</CardTitle>
          <CardDescription>A look at net sales, net purchases, and cash flow.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Summary - Last 6 Months</CardTitle>
        <CardDescription>A look at net sales, net purchases, and cash flow.</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData && chartData.length > 0 ? (
          <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <ChartContainer config={chartConfig}>
              <LazyBarChart accessibilityLayer data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dashed" />}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="sales" fill="var(--color-sales)" radius={4} />
                <Bar dataKey="purchases" fill="var(--color-purchases)" radius={4} />
                <Bar dataKey="net" fill="var(--color-net)" radius={4} />
              </LazyBarChart>
            </ChartContainer>
          </Suspense>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <p className="mb-2">No financial data available for the last 6 months.</p>
              <p className="text-sm">Create invoices or purchase bills to see data here.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
});

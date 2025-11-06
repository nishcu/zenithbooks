
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
  const { journalVouchers } = useContext(AccountingContext)!;

  const chartData = useMemo(() => {
    const data: { [key: string]: { sales: number; purchases: number; month: string } } = {};
    const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));

    // Initialize last 6 months
    for (let i = 0; i < 6; i++) {
        const monthDate = addMonths(sixMonthsAgo, i);
        const month = format(monthDate, 'MMM');
        const yearMonth = format(monthDate, 'yyyy-MM');
        data[yearMonth] = { month, sales: 0, purchases: 0 };
    }

    journalVouchers.forEach(voucher => {
        if (!voucher || !voucher.id || !voucher.date) return;
        
        const voucherDate = parseISO(voucher.date); // Use parseISO for 'yyyy-MM-dd'
        if (isNaN(voucherDate.getTime()) || voucherDate < sixMonthsAgo) {
            return;
        }
        
        const yearMonth = format(voucherDate, 'yyyy-MM');
        
        if (data[yearMonth]) {
            const isInvoice = voucher.id.startsWith("INV-");
            const isBill = voucher.id.startsWith("BILL-");
            const isCreditNote = voucher.id.startsWith("CN-");
            const isDebitNote = voucher.id.startsWith("DN-");

            // Use the main voucher amount, which represents the total value
            if (isInvoice) {
                data[yearMonth].sales += voucher.amount || 0;
            } else if (isCreditNote) {
                data[yearMonth].sales -= voucher.amount || 0;
            } else if (isBill) {
                data[yearMonth].purchases += voucher.amount || 0;
            } else if (isDebitNote) {
                data[yearMonth].purchases -= voucher.amount || 0;
            }
        }
    });
    
    return Object.values(data).map(d => ({...d, net: d.sales - d.purchases }));

  }, [journalVouchers]);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Summary - Last 6 Months</CardTitle>
        <CardDescription>A look at net sales, net purchases, and cash flow.</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <ChartContainer config={chartConfig}>
              <LazyBarChart accessibilityLayer data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
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
            No financial data available for the last 6 months.
          </div>
        )}
      </CardContent>
    </Card>
  )
});

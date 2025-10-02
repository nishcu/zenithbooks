
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ArrowUpRight, Loader2 } from "lucide-react"
import { Button } from "../ui/button"
import Link from "next/link"

type Invoice = {
  invoice: string;
  customer: string;
  amount: string;
  status: string;
};

type RecentActivityProps = {
  invoices: Invoice[];
  loading: boolean;
};

export function RecentActivity({ invoices, loading }: RecentActivityProps) {
  return (
    <>
       <div className="flex items-center justify-between mb-4">
        <div className="grid gap-2">
            <h3 className="text-xl font-semibold">Recent Invoices</h3>
            <p className="text-sm text-muted-foreground">
                An overview of your 5 most recent invoices.
            </p>
        </div>
        <Button asChild size="sm" className="ml-auto gap-1">
            <Link href="/billing/invoices">
                View All
                <ArrowUpRight className="h-4 w-4" />
            </Link>
        </Button>
      </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  <Loader2 className="animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : invoices.length > 0 ? (
                invoices.map((invoice) => (
                <TableRow key={invoice.invoice}>
                    <TableCell>
                    <div className="font-medium">{invoice.customer}</div>
                    <div className="text-sm text-muted-foreground">
                        {invoice.invoice}
                    </div>
                    </TableCell>
                    <TableCell className="text-center">
                    <Badge 
                        variant={
                        invoice.status === "Paid" ? "default" :
                        invoice.status === "Overdue" ? "destructive" :
                        "secondary"
                        }
                        className={
                            invoice.status === "Paid" ? "bg-green-600" : ""
                        }
                    >
                        {invoice.status}
                    </Badge>
                    </TableCell>
                    <TableCell className="text-right">{invoice.amount}</TableCell>
                </TableRow>
                ))
            ) : (
                <TableRow>
                    <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                        No recent invoices found.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
    </>
  )
}

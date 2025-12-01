
"use client";

import { StatCard } from "@/components/dashboard/stat-card";
import { Users, IndianRupee, FileText, Landmark } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const payrollSummary = {
    activeEmployees: 12,
    netPay: 850000,
    taxesDeducted: 120000,
    providentFund: 60000
};

const recentPayruns = [
    { id: "PAY-2024-07", month: "July 2024", status: "Paid", amount: 850000 },
    { id: "PAY-2024-06", month: "June 2024", status: "Paid", amount: 845000 },
    { id: "PAY-2024-05", month: "May 2024", status: "Paid", amount: 840000 },
];

export default function PayrollPage() {
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                <h1 className="text-3xl font-bold">Payroll Dashboard</h1>
                <p className="text-muted-foreground">
                    An overview of your company's payroll activities.
                </p>
                </div>
                <Link href="/payroll/run-payroll">
                    <Button size="lg">Run Payroll</Button>
                </Link>
            </div>

             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard 
                    title="Active Employees"
                    value={String(payrollSummary.activeEmployees)}
                    icon={Users}
                />
                 <StatCard 
                    title="Net Pay (Last Month)"
                    value={`₹${payrollSummary.netPay.toLocaleString('en-IN')}`}
                    icon={IndianRupee}
                />
                 <StatCard 
                    title="Taxes Deducted (TDS)"
                    value={`₹${payrollSummary.taxesDeducted.toLocaleString('en-IN')}`}
                    icon={FileText}
                />
                 <StatCard 
                    title="Provident Fund (PF)"
                    value={`₹${payrollSummary.providentFund.toLocaleString('en-IN')}`}
                    icon={Landmark}
                />
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Recent Payruns</CardTitle>
                    <CardDescription>A list of your most recent payroll runs.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Payrun ID</TableHead>
                                <TableHead>Month</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Net Pay Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recentPayruns.map(run => (
                                <TableRow key={run.id}>
                                    <TableCell className="font-medium">{run.id}</TableCell>
                                    <TableCell>{run.month}</TableCell>
                                    <TableCell><Badge className="bg-green-600">{run.status}</Badge></TableCell>
                                    <TableCell className="text-right font-mono">₹{run.amount.toLocaleString('en-IN')}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

        </div>
    );
}

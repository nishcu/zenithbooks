
"use client";

import { useMemo } from "react";
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
import { useAuthState } from "react-firebase-hooks/auth";
import { useCollection } from "react-firebase-hooks/firestore";
import { auth, db } from "@/lib/firebase";
import { collection, query, where } from "firebase/firestore";

export default function PayrollPage() {
    const [user] = useAuthState(auth);
    const employeesQuery = user ? query(collection(db, "employees"), where("employerId", "==", user.uid)) : null;
    const [employeesSnapshot, employeesLoading] = useCollection(employeesQuery);
    const activeEmployees = useMemo(() => {
        if (!employeesSnapshot) return 0;
        return employeesSnapshot.docs.filter(d => (d.data() as any)?.status !== "Resigned").length;
    }, [employeesSnapshot]);

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
                    value={employeesLoading ? "…" : String(activeEmployees)}
                    icon={Users}
                />
                 <StatCard 
                    title="Net Pay (Last Month)"
                    value="—"
                    icon={IndianRupee}
                    description="Run payroll to generate totals"
                />
                 <StatCard 
                    title="Taxes Deducted (TDS)"
                    value="—"
                    icon={FileText}
                    description="Available after payrun"
                />
                 <StatCard 
                    title="Provident Fund (PF)"
                    value="—"
                    icon={Landmark}
                    description="Available after payrun"
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
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground">
                                    No payroll runs yet. Click “Run Payroll” to create your first payrun.
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

        </div>
    );
}

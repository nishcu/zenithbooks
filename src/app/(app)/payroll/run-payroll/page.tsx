
"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  User,
  Shield,
  IndianRupee,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { useAuthState } from "react-firebase-hooks/auth";
import { useCollection } from "react-firebase-hooks/firestore";
import { auth, db } from "@/lib/firebase";
import { collection, query, where } from "firebase/firestore";

type RunPayrollEmployee = {
  id: string;
  name: string;
  selected: boolean;
  gross: number;
  deductions: number;
  net: number;
};

export default function RunPayrollPage() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [user] = useAuthState(auth);
  const employeesQuery = user ? query(collection(db, "employees"), where("employerId", "==", user.uid)) : null;
  const [employeesSnapshot, employeesLoading] = useCollection(employeesQuery);
  const [employees, setEmployees] = useState<RunPayrollEmployee[]>([]);

  // Hydrate from Firestore (once loaded). Salary fields can be wired later; keep 0 for now.
  // This removes dummy data and makes payroll use the real employee master.
  useEffect(() => {
    if (!employeesSnapshot) return;
    const rows: RunPayrollEmployee[] = employeesSnapshot.docs.map((d) => {
      const data: any = d.data();
      return {
        id: d.id,
        name: data?.name || "Employee",
        selected: true,
        gross: 0,
        deductions: 0,
        net: 0,
      };
    });
    setEmployees(rows);
  }, [employeesSnapshot]);

  const handleNext = () => {
    toast({
      title: `Step ${step} Complete!`,
    });
    setStep((prev) => prev + 1);
  };
  const handleBack = () => setStep((prev) => prev - 1);
  
  const handleFinalize = () => {
    toast({
      title: "Payroll Finalized!",
      description: "July 2024 payroll has been processed and recorded."
    });
    setStep(1); // Reset
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="size-5" />
                Step 1: Select Employees
              </CardTitle>
              <CardDescription>
                Select the employees to include in this pay run for July 2024.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {employeesLoading && (
                <div className="text-sm text-muted-foreground mb-3">Loading employees...</div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={employees.every((e) => e.selected)}
                        onCheckedChange={(checked) =>
                          setEmployees(
                            employees.map((e) => ({ ...e, selected: !!checked }))
                          )
                        }
                      />
                    </TableHead>
                    <TableHead>Employee Name</TableHead>
                    <TableHead className="text-right">Gross Salary</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right">Net Pay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell>
                        <Checkbox
                          checked={emp.selected}
                          onCheckedChange={(checked) =>
                            setEmployees(
                              employees.map((e) =>
                                e.id === emp.id
                                  ? { ...e, selected: !!checked }
                                  : e
                              )
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell className="text-right font-mono">
                        ₹{emp.gross.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ₹{emp.deductions.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ₹{emp.net.toLocaleString("en-IN")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="justify-end">
              <Button onClick={handleNext}>
                Review Payroll <ArrowRight className="ml-2" />
              </Button>
            </CardFooter>
          </Card>
        );
      case 2:
        const totalNetPay = employees.reduce((acc, e) => e.selected ? acc + e.net : acc, 0);
        return (
            <Card>
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <IndianRupee className="size-5" />
                        Step 2: Review and Confirm
                    </CardTitle>
                    <CardDescription>
                        Please review the final payroll summary before finalizing.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 border rounded-lg space-y-2">
                        <div className="flex justify-between"><span className="text-muted-foreground">Pay Period:</span> <span className="font-medium">July 2024</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Total Employees:</span> <span className="font-medium">{employees.filter(e => e.selected).length}</span></div>
                        <Separator/>
                        <div className="flex justify-between font-bold text-lg"><span className="text-foreground">Total Net Payout:</span> <span className="font-mono">₹{totalNetPay.toLocaleString('en-IN')}</span></div>
                    </div>
                </CardContent>
                <CardFooter className="justify-between">
                    <Button variant="outline" onClick={handleBack}>
                        <ArrowLeft className="mr-2" /> Back
                    </Button>
                    <Button onClick={handleFinalize}>
                        Finalize & Record Journal
                    </Button>
                </CardFooter>
            </Card>
        )
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Run Payroll</h1>
          <p className="text-muted-foreground">
            Process payroll for the month of July 2024.
          </p>
        </div>
      </div>
      {renderStep()}
    </div>
  );
}

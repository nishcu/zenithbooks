
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
import { useCollection, useDocument } from "react-firebase-hooks/firestore";
import { auth, db } from "@/lib/firebase";
import { collection, doc, query, where } from "firebase/firestore";

type RunPayrollEmployee = {
  id: string;
  name: string;
  selected: boolean;
  basic: number;
  hra: number;
  otherAllowances: number;
  gross: number;
  salaryDeductions: number;
  pf: number;
  esi: number;
  pt: number;
  deductions: number; // total deductions = salary + pf + esi + pt
  net: number;
};

export default function RunPayrollPage() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [user] = useAuthState(auth);
  const employeesQuery = user ? query(collection(db, "employees"), where("employerId", "==", user.uid)) : null;
  const [employeesSnapshot, employeesLoading] = useCollection(employeesQuery);
  const [employees, setEmployees] = useState<RunPayrollEmployee[]>([]);
  const settingsRef = user ? doc(db, "payrollSettings", user.uid) : null;
  const [settingsSnap] = useDocument(settingsRef as any);

  const statutory = (settingsSnap?.data() as any)?.statutory || {};
  const pfEnabled = !!statutory.pfEnabled;
  const esiEnabled = !!statutory.esiEnabled;
  const ptEnabled = !!statutory.ptEnabled;
  const pfRatePercent = Number(statutory.pfEmployeeRatePercent || 0) || 0;
  const esiRatePercent = Number(statutory.esiEmployeeRatePercent || 0) || 0;
  const ptAmount = Number(statutory.ptEmployeeAmount || 0) || 0;

  // Hydrate from Firestore (once loaded) and compute gross/deductions/net
  // based on saved employee.salary.* (monthly).
  useEffect(() => {
    if (!employeesSnapshot) return;
    const rows: RunPayrollEmployee[] = employeesSnapshot.docs.map((d) => {
      const data: any = d.data();
      const basic = Number(data?.salary?.basic || 0) || 0;
      const hra = Number(data?.salary?.hra || 0) || 0;
      const otherAllowances = Number(data?.salary?.otherAllowances || 0) || 0;
      const salaryDeductions = Number(data?.salary?.deductions || 0) || 0;
      const gross = Math.max(0, basic + hra + otherAllowances);

      const pf = pfEnabled ? Math.max(0, (basic * pfRatePercent) / 100) : 0;
      const esi = esiEnabled ? Math.max(0, (gross * esiRatePercent) / 100) : 0;
      const pt = ptEnabled ? Math.max(0, ptAmount) : 0;
      const deductions = Math.max(0, salaryDeductions) + pf + esi + pt;
      const net = Math.max(0, gross - deductions);

      return {
        id: d.id,
        name: data?.name || "Employee",
        selected: true,
        basic: Math.max(0, basic),
        hra: Math.max(0, hra),
        otherAllowances: Math.max(0, otherAllowances),
        gross,
        salaryDeductions: Math.max(0, salaryDeductions),
        pf,
        esi,
        pt,
        deductions,
        net,
      };
    });
    setEmployees(rows);
  }, [employeesSnapshot, pfEnabled, esiEnabled, ptEnabled, pfRatePercent, esiRatePercent, ptAmount]);

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
        const selectedEmployees = employees.filter(e => e.selected);
        const totals = selectedEmployees.reduce((acc, e) => {
          acc.basic += e.basic;
          acc.hra += e.hra;
          acc.otherAllowances += e.otherAllowances;
          acc.gross += e.gross;
          acc.salaryDeductions += e.salaryDeductions;
          acc.pf += e.pf;
          acc.esi += e.esi;
          acc.pt += e.pt;
          acc.deductions += e.deductions;
          acc.net += e.net;
          return acc;
        }, { basic: 0, hra: 0, otherAllowances: 0, gross: 0, salaryDeductions: 0, pf: 0, esi: 0, pt: 0, deductions: 0, net: 0 });
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
                        <div className="flex justify-between"><span className="text-muted-foreground">Total Employees:</span> <span className="font-medium">{selectedEmployees.length}</span></div>
                        <Separator/>
                        <div className="flex justify-between font-bold text-lg"><span className="text-foreground">Total Net Payout:</span> <span className="font-mono">₹{totalNetPay.toLocaleString('en-IN')}</span></div>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                      <div className="px-4 py-3 border-b bg-muted/30">
                        <div className="font-semibold text-sm">Salary Breakdown (Monthly)</div>
                        <div className="text-xs text-muted-foreground">
                          This is calculated from each employee’s salary + statutory deductions (PF/ESI/PT from Payroll Settings).
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Employee</TableHead>
                              <TableHead className="text-right">Basic</TableHead>
                              <TableHead className="text-right">HRA</TableHead>
                              <TableHead className="text-right">Other</TableHead>
                              <TableHead className="text-right">Gross</TableHead>
                              <TableHead className="text-right">PF</TableHead>
                              <TableHead className="text-right">ESI</TableHead>
                              <TableHead className="text-right">PT</TableHead>
                              <TableHead className="text-right">Other Deductions</TableHead>
                              <TableHead className="text-right">Total Deductions</TableHead>
                              <TableHead className="text-right">Net</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedEmployees.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground">
                                  No employees selected.
                                </TableCell>
                              </TableRow>
                            ) : (
                              <>
                                {selectedEmployees.map((emp) => (
                                  <TableRow key={emp.id}>
                                    <TableCell className="font-medium">{emp.name}</TableCell>
                                    <TableCell className="text-right font-mono">₹{emp.basic.toLocaleString("en-IN")}</TableCell>
                                    <TableCell className="text-right font-mono">₹{emp.hra.toLocaleString("en-IN")}</TableCell>
                                    <TableCell className="text-right font-mono">₹{emp.otherAllowances.toLocaleString("en-IN")}</TableCell>
                                    <TableCell className="text-right font-mono">₹{emp.gross.toLocaleString("en-IN")}</TableCell>
                                    <TableCell className="text-right font-mono">₹{emp.pf.toLocaleString("en-IN")}</TableCell>
                                    <TableCell className="text-right font-mono">₹{emp.esi.toLocaleString("en-IN")}</TableCell>
                                    <TableCell className="text-right font-mono">₹{emp.pt.toLocaleString("en-IN")}</TableCell>
                                    <TableCell className="text-right font-mono">₹{emp.salaryDeductions.toLocaleString("en-IN")}</TableCell>
                                    <TableCell className="text-right font-mono">₹{emp.deductions.toLocaleString("en-IN")}</TableCell>
                                    <TableCell className="text-right font-mono">₹{emp.net.toLocaleString("en-IN")}</TableCell>
                                  </TableRow>
                                ))}
                                <TableRow>
                                  <TableCell className="font-semibold">Total</TableCell>
                                  <TableCell className="text-right font-mono font-semibold">₹{totals.basic.toLocaleString("en-IN")}</TableCell>
                                  <TableCell className="text-right font-mono font-semibold">₹{totals.hra.toLocaleString("en-IN")}</TableCell>
                                  <TableCell className="text-right font-mono font-semibold">₹{totals.otherAllowances.toLocaleString("en-IN")}</TableCell>
                                  <TableCell className="text-right font-mono font-semibold">₹{totals.gross.toLocaleString("en-IN")}</TableCell>
                                  <TableCell className="text-right font-mono font-semibold">₹{totals.pf.toLocaleString("en-IN")}</TableCell>
                                  <TableCell className="text-right font-mono font-semibold">₹{totals.esi.toLocaleString("en-IN")}</TableCell>
                                  <TableCell className="text-right font-mono font-semibold">₹{totals.pt.toLocaleString("en-IN")}</TableCell>
                                  <TableCell className="text-right font-mono font-semibold">₹{totals.salaryDeductions.toLocaleString("en-IN")}</TableCell>
                                  <TableCell className="text-right font-mono font-semibold">₹{totals.deductions.toLocaleString("en-IN")}</TableCell>
                                  <TableCell className="text-right font-mono font-semibold">₹{totals.net.toLocaleString("en-IN")}</TableCell>
                                </TableRow>
                              </>
                            )}
                          </TableBody>
                        </Table>
                      </div>
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

"use client";

import { useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileSignature, Printer } from "lucide-react";
import { useReactToPrint } from "react-to-print";

export default function Form16() {
  const printRef = useRef(null);
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
  });

  // Dummy state for form fields - in a real app, this would use react-hook-form
  const [employeeName, setEmployeeName] = useState("Rohan Sharma");
  const [employeePan, setEmployeePan] = useState("ABCDE1234F");
  const [employerName, setEmployerName] = useState("GSTEase Solutions Pvt. Ltd.");
  const [employerTan, setEmployerTan] = useState("MUMB12345E");
  const [grossSalary, setGrossSalary] = useState(1200000);
  const [deductions, setDeductions] = useState(150000);
  const [taxableIncome, setTaxableIncome] = useState(1050000);
  const [taxDeducted, setTaxDeducted] = useState(124800);


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Form 16 Generator</h1>
        <p className="text-muted-foreground">
          Generate Part B of Form 16 (TDS Certificate for Salary).
        </p>
      </div>
      
      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <Card>
            <CardHeader>
            <CardTitle>Enter Employee & Salary Details</CardTitle>
            <CardDescription>Fill in the details to generate the Form 16 preview.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Label>Employee Name</Label>
                    <Input value={employeeName} onChange={e => setEmployeeName(e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label>Employee PAN</Label>
                    <Input value={employeePan} onChange={e => setEmployeePan(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label>Gross Salary</Label>
                    <Input type="number" value={grossSalary} onChange={e => setGrossSalary(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                    <Label>Deductions under Chapter VI-A</Label>
                    <Input type="number" value={deductions} onChange={e => setDeductions(Number(e.target.value))} />
                </div>
                 <div className="space-y-2">
                    <Label>Total Tax Deducted at Source (TDS)</Label>
                    <Input type="number" value={taxDeducted} onChange={e => setTaxDeducted(Number(e.target.value))} />
                </div>
            </CardContent>
        </Card>

        <Card className="sticky top-4">
            <CardHeader>
                <CardTitle>Form 16 - Part B Preview</CardTitle>
            </CardHeader>
            <CardContent ref={printRef} className="prose prose-sm dark:prose-invert max-w-none border rounded-md p-4">
                <div className="text-center">
                    <h4 className="font-bold">FORM NO. 16</h4>
                    <p>[See rule 31(1)(a)]</p>
                    <h5 className="font-bold">PART B (Annexure)</h5>
                    <h5 className="font-bold">DETAILS OF SALARY PAID AND ANY OTHER INCOME AND TAX DEDUCTED</h5>
                </div>
                
                <ol className="list-decimal list-outside pl-5 space-y-2">
                    <li><strong>Name and address of the employer:</strong><br/>{employerName}</li>
                    <li><strong>Name and designation of the employee:</strong><br/>{employeeName}</li>
                    <li><strong>PAN of the employee:</strong> {employeePan}</li>
                    <li><strong>Gross salary:</strong><br/>(a) Salary as per provisions contained in section 17(1): ₹{grossSalary.toLocaleString('en-IN')}</li>
                    <li><strong>Deductions under section 16:</strong><br/>(ia) Standard deduction u/s 16(ia): ₹50,000.00</li>
                    <li><strong>Total taxable salary (4 - 5):</strong> ₹{(grossSalary - 50000).toLocaleString('en-IN')}</li>
                    <li><strong>Aggregate of deductions under Chapter VI-A:</strong> ₹{deductions.toLocaleString('en-IN')}</li>
                    <li><strong>Total taxable income (6 - 7):</strong> ₹{(grossSalary - 50000 - deductions).toLocaleString('en-IN')}</li>
                    <li><strong>Tax on total income:</strong> [Calculation as per slabs]</li>
                    <li><strong>Tax deducted at source u/s 192:</strong> ₹{taxDeducted.toLocaleString('en-IN')}</li>
                </ol>

                <div className="mt-8">
                    <h5 className="font-bold text-center">VERIFICATION</h5>
                    <p>I, <strong>[Signer's Name]</strong>, son/daughter of <strong>[Father's Name]</strong>, working in the capacity of <strong>[Designation]</strong>, do hereby certify that the information given above is true, complete and correct and is based on the books of account, documents and other available records.</p>
                </div>
                <div className="flex justify-between mt-16">
                    <div>
                        <p>Place: Mumbai</p>
                        <p>Date: {new Date().toLocaleDateString('en-GB')}</p>
                    </div>
                    <div className="text-right">
                        <p>_______________________</p>
                        <p>(Signature of person responsible for deduction of tax)</p>
                        <p>Full Name: <strong>[Signer's Name]</strong></p>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                 <Button onClick={handlePrint}>
                    <Printer className="mr-2" /> Print / Save PDF
                </Button>
            </CardFooter>
        </Card>
      </div>
    </div>
  );
}

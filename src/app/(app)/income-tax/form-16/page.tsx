"use client";

import { useState, useRef, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { doc, collection, query, where, getDocs } from "firebase/firestore";
import { useDocumentData } from "react-firebase-hooks/firestore";
import { UpgradeRequiredAlert } from "@/components/upgrade-required-alert";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  FileSignature,
  Printer,
  Download,
  Upload,
  Users,
  Calculator,
  Eye,
  Settings,
  AlertCircle,
  CheckCircle,
  XCircle
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { ShareButtons } from "@/components/documents/share-buttons";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Form16Computation } from "@/lib/form-16-models";

interface Employee {
  id: string;
  name: string;
  pan: string;
  designation: string;
  selected?: boolean;
}

interface Form16Data {
  employeeId: string;
  financialYear: string;
  employerName: string;
  employerTan: string;
  employerPan?: string;
  salaryStructure: {
    basic: number;
    hra: number;
    da: number;
    specialAllowance: number;
    lta: number;
    bonus: number;
    incentives: number;
    arrears: number;
    perquisites: number;
    employerPf: number;
  };
  exemptions: {
    hraExempt: number;
    ltaExempt: number;
    childrenEduAllowance: number;
    hostelAllowance: number;
  };
  deductions80: {
    section80C: number;
    section80CCD1B: number;
    section80D: number;
    section80TTA: number;
    section80G: number;
  };
  otherIncome: {
    savingsInterest: number;
    fdInterest: number;
    otherIncome: number;
  };
  tdsDetails: {
    totalTdsDeducted: number;
    relief89: number;
  };
}

export default function Form16() {
  const [user] = useAuthState(auth);
  const userDocRef = user ? doc(db, 'users', user.uid) : null;
  const [userData] = useDocumentData(userDocRef);
  const subscriptionPlan = userData?.subscriptionPlan || 'freemium';
  const isFreemium = subscriptionPlan === 'freemium';

  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("single");
  const [isLoading, setIsLoading] = useState(false);

  // Single Form 16 state
  const [form16Data, setForm16Data] = useState<Form16Data>({
    employeeId: "",
    financialYear: "2023-24",
    employerName: userData?.companyName || "",
    employerTan: userData?.tan || "",
    employerPan: userData?.pan || "",
    salaryStructure: {
      basic: 0,
      hra: 0,
      da: 0,
      specialAllowance: 0,
      lta: 0,
      bonus: 0,
      incentives: 0,
      arrears: 0,
      perquisites: 0,
      employerPf: 0
    },
    exemptions: {
      hraExempt: 0,
      ltaExempt: 0,
      childrenEduAllowance: 0,
      hostelAllowance: 0
    },
    deductions80: {
      section80C: 0,
      section80CCD1B: 0,
      section80D: 0,
      section80TTA: 0,
      section80G: 0
    },
    otherIncome: {
      savingsInterest: 0,
      fdInterest: 0,
      otherIncome: 0
    },
    tdsDetails: {
      totalTdsDeducted: 0,
      relief89: 0
    }
  });

  const [computationResult, setComputationResult] = useState<Form16Computation | null>(null);
  const [generatedPdf, setGeneratedPdf] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Bulk generation state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [bulkFinancialYear, setBulkFinancialYear] = useState("2023-24");
  const [bulkEmployerName, setBulkEmployerName] = useState(userData?.companyName || "");
  const [bulkEmployerTan, setBulkEmployerTan] = useState(userData?.tan || "");
  const [bulkEmployerPan, setBulkEmployerPan] = useState(userData?.pan || "");
  const [bulkResults, setBulkResults] = useState<any>(null);

  // Validation function
  const validateForm16Data = (data: Form16Data): string[] => {
    const errors: string[] = [];

    if (!data.employeeId) {
      errors.push("Please select an employee");
    }

    // PAN format validation
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    const selectedEmployee = employees.find(e => e.id === data.employeeId);
    if (selectedEmployee && !panRegex.test(selectedEmployee.pan)) {
      errors.push("Invalid PAN format for selected employee");
    }

    // Deduction limits
    if (data.deductions80.section80C > 150000) {
      errors.push("Section 80C cannot exceed ₹1,50,000");
    }
    if (data.deductions80.section80CCD1B > 50000) {
      errors.push("Section 80CCD(1B) cannot exceed ₹50,000");
    }

    // Negative values check
    const allValues = [
      ...Object.values(data.salaryStructure),
      ...Object.values(data.exemptions),
      ...Object.values(data.deductions80),
      ...Object.values(data.otherIncome),
      ...Object.values(data.tdsDetails)
    ];

    if (allValues.some(val => val < 0)) {
      errors.push("All amounts must be non-negative");
    }

    return errors;
  };

  // Load employees on component mount
  useEffect(() => {
    if (user) {
      loadEmployees();
    }
  }, [user]);

  const loadEmployees = async () => {
    try {
      const employeesQuery = query(
        collection(db, 'employees'),
        where('employerId', '==', user!.uid)
      );
      const snapshot = await getDocs(employeesQuery);
      const employeeList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Employee[];
      setEmployees(employeeList);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load employees"
      });
    }
  };

  const generateSingleForm16 = async () => {
    // Validate form data
    const errors = validateForm16Data(form16Data);
    if (errors.length > 0) {
      setValidationErrors(errors);
      toast({
        variant: "destructive",
        title: "Validation Errors",
        description: errors[0]
      });
      return;
    }

    setValidationErrors([]);
    setIsLoading(true);
    try {
      const idToken = await user!.getIdToken();
      const response = await fetch('/api/form-16/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          employeeId: form16Data.employeeId,
          financialYear: form16Data.financialYear,
          overrideData: {
            salaryStructure: form16Data.salaryStructure,
            exemptions: form16Data.exemptions,
            deductions80: form16Data.deductions80,
            otherIncome: form16Data.otherIncome,
            tdsDetails: form16Data.tdsDetails
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        setComputationResult(result.data.computation);
        setGeneratedPdf(result.data.pdfUrl);
        toast({
          title: "Success",
          description: "Form 16 generated successfully"
        });
      } else {
        toast({
          variant: "destructive",
          title: "Generation Failed",
          description: result.errors?.join(', ') || "Unknown error"
        });
      }
    } catch (error) {
      console.error('Error generating Form 16:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate Form 16"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateBulkForm16 = async () => {
    const selectedEmployees = employees.filter(emp => emp.selected);
    if (selectedEmployees.length === 0) {
      toast({
        variant: "destructive",
        title: "No Employees Selected",
        description: "Please select at least one employee"
      });
      return;
    }

    setIsLoading(true);
    try {
      const idToken = await user!.getIdToken();
      const response = await fetch('/api/form-16/bulk-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          employeeIds: selectedEmployees.map(emp => emp.id),
          financialYear: bulkFinancialYear,
          employerName: bulkEmployerName,
          employerTan: bulkEmployerTan,
          employerPan: bulkEmployerPan
        })
      });

      const result = await response.json();

      if (result.success) {
        setBulkResults(result.data);
        toast({
          title: "Bulk Generation Complete",
          description: `Generated ${result.data.summary.successful} Form 16 documents`
        });
      } else {
        toast({
          variant: "destructive",
          title: "Bulk Generation Failed",
          description: result.errors?.join(', ') || "Unknown error"
        });
      }
    } catch (error) {
      console.error('Error in bulk generation:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate bulk Form 16"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadPdf = () => {
    if (generatedPdf) {
      const link = document.createElement('a');
      link.href = generatedPdf;
      link.download = `Form16_${form16Data.financialYear}.pdf`;
      link.click();
    }
  };

  // Early return for freemium users
  if (user && isFreemium) {
    return (
      <div className="space-y-8 p-8">
        <h1 className="text-3xl font-bold">Form 16 Generator</h1>
        <UpgradeRequiredAlert
          featureName="Form 16 Generator"
          description="Generate comprehensive Form 16 certificates for your employees with detailed Part B calculations."
          backHref="/dashboard"
          backLabel="Back to Dashboard"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Form 16 Generator</h1>
          <p className="text-muted-foreground">
            Generate comprehensive Form 16 certificates with detailed Part B tax computations.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="single">
            <FileSignature className="mr-2 h-4 w-4" />
            Single Form 16
          </TabsTrigger>
          <TabsTrigger value="bulk">
            <Users className="mr-2 h-4 w-4" />
            Bulk Generation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Input Form */}
            <Card>
              <CardHeader>
                <CardTitle>Employee & Salary Details</CardTitle>
                <CardDescription>Enter comprehensive details for Form 16 generation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                  <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="font-medium text-red-800">Validation Errors</span>
                    </div>
                    <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Basic Details */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Financial Year</Label>
                    <Select
                      value={form16Data.financialYear}
                      onValueChange={(value) => setForm16Data(prev => ({ ...prev, financialYear: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2023-24">2023-24</SelectItem>
                        <SelectItem value="2024-25">2024-25</SelectItem>
                        <SelectItem value="2025-26">2025-26</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Select Employee</Label>
                    <Select
                      value={form16Data.employeeId}
                      onValueChange={(value) => {
                        const employee = employees.find(e => e.id === value);
                        setForm16Data(prev => ({
                          ...prev,
                          employeeId: value,
                          employerName: employee ? prev.employerName : prev.employerName
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map(employee => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.name} - {employee.pan}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                {/* Salary Structure */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Salary Structure</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Basic Salary</Label>
                      <Input
                        type="number"
                        value={form16Data.salaryStructure.basic}
                        onChange={(e) => setForm16Data(prev => ({
                          ...prev,
                          salaryStructure: { ...prev.salaryStructure, basic: Number(e.target.value) }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>HRA</Label>
                      <Input
                        type="number"
                        value={form16Data.salaryStructure.hra}
                        onChange={(e) => setForm16Data(prev => ({
                          ...prev,
                          salaryStructure: { ...prev.salaryStructure, hra: Number(e.target.value) }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Special Allowance</Label>
                      <Input
                        type="number"
                        value={form16Data.salaryStructure.specialAllowance}
                        onChange={(e) => setForm16Data(prev => ({
                          ...prev,
                          salaryStructure: { ...prev.salaryStructure, specialAllowance: Number(e.target.value) }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>LTA</Label>
                      <Input
                        type="number"
                        value={form16Data.salaryStructure.lta}
                        onChange={(e) => setForm16Data(prev => ({
                          ...prev,
                          salaryStructure: { ...prev.salaryStructure, lta: Number(e.target.value) }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bonus</Label>
                      <Input
                        type="number"
                        value={form16Data.salaryStructure.bonus}
                        onChange={(e) => setForm16Data(prev => ({
                          ...prev,
                          salaryStructure: { ...prev.salaryStructure, bonus: Number(e.target.value) }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Employer PF</Label>
                      <Input
                        type="number"
                        value={form16Data.salaryStructure.employerPf}
                        onChange={(e) => setForm16Data(prev => ({
                          ...prev,
                          salaryStructure: { ...prev.salaryStructure, employerPf: Number(e.target.value) }
                        }))}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Exemptions */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Section 10 Exemptions</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>HRA Exemption</Label>
                      <Input
                        type="number"
                        value={form16Data.exemptions.hraExempt}
                        onChange={(e) => setForm16Data(prev => ({
                          ...prev,
                          exemptions: { ...prev.exemptions, hraExempt: Number(e.target.value) }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>LTA Exemption</Label>
                      <Input
                        type="number"
                        value={form16Data.exemptions.ltaExempt}
                        onChange={(e) => setForm16Data(prev => ({
                          ...prev,
                          exemptions: { ...prev.exemptions, ltaExempt: Number(e.target.value) }
                        }))}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Chapter VI-A Deductions */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Chapter VI-A Deductions</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Section 80C</Label>
                      <Input
                        type="number"
                        value={form16Data.deductions80.section80C}
                        onChange={(e) => setForm16Data(prev => ({
                          ...prev,
                          deductions80: { ...prev.deductions80, section80C: Number(e.target.value) }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Section 80CCD(1B)</Label>
                      <Input
                        type="number"
                        value={form16Data.deductions80.section80CCD1B}
                        onChange={(e) => setForm16Data(prev => ({
                          ...prev,
                          deductions80: { ...prev.deductions80, section80CCD1B: Number(e.target.value) }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Section 80D</Label>
                      <Input
                        type="number"
                        value={form16Data.deductions80.section80D}
                        onChange={(e) => setForm16Data(prev => ({
                          ...prev,
                          deductions80: { ...prev.deductions80, section80D: Number(e.target.value) }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Section 80TTA</Label>
                      <Input
                        type="number"
                        value={form16Data.deductions80.section80TTA}
                        onChange={(e) => setForm16Data(prev => ({
                          ...prev,
                          deductions80: { ...prev.deductions80, section80TTA: Number(e.target.value) }
                        }))}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* TDS Details */}
                <div className="space-y-4">
                  <h4 className="font-semibold">TDS Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Total TDS Deducted</Label>
                      <Input
                        type="number"
                        value={form16Data.tdsDetails.totalTdsDeducted}
                        onChange={(e) => setForm16Data(prev => ({
                          ...prev,
                          tdsDetails: { ...prev.tdsDetails, totalTdsDeducted: Number(e.target.value) }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Relief u/s 89</Label>
                      <Input
                        type="number"
                        value={form16Data.tdsDetails.relief89}
                        onChange={(e) => setForm16Data(prev => ({
                          ...prev,
                          tdsDetails: { ...prev.tdsDetails, relief89: Number(e.target.value) }
                        }))}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={generateSingleForm16}
                  disabled={isLoading}
                  className="w-full"
                >
                  <Calculator className="mr-2 h-4 w-4" />
                  {isLoading ? "Generating..." : "Generate Form 16"}
                </Button>
              </CardFooter>
            </Card>

            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Form 16 Preview</CardTitle>
                <CardDescription>Part B computation and preview</CardDescription>
              </CardHeader>
              <CardContent>
                {computationResult ? (
                  <div ref={printRef} className="space-y-4">
                    <div className="text-center border-b pb-4">
                      <h3 className="text-lg font-bold">FORM NO. 16 - PART B</h3>
                      <p className="text-sm text-muted-foreground">Tax Computation Details</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Gross Salary:</span>
                        <span className="font-mono">₹{computationResult.grossSalary.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Exemptions (Section 10):</span>
                        <span className="font-mono">₹{computationResult.exemptionsSection10.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Income from Salary:</span>
                        <span className="font-mono">₹{computationResult.incomeFromSalary.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Other Income:</span>
                        <span className="font-mono">₹{computationResult.otherIncome.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Gross Total Income:</span>
                        <span className="font-mono">₹{computationResult.grossTotalIncome.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Deductions (Chapter VI-A):</span>
                        <span className="font-mono">₹{computationResult.deductionsChapterVIA.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total Taxable Income:</span>
                        <span className="font-mono">₹{computationResult.totalTaxableIncome.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <h4 className="font-semibold">Tax Computation</h4>
                      <div className="flex justify-between">
                        <span>Tax on Income:</span>
                        <span className="font-mono">₹{computationResult.taxOnIncome.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Rebate u/s 87A:</span>
                        <span className="font-mono">₹{computationResult.rebate87A.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Health & Education Cess @4%:</span>
                        <span className="font-mono">₹{computationResult.healthEducationCess.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>Total Tax Liability:</span>
                        <span className="font-mono">₹{computationResult.totalTaxLiability.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>TDS Deducted:</span>
                        <span className="font-mono">₹{computationResult.tdsDeducted.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Relief u/s 89:</span>
                        <span className="font-mono">₹{computationResult.relief89.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Tax Payable/(Refund):</span>
                        <span className={`font-mono ${computationResult.taxPayable >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {computationResult.taxPayable >= 0 ? '₹' : '(₹'}
                          {Math.abs(computationResult.taxPayable).toLocaleString('en-IN')}
                          {computationResult.taxPayable < 0 ? ')' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calculator className="mx-auto h-12 w-12 mb-4" />
                    <p>Enter employee details and click "Generate Form 16" to see the preview</p>
                  </div>
                )}
              </CardContent>
              {generatedPdf && (
                <CardFooter>
                  <Button onClick={downloadPdf} className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                </CardFooter>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Form 16 Generation</CardTitle>
              <CardDescription>Select employees and generate Form 16 for multiple employees at once</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Employer Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Financial Year</Label>
                  <Select value={bulkFinancialYear} onValueChange={setBulkFinancialYear}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2023-24">2023-24</SelectItem>
                      <SelectItem value="2024-25">2024-25</SelectItem>
                      <SelectItem value="2025-26">2025-26</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Employer TAN</Label>
                  <Input
                    value={bulkEmployerTan}
                    onChange={(e) => setBulkEmployerTan(e.target.value)}
                    placeholder="Enter TAN"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Employer Name</Label>
                <Input
                  value={bulkEmployerName}
                  onChange={(e) => setBulkEmployerName(e.target.value)}
                  placeholder="Enter employer name"
                />
              </div>

              <Separator />

              {/* Employee Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Select Employees</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEmployees(prev => prev.map(emp => ({ ...emp, selected: true })))}
                  >
                    Select All
                  </Button>
                </div>

                <div className="border rounded-lg max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={employees.every(emp => emp.selected)}
                            onCheckedChange={(checked) =>
                              setEmployees(prev => prev.map(emp => ({ ...emp, selected: !!checked })))
                            }
                          />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>PAN</TableHead>
                        <TableHead>Designation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.map(employee => (
                        <TableRow key={employee.id}>
                          <TableCell>
                            <Checkbox
                              checked={employee.selected || false}
                              onCheckedChange={(checked) =>
                                setEmployees(prev => prev.map(emp =>
                                  emp.id === employee.id ? { ...emp, selected: !!checked } : emp
                                ))
                              }
                            />
                          </TableCell>
                          <TableCell className="font-medium">{employee.name}</TableCell>
                          <TableCell className="font-mono">{employee.pan}</TableCell>
                          <TableCell>{employee.designation}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {bulkResults && (
                <div className="space-y-4">
                  <Separator />
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span>Successful: {bulkResults.summary.successful}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <span>Failed: {bulkResults.summary.failed}</span>
                    </div>
                  </div>

                  {bulkResults.summary.errors.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="font-medium text-red-600">Errors:</h5>
                      {bulkResults.summary.errors.map((error: any, index: number) => (
                        <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                          <strong>{error.employeeId}:</strong> {error.errors.join(', ')}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                onClick={generateBulkForm16}
                disabled={isLoading || employees.filter(e => e.selected).length === 0}
                className="w-full"
              >
                <Users className="mr-2 h-4 w-4" />
                {isLoading ? "Generating..." : `Generate Form 16 for ${employees.filter(e => e.selected).length} Employees`}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

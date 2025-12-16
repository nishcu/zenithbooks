"use client";

import { useState, useRef, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { doc, collection, query, where, getDocs, addDoc, Timestamp } from "firebase/firestore";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  XCircle,
  FileSpreadsheet,
  FileText,
  Plus
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
  aadhar?: string;
  address?: string;
  doj?: Date | string; // Date of Joining
  selected?: boolean;
  status?: string;
  taxRegime?: string;
}

interface Form16Data {
  employeeId: string;
  financialYear: string;
  employerName: string;
  employerTan: string;
  employerPan: string;
  employerAddress: string;
  employerCompanyName: string;
  employeeName: string;
  employeePan: string;
  employeeAadhar: string;
  employeeAddress: string;
  employeeDesignation: string;
  employeeDoj: string; // Date of Joining
  taxRegime: 'OLD' | 'NEW'; // Tax Regime for Form 16 generation
  signatoryName: string;
  signatoryDesignation: string;
  signatoryPlace: string;
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
    section80CCC: number;
    section80CCD1: number;
    section80CCD1B: number;
    section80CCD2: number;
    section80D: number;
    section80DD: number;
    section80DDB: number;
    section80E: number;
    section80EE: number;
    section80EEA: number;
    section80G: number;
    section80GG: number;
    section80GGA: number;
    section80GGC: number;
    section80TTA: number;
    section80TTB: number;
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
    financialYear: "2025-26",
    employerName: userData?.companyName || "",
    employerTan: userData?.tan || "",
    employerPan: userData?.pan || "",
    employerAddress: userData?.address || "",
    employerCompanyName: userData?.companyName || "",
    employeeName: "",
    employeePan: "",
    employeeAadhar: "",
    employeeAddress: "",
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
      section80CCC: 0,
      section80CCD1: 0,
      section80CCD1B: 0,
      section80CCD2: 0,
      section80D: 0,
      section80DD: 0,
      section80DDB: 0,
      section80E: 0,
      section80EE: 0,
      section80EEA: 0,
      section80G: 0,
      section80GG: 0,
      section80GGA: 0,
      section80GGC: 0,
      section80TTA: 0,
      section80TTB: 0
    },
    otherIncome: {
      savingsInterest: 0,
      fdInterest: 0,
      otherIncome: 0
    },
    tdsDetails: {
      totalTdsDeducted: 0,
      relief89: 0
    },
    taxRegime: "NEW"
  });

  const [computationResult, setComputationResult] = useState<Form16Computation | null>(null);
  const [generatedPdf, setGeneratedPdf] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Bulk generation state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [bulkFinancialYear, setBulkFinancialYear] = useState("2025-26");
  const [bulkEmployerName, setBulkEmployerName] = useState(userData?.companyName || "");
  const [bulkEmployerTan, setBulkEmployerTan] = useState(userData?.tan || "");
  const [bulkEmployerPan, setBulkEmployerPan] = useState(userData?.pan || "");
  const [bulkEmployerAddress, setBulkEmployerAddress] = useState(userData?.address || "");
  const [bulkEmployerCompanyName, setBulkEmployerCompanyName] = useState(userData?.companyName || "");
  const [bulkResults, setBulkResults] = useState<any>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [bulkSignatoryName, setBulkSignatoryName] = useState(userData?.name || userData?.companyName || "");
  const [bulkSignatoryDesignation, setBulkSignatoryDesignation] = useState(userData?.designation || "Authorized Signatory");
  const [bulkSignatoryPlace, setBulkSignatoryPlace] = useState(userData?.address?.split(',')[0] || "");

  // Add Employee Dialog State
  const [isAddEmployeeDialogOpen, setIsAddEmployeeDialogOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    pan: "",
    aadhaar: "",
    designation: "",
    address: "",
    doj: new Date().toISOString().split('T')[0],
    employmentType: "permanent" as "permanent" | "contract" | "probation",
    residentialStatus: "resident" as "resident" | "non-resident" | "resident-but-not-ordinarily-resident",
    taxRegime: "NEW" as "OLD" | "NEW"
  });
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);

  // Validation function
  const validateForm16Data = (data: Form16Data): string[] => {
    const errors: string[] = [];

    if (!data.employeeId) {
      errors.push("Please select an employee");
    }

    // Employee details validation
    if (!data.employeeName.trim()) {
      errors.push("Employee name is required");
    }
    if (!data.employeeAddress.trim()) {
      errors.push("Employee address is required");
    }
    if (!data.employeeDesignation.trim()) {
      errors.push("Employee designation is required");
    }
    if (!data.employeeDoj) {
      errors.push("Date of joining is required");
    }
    
    // Signatory details validation
    if (!data.signatoryName.trim()) {
      errors.push("Signatory name is required");
    }
    if (!data.signatoryDesignation.trim()) {
      errors.push("Signatory designation is required");
    }
    if (!data.signatoryPlace.trim()) {
      errors.push("Place of signing is required");
    }

    // PAN format validation (AAAAA0000A)
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(data.employeePan)) {
      errors.push("Employee PAN must be in format AAAAA0000A");
    }

    // Aadhar format validation (12 digits)
    const aadharRegex = /^\d{12}$/;
    if (data.employeeAadhar && !aadharRegex.test(data.employeeAadhar)) {
      errors.push("Aadhar number must be 12 digits");
    }

    // Employer details validation
    if (!data.employerName.trim()) {
      errors.push("Employer name is required");
    }
    if (!data.employerCompanyName.trim()) {
      errors.push("Company name is required");
    }
    if (!data.employerAddress.trim()) {
      errors.push("Employer address is required");
    }

    // Employer PAN validation
    if (!panRegex.test(data.employerPan)) {
      errors.push("Employer PAN must be in format AAAAA0000A");
    }

    // TAN format validation (4 letters + 5 digits + 1 letter, e.g., BLDPS7631C)
    const tanRegex = /^[A-Z]{4}[0-9]{5}[A-Z]{1}$/;
    const tanUpper = data.employerTan.toUpperCase().trim();
    if (!tanRegex.test(tanUpper)) {
      errors.push("Employer TAN must be in format AAAA00000A (4 letters, 5 digits, 1 letter). Example: BLDPS7631C");
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
        ...doc.data(),
        status: doc.data().status || "Active"
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

  const handleAddEmployee = async () => {
    // Validation
    if (!newEmployee.name.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Employee name is required"
      });
      return;
    }

    if (!newEmployee.pan.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Employee PAN is required"
      });
      return;
    }

    // Validate PAN format
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(newEmployee.pan.toUpperCase())) {
      toast({
        variant: "destructive",
        title: "Invalid PAN",
        description: "PAN must be in format ABCDE1234F"
      });
      return;
    }

    // Validate Aadhaar if provided
    if (newEmployee.aadhaar && !/^\d{12}$/.test(newEmployee.aadhaar.replace(/\s/g, ''))) {
      toast({
        variant: "destructive",
        title: "Invalid Aadhaar",
        description: "Aadhaar must be 12 digits"
      });
      return;
    }

    setIsAddingEmployee(true);
    try {
      // Create employee in Firestore
      const employeeData = {
        empId: `EMP-${Date.now()}`,
        name: newEmployee.name.trim(),
        pan: newEmployee.pan.toUpperCase(),
        aadhaar: newEmployee.aadhaar.replace(/\s/g, '') || undefined,
        designation: newEmployee.designation.trim() || "Employee",
        address: newEmployee.address.trim() || "",
        doj: new Date(newEmployee.doj),
        employmentType: newEmployee.employmentType,
        residentialStatus: newEmployee.residentialStatus,
        taxRegime: newEmployee.taxRegime,
        employerId: user!.uid,
        status: "Active",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const employeeRef = await addDoc(collection(db, 'employees'), employeeData);
      
      // Add to local state
      const addedEmployee: Employee = {
        id: employeeRef.id,
        name: employeeData.name,
        pan: employeeData.pan,
        aadhaar: employeeData.aadhaar,
        designation: employeeData.designation,
        address: employeeData.address,
        status: "Active",
        taxRegime: employeeData.taxRegime
      };
      
      setEmployees(prev => [...prev, addedEmployee]);
      
      // Auto-select the newly added employee
      setForm16Data(prev => ({
        ...prev,
        employeeId: employeeRef.id,
        employeeName: employeeData.name,
        employeePan: employeeData.pan,
        employeeAadhar: employeeData.aadhaar || "",
        employeeAddress: employeeData.address
      }));

      // Reset form
      setNewEmployee({
        name: "",
        pan: "",
        aadhaar: "",
        designation: "",
        address: "",
        doj: new Date().toISOString().split('T')[0],
        employmentType: "permanent",
        residentialStatus: "resident",
        taxRegime: "NEW"
      });

      setIsAddEmployeeDialogOpen(false);
      
      toast({
        variant: "default",
        title: "Success",
        description: `${employeeData.name} has been added successfully`
      });
    } catch (error: any) {
      console.error('Error adding employee:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to add employee"
      });
    } finally {
      setIsAddingEmployee(false);
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
      const response = await fetch('/api/form-16/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user!.uid
        },
        body: JSON.stringify({
          employeeId: form16Data.employeeId,
          financialYear: form16Data.financialYear,
          employerName: form16Data.employerName || form16Data.employerCompanyName,
          employerTan: form16Data.employerTan,
          employerPan: form16Data.employerPan,
          employerAddress: form16Data.employerAddress,
          taxRegime: form16Data.taxRegime,
          signatoryName: form16Data.signatoryName,
          signatoryDesignation: form16Data.signatoryDesignation,
          signatoryPlace: form16Data.signatoryPlace,
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
      const response = await fetch('/api/form-16/bulk-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user!.uid
        },
        body: JSON.stringify({
          employeeIds: selectedEmployees.map(emp => emp.id),
          financialYear: bulkFinancialYear,
          employerName: bulkEmployerName,
          employerTan: bulkEmployerTan,
          employerPan: bulkEmployerPan,
          signatoryName: bulkSignatoryName,
          signatoryDesignation: bulkSignatoryDesignation,
          signatoryPlace: bulkSignatoryPlace
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

  const downloadBulkPDFs = async () => {
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
      const response = await fetch('/api/form-16/bulk-download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user!.uid
        },
        body: JSON.stringify({
          employeeIds: selectedEmployees.map(emp => emp.id),
          financialYear: bulkFinancialYear,
          employerName: bulkEmployerName,
          employerTan: bulkEmployerTan,
          employerPan: bulkEmployerPan,
          signatoryName: bulkSignatoryName,
          signatoryDesignation: bulkSignatoryDesignation,
          signatoryPlace: bulkSignatoryPlace
        })
      });

      if (!response.ok) {
        throw new Error('Failed to download bulk PDFs');
      }

      // Get the ZIP file as blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Form16_Bulk_${bulkFinancialYear}_${selectedEmployees.length}_employees.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download Started",
        description: `Downloading ${selectedEmployees.length} Form 16 PDFs as ZIP file`
      });
    } catch (error) {
      console.error('Error downloading bulk PDFs:', error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Failed to download bulk PDFs"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!uploadedFile) {
      toast({
        variant: "destructive",
        title: "No File Selected",
        description: "Please select an Excel or CSV file to upload"
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('financialYear', bulkFinancialYear);
      formData.append('employerName', bulkEmployerName);
      formData.append('employerTan', bulkEmployerTan);
      formData.append('employerPan', bulkEmployerPan);

      const response = await fetch('/api/form-16/bulk-upload', {
        method: 'POST',
        headers: {
          'x-user-id': user!.uid
        },
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        setBulkResults(result.data);
        toast({
          title: "Bulk Upload Complete",
          description: `Processed ${result.data.processed} employees, ${result.data.successful} successful, ${result.data.failed} failed`
        });
      } else {
        toast({
          variant: "destructive",
          title: "Bulk Upload Failed",
          description: result.errors?.join(', ') || "Unknown error"
        });
      }
    } catch (error) {
      console.error('Error in bulk upload:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to upload and process file"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/form-16/sample-template');
      if (!response.ok) {
        throw new Error('Failed to download template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'form16_bulk_upload_template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Template Downloaded",
        description: "Sample template has been downloaded successfully"
      });
    } catch (error) {
      console.error('Error downloading template:', error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Failed to download template"
      });
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ];

      if (!allowedTypes.includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please select an Excel (.xlsx/.xls) or CSV (.csv) file"
        });
        return;
      }

      setUploadedFile(file);
      toast({
        title: "File Selected",
        description: `${file.name} (${(file.size / 1024).toFixed(1)} KB)`
      });
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
                    <div className="flex items-center justify-between">
                      <Label>Select Employee</Label>
                      <Dialog open={isAddEmployeeDialogOpen} onOpenChange={setIsAddEmployeeDialogOpen}>
                        <DialogTrigger asChild>
                          <Button type="button" variant="outline" size="sm" className="gap-2">
                            <Plus className="h-4 w-4" />
                            Add Employee
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Add New Employee</DialogTitle>
                            <DialogDescription>
                              Add a new employee to generate Form 16. All fields marked with * are required.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="emp-name">Employee Name *</Label>
                                <Input
                                  id="emp-name"
                                  value={newEmployee.name}
                                  onChange={(e) => setNewEmployee(prev => ({ ...prev, name: e.target.value }))}
                                  placeholder="Enter employee name"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="emp-pan">PAN *</Label>
                                <Input
                                  id="emp-pan"
                                  value={newEmployee.pan}
                                  onChange={(e) => setNewEmployee(prev => ({ ...prev, pan: e.target.value.toUpperCase() }))}
                                  placeholder="ABCDE1234F"
                                  maxLength={10}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="emp-aadhaar">Aadhaar Number</Label>
                                <Input
                                  id="emp-aadhaar"
                                  value={newEmployee.aadhaar}
                                  onChange={(e) => setNewEmployee(prev => ({ ...prev, aadhaar: e.target.value.replace(/\D/g, '').slice(0, 12) }))}
                                  placeholder="123456789012"
                                  maxLength={12}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="emp-designation">Designation</Label>
                                <Input
                                  id="emp-designation"
                                  value={newEmployee.designation}
                                  onChange={(e) => setNewEmployee(prev => ({ ...prev, designation: e.target.value }))}
                                  placeholder="Employee designation"
                                />
                              </div>
                              <div className="space-y-2 col-span-2">
                                <Label htmlFor="emp-address">Address</Label>
                                <Textarea
                                  id="emp-address"
                                  value={newEmployee.address}
                                  onChange={(e) => setNewEmployee(prev => ({ ...prev, address: e.target.value }))}
                                  placeholder="Enter employee address"
                                  rows={2}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="emp-doj">Date of Joining</Label>
                                <Input
                                  id="emp-doj"
                                  type="date"
                                  value={newEmployee.doj}
                                  onChange={(e) => setNewEmployee(prev => ({ ...prev, doj: e.target.value }))}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="emp-type">Employment Type</Label>
                                <Select
                                  value={newEmployee.employmentType}
                                  onValueChange={(value: "permanent" | "contract" | "probation") => 
                                    setNewEmployee(prev => ({ ...prev, employmentType: value }))
                                  }
                                >
                                  <SelectTrigger id="emp-type">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="permanent">Permanent</SelectItem>
                                    <SelectItem value="contract">Contract</SelectItem>
                                    <SelectItem value="probation">Probation</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="emp-residential">Residential Status</Label>
                                <Select
                                  value={newEmployee.residentialStatus}
                                  onValueChange={(value: "resident" | "non-resident" | "resident-but-not-ordinarily-resident") => 
                                    setNewEmployee(prev => ({ ...prev, residentialStatus: value }))
                                  }
                                >
                                  <SelectTrigger id="emp-residential">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="resident">Resident</SelectItem>
                                    <SelectItem value="non-resident">Non-Resident</SelectItem>
                                    <SelectItem value="resident-but-not-ordinarily-resident">Resident but not Ordinarily Resident</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="emp-regime">Tax Regime</Label>
                                <Select
                                  value={newEmployee.taxRegime}
                                  onValueChange={(value: "OLD" | "NEW") => 
                                    setNewEmployee(prev => ({ ...prev, taxRegime: value }))
                                  }
                                >
                                  <SelectTrigger id="emp-regime">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="OLD">Old Regime</SelectItem>
                                    <SelectItem value="NEW">New Regime</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setIsAddEmployeeDialogOpen(false)}
                              disabled={isAddingEmployee}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              onClick={handleAddEmployee}
                              disabled={isAddingEmployee}
                            >
                              {isAddingEmployee ? "Adding..." : "Add Employee"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <Select
                      value={form16Data.employeeId}
                      onValueChange={(value) => {
                        const employee = employees.find(e => e.id === value);
                        const doj = employee?.doj ? (employee.doj instanceof Date ? employee.doj.toISOString().split('T')[0] : new Date(employee.doj).toISOString().split('T')[0]) : "";
                        setForm16Data(prev => ({
                          ...prev,
                          employeeId: value,
                          employeeName: employee?.name || "",
                          employeePan: employee?.pan || "",
                          employeeAadhar: employee?.aadhar || "",
                          employeeAddress: employee?.address || "",
                          employeeDesignation: employee?.designation || "",
                          employeeDoj: doj,
                          taxRegime: (employee?.taxRegime as 'OLD' | 'NEW') || 'NEW',
                          employerName: employee ? prev.employerName : prev.employerName
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.filter(emp => emp.status === "Active" || !emp.status).map(employee => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.name} - {employee.pan} ({employee.designation || "Employee"})
                          </SelectItem>
                        ))}
                        {employees.filter(emp => emp.status === "Active" || !emp.status).length === 0 && (
                          <SelectItem value="no-employees" disabled>
                            No employees found. Click "Add Employee" to create one.
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                {/* Employee Details */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Employee Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Employee Name</Label>
                      <Input
                        value={form16Data.employeeName}
                        onChange={(e) => setForm16Data(prev => ({ ...prev, employeeName: e.target.value }))}
                        placeholder="Enter employee name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Employee PAN</Label>
                      <Input
                        value={form16Data.employeePan}
                        onChange={(e) => setForm16Data(prev => ({ ...prev, employeePan: e.target.value }))}
                        placeholder="AAAAA0000A"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Aadhar Number</Label>
                      <Input
                        value={form16Data.employeeAadhar}
                        onChange={(e) => setForm16Data(prev => ({ ...prev, employeeAadhar: e.target.value }))}
                        placeholder="1234 5678 9012"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Employee Address</Label>
                      <Textarea
                        value={form16Data.employeeAddress}
                        onChange={(e) => setForm16Data(prev => ({ ...prev, employeeAddress: e.target.value }))}
                        placeholder="Enter complete employee address"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Designation *</Label>
                      <Input
                        value={form16Data.employeeDesignation}
                        onChange={(e) => setForm16Data(prev => ({ ...prev, employeeDesignation: e.target.value }))}
                        placeholder="Enter employee designation"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date of Joining *</Label>
                      <Input
                        type="date"
                        value={form16Data.employeeDoj}
                        onChange={(e) => setForm16Data(prev => ({ ...prev, employeeDoj: e.target.value }))}
                        placeholder="Select date of joining"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tax Regime *</Label>
                      <Select
                        value={form16Data.taxRegime}
                        onValueChange={(value: 'OLD' | 'NEW') => setForm16Data(prev => ({ ...prev, taxRegime: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OLD">Old Tax Regime</SelectItem>
                          <SelectItem value="NEW">New Tax Regime</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Select the tax regime for this Form 16. This overrides the employee's default regime.
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Signatory Details */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Signatory Details</h4>
                  <p className="text-sm text-muted-foreground">
                    Details of the person authorized to sign the Form 16 certificate
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Signatory Name *</Label>
                      <Input
                        value={form16Data.signatoryName}
                        onChange={(e) => setForm16Data(prev => ({ ...prev, signatoryName: e.target.value }))}
                        placeholder="Name of authorized signatory"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Signatory Designation *</Label>
                      <Input
                        value={form16Data.signatoryDesignation}
                        onChange={(e) => setForm16Data(prev => ({ ...prev, signatoryDesignation: e.target.value }))}
                        placeholder="Designation of signatory"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Place *</Label>
                      <Input
                        value={form16Data.signatoryPlace}
                        onChange={(e) => setForm16Data(prev => ({ ...prev, signatoryPlace: e.target.value }))}
                        placeholder="Place of signing"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Employer Details */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Employer Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Company Name</Label>
                      <Input
                        value={form16Data.employerCompanyName}
                        onChange={(e) => setForm16Data(prev => ({ ...prev, employerCompanyName: e.target.value }))}
                        placeholder="Enter company name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Employer PAN</Label>
                      <Input
                        value={form16Data.employerPan}
                        onChange={(e) => setForm16Data(prev => ({ ...prev, employerPan: e.target.value }))}
                        placeholder="AAAAA0000A"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Employer TAN</Label>
                      <Input
                        value={form16Data.employerTan}
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                          setForm16Data(prev => ({ ...prev, employerTan: value }));
                        }}
                        placeholder="BLDPS7631C (4 letters, 5 digits, 1 letter)"
                        maxLength={10}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Employer Name (Display)</Label>
                      <Input
                        value={form16Data.employerName}
                        onChange={(e) => setForm16Data(prev => ({ ...prev, employerName: e.target.value }))}
                        placeholder="Enter employer name for display"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Employer Address</Label>
                    <Textarea
                      value={form16Data.employerAddress}
                      onChange={(e) => setForm16Data(prev => ({ ...prev, employerAddress: e.target.value }))}
                      placeholder="Enter complete employer address"
                      rows={3}
                    />
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
                      <Label>Section 80CCC (Pension funds)</Label>
                      <Input
                        type="number"
                        value={form16Data.deductions80.section80CCC}
                        onChange={(e) => setForm16Data(prev => ({
                          ...prev,
                          deductions80: { ...prev.deductions80, section80CCC: Number(e.target.value) }
                        }))}
                      />
                </div>
                <div className="space-y-2">
                      <Label>Section 80CCD(1) (NPS employee contribution)</Label>
                      <Input
                        type="number"
                        value={form16Data.deductions80.section80CCD1}
                        onChange={(e) => setForm16Data(prev => ({
                          ...prev,
                          deductions80: { ...prev.deductions80, section80CCD1: Number(e.target.value) }
                        }))}
                      />
                </div>
                <div className="space-y-2">
                      <Label>Section 80CCD(2) (NPS employer contribution)</Label>
                      <Input
                        type="number"
                        value={form16Data.deductions80.section80CCD2}
                        onChange={(e) => setForm16Data(prev => ({
                          ...prev,
                          deductions80: { ...prev.deductions80, section80CCD2: Number(e.target.value) }
                        }))}
                      />
                </div>
                <div className="space-y-2">
                      <Label>Section 80DD (Medical treatment of dependent)</Label>
                      <Input
                        type="number"
                        value={form16Data.deductions80.section80DD}
                        onChange={(e) => setForm16Data(prev => ({
                          ...prev,
                          deductions80: { ...prev.deductions80, section80DD: Number(e.target.value) }
                        }))}
                      />
                </div>
                <div className="space-y-2">
                      <Label>Section 80DDB (Medical treatment)</Label>
                      <Input
                        type="number"
                        value={form16Data.deductions80.section80DDB}
                        onChange={(e) => setForm16Data(prev => ({
                          ...prev,
                          deductions80: { ...prev.deductions80, section80DDB: Number(e.target.value) }
                        }))}
                      />
                </div>
                <div className="space-y-2">
                      <Label>Section 80E (Interest on education loan)</Label>
                      <Input
                        type="number"
                        value={form16Data.deductions80.section80E}
                        onChange={(e) => setForm16Data(prev => ({
                          ...prev,
                          deductions80: { ...prev.deductions80, section80E: Number(e.target.value) }
                        }))}
                      />
                </div>
                <div className="space-y-2">
                      <Label>Section 80EE (Interest on home loan)</Label>
                      <Input
                        type="number"
                        value={form16Data.deductions80.section80EE}
                        onChange={(e) => setForm16Data(prev => ({
                          ...prev,
                          deductions80: { ...prev.deductions80, section80EE: Number(e.target.value) }
                        }))}
                      />
                </div>
                <div className="space-y-2">
                      <Label>Section 80EEA (Interest on home loan - affordable housing)</Label>
                      <Input
                        type="number"
                        value={form16Data.deductions80.section80EEA}
                        onChange={(e) => setForm16Data(prev => ({
                          ...prev,
                          deductions80: { ...prev.deductions80, section80EEA: Number(e.target.value) }
                        }))}
                      />
                </div>
                <div className="space-y-2">
                      <Label>Section 80GG (Rent paid)</Label>
                      <Input
                        type="number"
                        value={form16Data.deductions80.section80GG}
                        onChange={(e) => setForm16Data(prev => ({
                          ...prev,
                          deductions80: { ...prev.deductions80, section80GG: Number(e.target.value) }
                        }))}
                      />
                </div>
                <div className="space-y-2">
                      <Label>Section 80GGA (Donations for scientific research)</Label>
                      <Input
                        type="number"
                        value={form16Data.deductions80.section80GGA}
                        onChange={(e) => setForm16Data(prev => ({
                          ...prev,
                          deductions80: { ...prev.deductions80, section80GGA: Number(e.target.value) }
                        }))}
                      />
                </div>
                <div className="space-y-2">
                      <Label>Section 80GGC (Donations to political parties)</Label>
                      <Input
                        type="number"
                        value={form16Data.deductions80.section80GGC}
                        onChange={(e) => setForm16Data(prev => ({
                          ...prev,
                          deductions80: { ...prev.deductions80, section80GGC: Number(e.target.value) }
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
                  <div ref={printRef} className="space-y-4 text-sm">
                    <div className="text-center border-b pb-4">
                      <h3 className="text-lg font-bold">FORM NO. 16 - PART B</h3>
                      <p className="text-sm text-muted-foreground">Annexure - Details of Salary Paid and Tax Deducted</p>
                    </div>

                    {/* Salary Structure Breakdown */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-base">1. Gross Salary Received</h4>
                      <div className="grid grid-cols-2 gap-4 pl-4">
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Basic Salary:</span>
                            <span className="font-mono">₹{form16Data.salaryStructure.basic.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>HRA:</span>
                            <span className="font-mono">₹{form16Data.salaryStructure.hra.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>DA:</span>
                            <span className="font-mono">₹{form16Data.salaryStructure.da.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Special Allowance:</span>
                            <span className="font-mono">₹{form16Data.salaryStructure.specialAllowance.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>LTA:</span>
                            <span className="font-mono">₹{form16Data.salaryStructure.lta.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Bonus:</span>
                            <span className="font-mono">₹{form16Data.salaryStructure.bonus.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Incentives:</span>
                            <span className="font-mono">₹{form16Data.salaryStructure.incentives.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Employer PF:</span>
                            <span className="font-mono">₹{form16Data.salaryStructure.employerPf.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-2">
                        <span>Total Gross Salary:</span>
                        <span className="font-mono">₹{computationResult.grossSalary.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <Separator />

                    {/* Exemptions under Section 10 */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-base">2. Exemptions under Section 10</h4>
                      <div className="space-y-1 pl-4">
                        <div className="flex justify-between text-sm">
                          <span>HRA Exemption:</span>
                          <span className="font-mono">₹{form16Data.exemptions.hraExempt.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>LTA Exemption:</span>
                          <span className="font-mono">₹{form16Data.exemptions.ltaExempt.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Children Education Allowance:</span>
                          <span className="font-mono">₹{form16Data.exemptions.childrenEduAllowance.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Hostel Allowance:</span>
                          <span className="font-mono">₹{form16Data.exemptions.hostelAllowance.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-2">
                        <span>Total Exemptions (Section 10):</span>
                        <span className="font-mono">₹{computationResult.exemptionsSection10.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <Separator />

                    {/* Income from Salary */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-base">3. Income from Salary</h4>
                      <div className="space-y-1 pl-4">
                        <div className="flex justify-between">
                          <span>Gross Salary:</span>
                          <span className="font-mono">₹{computationResult.grossSalary.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Less: Exemptions u/s 10:</span>
                          <span className="font-mono">₹{computationResult.exemptionsSection10.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                      <div className="flex justify-between font-bold text-base border-t pt-2">
                        <span>Income from Salary:</span>
                        <span className="font-mono">₹{computationResult.incomeFromSalary.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <Separator />

                    {/* Other Income */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-base">4. Income from Other Sources</h4>
                      <div className="space-y-1 pl-4">
                        <div className="flex justify-between text-sm">
                          <span>Savings Account Interest:</span>
                          <span className="font-mono">₹{form16Data.otherIncome.savingsInterest.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>FD/RD Interest:</span>
                          <span className="font-mono">₹{form16Data.otherIncome.fdInterest.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Other Income:</span>
                          <span className="font-mono">₹{form16Data.otherIncome.otherIncome.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-2">
                        <span>Total Other Income:</span>
                        <span className="font-mono">₹{computationResult.otherIncome.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <Separator />

                    {/* Gross Total Income */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-base">5. Gross Total Income</h4>
                      <div className="space-y-1 pl-4">
                        <div className="flex justify-between">
                          <span>Income from Salary:</span>
                          <span className="font-mono">₹{computationResult.incomeFromSalary.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Add: Income from Other Sources:</span>
                          <span className="font-mono">₹{computationResult.otherIncome.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                      <div className="flex justify-between font-bold text-base border-t pt-2">
                        <span>Gross Total Income:</span>
                        <span className="font-mono">₹{computationResult.grossTotalIncome.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <Separator />

                    {/* Deductions under Chapter VI-A */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-base">6. Deductions under Chapter VI-A</h4>
                      <div className="space-y-1 pl-4">
                        <div className="flex justify-between text-sm">
                          <span>Section 80C:</span>
                          <span className="font-mono">₹{form16Data.deductions80.section80C.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Section 80CCD(1B):</span>
                          <span className="font-mono">₹{form16Data.deductions80.section80CCD1B.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Section 80D:</span>
                          <span className="font-mono">₹{(form16Data.deductions80.section80D || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Section 80CCC:</span>
                          <span className="font-mono">₹{(form16Data.deductions80.section80CCC || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Section 80CCD(1):</span>
                          <span className="font-mono">₹{(form16Data.deductions80.section80CCD1 || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Section 80CCD(2):</span>
                          <span className="font-mono">₹{(form16Data.deductions80.section80CCD2 || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Section 80DD:</span>
                          <span className="font-mono">₹{(form16Data.deductions80.section80DD || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Section 80DDB:</span>
                          <span className="font-mono">₹{(form16Data.deductions80.section80DDB || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Section 80E:</span>
                          <span className="font-mono">₹{(form16Data.deductions80.section80E || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Section 80EE:</span>
                          <span className="font-mono">₹{(form16Data.deductions80.section80EE || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Section 80EEA:</span>
                          <span className="font-mono">₹{(form16Data.deductions80.section80EEA || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Section 80GG:</span>
                          <span className="font-mono">₹{(form16Data.deductions80.section80GG || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Section 80GGA:</span>
                          <span className="font-mono">₹{(form16Data.deductions80.section80GGA || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Section 80GGC:</span>
                          <span className="font-mono">₹{(form16Data.deductions80.section80GGC || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Section 80TTA:</span>
                          <span className="font-mono">₹{(form16Data.deductions80.section80TTA || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Section 80TTB:</span>
                          <span className="font-mono">₹{(form16Data.deductions80.section80TTB || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Section 80G:</span>
                          <span className="font-mono">₹{(form16Data.deductions80.section80G || 0).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-2">
                        <span>Total Chapter VI-A Deductions:</span>
                        <span className="font-mono">₹{computationResult.deductionsChapterVIA.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <Separator />

                    {/* Total Taxable Income */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-base">7. Total Taxable Income</h4>
                      <div className="space-y-1 pl-4">
                        <div className="flex justify-between">
                          <span>Gross Total Income:</span>
                          <span className="font-mono">₹{computationResult.grossTotalIncome.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Less: Chapter VI-A Deductions:</span>
                          <span className="font-mono">₹{computationResult.deductionsChapterVIA.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2 bg-gray-50 p-2 rounded">
                        <span>Total Taxable Income:</span>
                        <span className="font-mono">₹{computationResult.totalTaxableIncome.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <Separator />

                    {/* Tax Computation */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-base">8. Tax Computation (Tax Regime: {computationResult.taxRegime})</h4>
                      <div className="space-y-1 pl-4">
                        <div className="flex justify-between text-sm">
                          <span>Tax on Total Income:</span>
                          <span className="font-mono">₹{computationResult.taxOnIncome.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Less: Rebate u/s 87A:</span>
                          <span className="font-mono">₹{computationResult.rebate87A.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Add: Health & Education Cess @4%:</span>
                          <span className="font-mono">₹{(computationResult.healthEducationCess || 0).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-2">
                        <span>Total Tax Liability:</span>
                        <span className="font-mono">₹{computationResult.totalTaxLiability.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <Separator />

                    {/* TDS Details */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-base">9. TDS Details</h4>
                      <div className="space-y-1 pl-4">
                        <div className="flex justify-between text-sm">
                          <span>Total TDS Deducted:</span>
                          <span className="font-mono">₹{form16Data.tdsDetails.totalTdsDeducted.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Relief u/s 89:</span>
                          <span className="font-mono">₹{form16Data.tdsDetails.relief89.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-2">
                        <span>Net TDS Credit:</span>
                        <span className="font-mono">₹{(form16Data.tdsDetails.totalTdsDeducted - form16Data.tdsDetails.relief89).toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <Separator />

                    {/* Final Tax Position */}
                    <div className="space-y-2 bg-blue-50 p-3 rounded-lg">
                      <h4 className="font-semibold text-base">10. Final Tax Position</h4>
                      <div className="space-y-1 pl-4">
                        <div className="flex justify-between">
                          <span>Total Tax Liability:</span>
                          <span className="font-mono">₹{computationResult.totalTaxLiability.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>TDS Credit:</span>
                          <span className="font-mono">₹{(form16Data.tdsDetails.totalTdsDeducted - form16Data.tdsDetails.relief89).toLocaleString('en-IN')}</span>
                        </div>
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
          <div className="grid gap-6">
            {/* Bulk Upload Card */}
            <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Bulk Upload from Excel/CSV
                </CardTitle>
                <CardDescription>Upload employee data in Excel or CSV format to generate Form 16 for multiple employees</CardDescription>
            </CardHeader>
              <CardContent className="space-y-6">
                {/* Template Download */}
                <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-8 w-8 text-blue-600" />
                    <div>
                      <h4 className="font-medium">Download Sample Template</h4>
                      <p className="text-sm text-muted-foreground">Excel template with sample data and field descriptions</p>
                    </div>
                  </div>
                  <Button onClick={downloadTemplate} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Download Template
                  </Button>
                </div>

                {/* Employer Details */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Employer Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Financial Year</Label>
                      <Select value={bulkFinancialYear} onValueChange={setBulkFinancialYear}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2025-26">2025-26</SelectItem>
                          <SelectItem value="2024-25">2024-25</SelectItem>
                          <SelectItem value="2023-24">2023-24</SelectItem>
                          <SelectItem value="2022-23">2022-23</SelectItem>
                          <SelectItem value="2021-22">2021-22</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Company Name</Label>
                      <Input
                        value={bulkEmployerCompanyName}
                        onChange={(e) => setBulkEmployerCompanyName(e.target.value)}
                        placeholder="Enter company name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Employer PAN</Label>
                      <Input
                        value={bulkEmployerPan}
                        onChange={(e) => setBulkEmployerPan(e.target.value)}
                        placeholder="AAAAA0000A"
                      />
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Employer Name (Display)</Label>
                      <Input
                        value={bulkEmployerName}
                        onChange={(e) => setBulkEmployerName(e.target.value)}
                        placeholder="Enter employer name for display"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Employer Address</Label>
                      <Textarea
                        value={bulkEmployerAddress}
                        onChange={(e) => setBulkEmployerAddress(e.target.value)}
                        placeholder="Enter complete employer address"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Signatory Details */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Signatory Details</h4>
                  <p className="text-sm text-muted-foreground">
                    Details of the person authorized to sign the Form 16 certificates
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Signatory Name *</Label>
                      <Input
                        value={bulkSignatoryName}
                        onChange={(e) => setBulkSignatoryName(e.target.value)}
                        placeholder="Name of authorized signatory"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Signatory Designation *</Label>
                      <Input
                        value={bulkSignatoryDesignation}
                        onChange={(e) => setBulkSignatoryDesignation(e.target.value)}
                        placeholder="Designation of signatory"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Place *</Label>
                      <Input
                        value={bulkSignatoryPlace}
                        onChange={(e) => setBulkSignatoryPlace(e.target.value)}
                        placeholder="Place of signing"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* File Upload */}
                <div className="space-y-4">
                  <Label>Upload Employee Data File</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                      <FileText className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="mt-4">
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <span className="mt-2 block text-sm font-medium text-gray-900">
                            {uploadedFile ? uploadedFile.name : 'Click to upload or drag and drop'}
                          </span>
                          <span className="mt-1 block text-xs text-gray-500">
                            Excel (.xlsx/.xls) or CSV (.csv) files only
                          </span>
                        </label>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          accept=".xlsx,.xls,.csv"
                          onChange={handleFileChange}
                        />
                      </div>
                    </div>
                  </div>
                  {uploadedFile && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      File selected: {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={handleBulkUpload}
                  disabled={isUploading || !uploadedFile}
                  className="w-full"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {isUploading ? "Processing..." : `Upload & Generate Form 16`}
                </Button>
              </CardFooter>
            </Card>

            {/* Manual Selection Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Manual Employee Selection
                </CardTitle>
                <CardDescription>Select individual employees from your employee list</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Employer Details */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Employer Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Financial Year</Label>
                      <Select value={bulkFinancialYear} onValueChange={setBulkFinancialYear}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2025-26">2025-26</SelectItem>
                          <SelectItem value="2024-25">2024-25</SelectItem>
                          <SelectItem value="2023-24">2023-24</SelectItem>
                          <SelectItem value="2022-23">2022-23</SelectItem>
                          <SelectItem value="2021-22">2021-22</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Company Name</Label>
                      <Input
                        value={bulkEmployerCompanyName}
                        onChange={(e) => setBulkEmployerCompanyName(e.target.value)}
                        placeholder="Enter company name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Employer PAN</Label>
                      <Input
                        value={bulkEmployerPan}
                        onChange={(e) => setBulkEmployerPan(e.target.value)}
                        placeholder="AAAAA0000A"
                      />
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Employer Name (Display)</Label>
                      <Input
                        value={bulkEmployerName}
                        onChange={(e) => setBulkEmployerName(e.target.value)}
                        placeholder="Enter employer name for display"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Employer Address</Label>
                      <Textarea
                        value={bulkEmployerAddress}
                        onChange={(e) => setBulkEmployerAddress(e.target.value)}
                        placeholder="Enter complete employer address"
                        rows={2}
                      />
                    </div>
                  </div>
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
                          <TableHead>Tax Regime</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employees.filter(emp => emp.status === "Active" || !emp.status).map(employee => (
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
                            <TableCell>
                              <Badge variant={employee.taxRegime === "NEW" ? "default" : "secondary"}>
                                {employee.taxRegime}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                {/* Employer Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Financial Year</Label>
                    <Select value={bulkFinancialYear} onValueChange={setBulkFinancialYear}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2025-26">2025-26</SelectItem>
                        <SelectItem value="2024-25">2024-25</SelectItem>
                        <SelectItem value="2023-24">2023-24</SelectItem>
                        <SelectItem value="2022-23">2022-23</SelectItem>
                        <SelectItem value="2021-22">2021-22</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Employer TAN</Label>
                    <Input
                      value={bulkEmployerTan}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                        setBulkEmployerTan(value);
                      }}
                      placeholder="BLDPS7631C (4 letters, 5 digits, 1 letter)"
                      maxLength={10}
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
            <CardFooter className="flex gap-2">
              <Button
                onClick={generateBulkForm16}
                disabled={isLoading || employees.filter(e => e.selected).length === 0}
                className="flex-1"
              >
                <Users className="mr-2 h-4 w-4" />
                {isLoading ? "Generating..." : `Generate Form 16 for ${employees.filter(e => e.selected).length} Employees`}
              </Button>
              {bulkResults && bulkResults.summary && bulkResults.summary.successful > 0 && (
                <Button
                  onClick={downloadBulkPDFs}
                  disabled={isLoading}
                  variant="outline"
                  className="flex-1"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download All PDFs (ZIP)
                </Button>
              )}
            </CardFooter>
        </Card>
      </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

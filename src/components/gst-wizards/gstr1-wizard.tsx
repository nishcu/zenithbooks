

"use client";

import { useState, useContext, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowRight, PlusCircle, Trash2, FileDown, FileJson } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { AccountingContext } from "@/context/accounting-context";
import { db, auth } from "@/lib/firebase";
import { collection, query, where } from "firebase/firestore";
import { useCollection } from 'react-firebase-hooks/firestore';
import { useAuthState } from "react-firebase-hooks/auth";


const states = [
    "01-Jammu & Kashmir", "02-Himachal Pradesh", "03-Punjab", "04-Chandigarh", "05-Uttarakhand", "06-Haryana", "07-Delhi",
    "08-Rajasthan", "09-Uttar Pradesh", "10-Bihar", "11-Sikkim", "12-Arunachal Pradesh", "13-Nagaland", "14-Manipur",
    "15-Mizoram", "16-Tripura", "17-Meghalaya", "18-Assam", "19-West Bengal", "20-Jharkhand", "21-Odisha",
    "22-Chhattisgarh", "23-Madhya Pradesh", "24-Gujarat", "25-Daman & Diu", "26-Dadra & Nagar Haveli",
    "27-Maharashtra", "29-Karnataka", "30-Goa", "31-Lakshadweep", "32-Kerala", "33-Tamil Nadu", "34-Puducherry",
    "35-Andaman & Nicobar Islands", "36-Telangana", "37-Andhra Pradesh", "97-Other Territory"
];

const exportTypes = ["WPAY", "WOPAY"];

type Customer = {
  id: string;
  name: string;
  gstin?: string;
};

export default function Gstr1Wizard() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [user] = useAuthState(auth);

  const { journalVouchers } = useContext(AccountingContext)!;
  const customersQuery = user ? query(collection(db, 'customers'), where("userId", "==", user.uid)) : null;
  const [customersSnapshot] = useCollection(customersQuery);
  const customers: Customer[] = useMemo(() => customersSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)) || [], [customersSnapshot]);

  const b2bInvoicesFromJournal = useMemo(() => {
    return journalVouchers
      .filter(v => v && v.id && v.id.startsWith("INV-"))
      .map(v => {
        const customer = customers.find(c => v.customerId === c.id);
        // B2B invoices must have a GSTIN
        if (!customer?.gstin) return null;

        const taxableValue = v.lines.find(l => l.account === '4010')?.credit || '0';
        const taxAmount = v.lines.find(l => l.account === '2110')?.credit || '0';

        return {
          gstin: customer.gstin,
          invoiceNumber: v.id.replace("INV-", ""),
          invoiceDate: v.date,
          invoiceValue: v.amount,
          taxableValue: parseFloat(taxableValue),
          taxRate: 18, // Assuming 18% for now
          igst: parseFloat(taxAmount),
          cgst: 0,
          sgst: 0,
          cess: 0,
        };
      }).filter(Boolean); // remove nulls
  }, [journalVouchers, customers]);

  const [b2bInvoices, setB2bInvoices] = useState<any[]>([]);
  const [b2cLargeInvoices, setB2cLargeInvoices] = useState<any[]>([]);
  const [exportInvoices, setExportInvoices] = useState<any[]>([]);
  const [b2cOther, setB2cOther] = useState<any[]>([]);
  const [nilRated, setNilRated] = useState<any[]>([]);
  const [documentsIssued, setDocumentsIssued] = useState<any[]>([]);
  const [advancesReceived, setAdvancesReceived] = useState<any[]>([]);
  const [advancesAdjusted, setAdvancesAdjusted] = useState<any[]>([]);

  useEffect(() => {
    setB2bInvoices(b2bInvoicesFromJournal as any[]);
  }, [b2bInvoicesFromJournal]);


  const handleInvoiceChange = (index: number, field: keyof typeof b2bInvoices[0], value: string | number) => {
    const newInvoices = [...b2bInvoices];
    (newInvoices[index] as any)[field] = value;
    setB2bInvoices(newInvoices);
  };
  
  const handleAddInvoice = () => {
    setB2bInvoices([
        ...b2bInvoices,
        {
            gstin: "",
            invoiceNumber: "",
            invoiceDate: "",
            invoiceValue: 0,
            taxableValue: 0,
            taxRate: 18,
            igst: 0,
            cgst: 0,
            sgst: 0,
            cess: 0,
        }
    ]);
  }
  
  const handleRemoveInvoice = (index: number) => {
    const newInvoices = [...b2bInvoices];
    newInvoices.splice(index, 1);
    setB2bInvoices(newInvoices);
  }
  
  const handleB2cLargeChange = (index: number, field: string, value: string | number) => {
    const newInvoices = [...b2cLargeInvoices];
    (newInvoices[index] as any)[field] = value;
    setB2cLargeInvoices(newInvoices);
  };
  const handleAddB2cLarge = () => {
    setB2cLargeInvoices([...b2cLargeInvoices, { pos: "", invoiceNumber: "", invoiceDate: "", invoiceValue: 0, taxableValue: 0, taxRate: 18, igst: 0, cess: 0 }]);
  }
  const handleRemoveB2cLarge = (index: number) => {
    const newInvoices = [...b2cLargeInvoices];
    newInvoices.splice(index, 1);
    setB2cLargeInvoices(newInvoices);
  }

  const handleExportChange = (index: number, field: string, value: string | number) => {
    const newInvoices = [...exportInvoices];
    (newInvoices[index] as any)[field] = value;
    setExportInvoices(newInvoices);
  };
  const handleAddExport = () => {
    setExportInvoices([...exportInvoices, { exportType: "WPAY", invoiceNumber: "", invoiceDate: "", invoiceValue: 0, portCode: "", shippingBillNumber: "", shippingBillDate: "", taxableValue: 0, taxRate: 18, igst: 0, cess: 0 }]);
  }
  const handleRemoveExport = (index: number) => {
    const newInvoices = [...exportInvoices];
    newInvoices.splice(index, 1);
    setExportInvoices(newInvoices);
  }

  const handleB2cOtherChange = (index: number, field: string, value: string | number) => {
    const newRows = [...b2cOther];
    (newRows[index] as any)[field] = value;
    setB2cOther(newRows);
  };
  const handleAddB2cOther = () => {
    setB2cOther([...b2cOther, { pos: "", taxableValue: 0, taxRate: 18, igst: 0, cgst: 0, sgst: 0, cess: 0 }]);
  }
  const handleRemoveB2cOther = (index: number) => {
    const newRows = [...b2cOther];
    newRows.splice(index, 1);
    setB2cOther(newRows);
  }

  const handleNilRatedChange = (index: number, field: string, value: string | number) => {
    const newRows = [...nilRated];
    (newRows[index] as any)[field] = value;
    setNilRated(newRows);
  };

  const handleDocumentsIssuedChange = (index: number, field: keyof typeof documentsIssued[0], value: string | number) => {
    const newRows = [...documentsIssued];
    (newRows[index] as any)[field] = value;
    setDocumentsIssued(newRows);
  };

  const handleAddDocumentsIssued = () => {
    setDocumentsIssued([...documentsIssued, { type: "", from: "", to: "", total: 0, cancelled: 0 }]);
  };

  const handleRemoveDocumentsIssued = (index: number) => {
    const newRows = [...documentsIssued];
    newRows.splice(index, 1);
    setDocumentsIssued(newRows);
  };

  const handleAdvanceChange = (index: number, type: 'received' | 'adjusted', field: string, value: any) => {
    if (type === 'received') {
        const newAdvances = [...advancesReceived];
        (newAdvances[index] as any)[field] = value;
        setAdvancesReceived(newAdvances);
    } else {
        const newAdjusted = [...advancesAdjusted];
        (newAdjusted[index] as any)[field] = value;
        setAdvancesAdjusted(newAdjusted);
    }
  };
  
  const addAdvanceRow = (type: 'received' | 'adjusted') => {
      if (type === 'received') {
          setAdvancesReceived([...advancesReceived, { pos: "", taxRate: 18, grossAdvance: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 }]);
      } else {
          setAdvancesAdjusted([...advancesAdjusted, { pos: "", taxRate: 18, grossAdvanceAdjusted: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 }]);
      }
  };

  const removeAdvanceRow = (index: number, type: 'received' | 'adjusted') => {
      if (type === 'received') {
          const newAdvances = [...advancesReceived];
          newAdvances.splice(index, 1);
          setAdvancesReceived(newAdvances);
      } else {
          const newAdjusted = [...advancesAdjusted];
          newAdjusted.splice(index, 1);
          setAdvancesAdjusted(newAdjusted);
      }
  };


  const handleNext = () => {
    toast({
      title: `Step ${step} Saved!`,
      description: `Moving to the next step.`,
    });
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleGenerateAction = (type: 'JSON' | 'PDF') => {
    toast({
      title: `${type} Generation Started`,
      description: `Your GSTR-1 ${type} file is being generated and will be downloaded shortly. (This is a simulation).`,
    });
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Step 1: B2B Invoices (Table 4)</CardTitle>
              <CardDescription>
                Review supplies made to registered persons (B2B).
                Data is auto-populated from your sales. Review and adjust.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient GSTIN</TableHead>
                    <TableHead>Invoice No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">Taxable Value</TableHead>
                    <TableHead className="text-right">Rate (%)</TableHead>
                    <TableHead className="text-right">IGST</TableHead>
                    <TableHead className="text-right">CGST</TableHead>
                    <TableHead className="text-right">SGST</TableHead>
                    <TableHead className="text-right">Cess</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {b2bInvoices.map((invoice, index) => (
                    <TableRow key={index}>
                      <TableCell><Input value={invoice.gstin} onChange={(e) => handleInvoiceChange(index, 'gstin', e.target.value)} /></TableCell>
                      <TableCell><Input value={invoice.invoiceNumber} onChange={(e) => handleInvoiceChange(index, 'invoiceNumber', e.target.value)} /></TableCell>
                      <TableCell><Input type="date" value={invoice.invoiceDate} onChange={(e) => handleInvoiceChange(index, 'invoiceDate', e.target.value)} /></TableCell>
                      <TableCell><Input type="number" className="text-right" value={invoice.invoiceValue} onChange={(e) => handleInvoiceChange(index, 'invoiceValue', parseFloat(e.target.value))} /></TableCell>
                      <TableCell><Input type="number" className="text-right" value={invoice.taxableValue} onChange={(e) => handleInvoiceChange(index, 'taxableValue', parseFloat(e.target.value))} /></TableCell>
                      <TableCell><Input type="number" className="text-right" value={invoice.taxRate} onChange={(e) => handleInvoiceChange(index, 'taxRate', parseFloat(e.target.value))} /></TableCell>
                      <TableCell><Input type="number" className="text-right" value={invoice.igst} onChange={(e) => handleInvoiceChange(index, 'igst', parseFloat(e.target.value))} /></TableCell>
                      <TableCell><Input type="number" className="text-right" value={invoice.cgst} onChange={(e) => handleInvoiceChange(index, 'cgst', parseFloat(e.target.value))} /></TableCell>
                      <TableCell><Input type="number" className="text-right" value={invoice.sgst} onChange={(e) => handleInvoiceChange(index, 'sgst', parseFloat(e.target.value))} /></TableCell>
                      <TableCell><Input type="number" className="text-right" value={invoice.cess} onChange={(e) => handleInvoiceChange(index, 'cess', parseFloat(e.target.value))} /></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveInvoice(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button variant="outline" size="sm" className="mt-4" onClick={handleAddInvoice}>
                <PlusCircle className="mr-2 h-4 w-4"/> Add Invoice
              </Button>
            </CardContent>
            <CardFooter className="flex justify-end">
                <Button onClick={handleNext}>
                    Save & Continue
                    <ArrowRight className="ml-2" />
                </Button>
            </CardFooter>
          </Card>
        );
      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Step 2: B2C (Large) Invoices (Table 5)</CardTitle>
              <CardDescription>
                Inter-state supplies to unregistered persons where invoice value is more than ₹2.5 lakh.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Place Of Supply</TableHead>
                    <TableHead>Invoice No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">Taxable Value</TableHead>
                    <TableHead className="text-right">Rate (%)</TableHead>
                    <TableHead className="text-right">IGST</TableHead>
                    <TableHead className="text-right">Cess</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {b2cLargeInvoices.map((invoice, index) => (
                    <TableRow key={index}>
                        <TableCell>
                            <Select value={invoice.pos} onValueChange={(value) => handleB2cLargeChange(index, 'pos', value)}>
                                <SelectTrigger><SelectValue placeholder="Select State"/></SelectTrigger>
                                <SelectContent>{states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                        </TableCell>
                        <TableCell><Input value={invoice.invoiceNumber} onChange={(e) => handleB2cLargeChange(index, 'invoiceNumber', e.target.value)} /></TableCell>
                        <TableCell><Input type="date" value={invoice.invoiceDate} onChange={(e) => handleB2cLargeChange(index, 'invoiceDate', e.target.value)} /></TableCell>
                        <TableCell><Input type="number" className="text-right" value={invoice.invoiceValue} onChange={(e) => handleB2cLargeChange(index, 'invoiceValue', parseFloat(e.target.value))} /></TableCell>
                        <TableCell><Input type="number" className="text-right" value={invoice.taxableValue} onChange={(e) => handleB2cLargeChange(index, 'taxableValue', parseFloat(e.target.value))} /></TableCell>
                        <TableCell><Input type="number" className="text-right" value={invoice.taxRate} onChange={(e) => handleB2cLargeChange(index, 'taxRate', parseFloat(e.target.value))} /></TableCell>
                        <TableCell><Input type="number" className="text-right" value={invoice.igst} onChange={(e) => handleB2cLargeChange(index, 'igst', parseFloat(e.target.value))} /></TableCell>
                        <TableCell><Input type="number" className="text-right" value={invoice.cess} onChange={(e) => handleB2cLargeChange(index, 'cess', parseFloat(e.target.value))} /></TableCell>
                        <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveB2cLarge(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
               <Button variant="outline" size="sm" className="mt-4" onClick={handleAddB2cLarge}>
                <PlusCircle className="mr-2 h-4 w-4"/> Add Invoice
              </Button>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="mr-2" /> Back
              </Button>
              <Button onClick={handleNext}>
                  Save & Continue
                  <ArrowRight className="ml-2" />
              </Button>
            </CardFooter>
          </Card>
        );
      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Export Invoices (Table 6)</CardTitle>
              <CardDescription>
                Details of zero-rated supplies (exports) and deemed exports.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Export Type</TableHead>
                    <TableHead>Invoice No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Port Code</TableHead>
                    <TableHead>Shipping Bill No.</TableHead>
                    <TableHead>Shipping Bill Date</TableHead>
                    <TableHead className="text-right">Taxable Value</TableHead>
                    <TableHead className="text-right">Rate (%)</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exportInvoices.map((invoice, index) => (
                    <TableRow key={index}>
                        <TableCell>
                            <Select value={invoice.exportType} onValueChange={(value) => handleExportChange(index, 'exportType', value)}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>{exportTypes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                        </TableCell>
                        <TableCell><Input value={invoice.invoiceNumber} onChange={(e) => handleExportChange(index, 'invoiceNumber', e.target.value)} /></TableCell>
                        <TableCell><Input type="date" value={invoice.invoiceDate} onChange={(e) => handleExportChange(index, 'invoiceDate', e.target.value)} /></TableCell>
                        <TableCell><Input type="number" className="text-right" value={invoice.invoiceValue} onChange={(e) => handleExportChange(index, 'invoiceValue', parseFloat(e.target.value))} /></TableCell>
                        <TableCell><Input value={invoice.portCode} onChange={(e) => handleExportChange(index, 'portCode', e.target.value)} /></TableCell>
                        <TableCell><Input value={invoice.shippingBillNumber} onChange={(e) => handleExportChange(index, 'shippingBillNumber', e.target.value)} /></TableCell>
                        <TableCell><Input type="date" value={invoice.shippingBillDate} onChange={(e) => handleExportChange(index, 'shippingBillDate', e.target.value)} /></TableCell>
                        <TableCell><Input type="number" className="text-right" value={invoice.taxableValue} onChange={(e) => handleExportChange(index, 'taxableValue', parseFloat(e.target.value))} /></TableCell>
                        <TableCell><Input type="number" className="text-right" value={invoice.taxRate} onChange={(e) => handleExportChange(index, 'taxRate', parseFloat(e.target.value))} /></TableCell>
                        <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveExport(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
               <Button variant="outline" size="sm" className="mt-4" onClick={handleAddExport}>
                <PlusCircle className="mr-2 h-4 w-4"/> Add Export Invoice
              </Button>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="mr-2" /> Back
              </Button>
              <Button onClick={handleNext}>
                  Save & Continue
                  <ArrowRight className="ml-2" />
              </Button>
            </CardFooter>
          </Card>
        );
    case 4:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Step 4: B2C (Others) (Table 7)</CardTitle>
              <CardDescription>
                Consolidated details of B2C supplies (intra-state and inter-state up to ₹2.5 lakh).
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Place Of Supply</TableHead>
                    <TableHead className="text-right">Taxable Value</TableHead>
                    <TableHead className="text-right">Rate (%)</TableHead>
                    <TableHead className="text-right">IGST</TableHead>
                    <TableHead className="text-right">CGST</TableHead>
                    <TableHead className="text-right">SGST</TableHead>
                    <TableHead className="text-right">Cess</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {b2cOther.map((row, index) => (
                    <TableRow key={index}>
                        <TableCell>
                            <Select value={row.pos} onValueChange={(value) => handleB2cOtherChange(index, 'pos', value)}>
                                <SelectTrigger><SelectValue placeholder="Select State"/></SelectTrigger>
                                <SelectContent>{states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                        </TableCell>
                        <TableCell><Input type="number" className="text-right" value={row.taxableValue} onChange={(e) => handleB2cOtherChange(index, 'taxableValue', parseFloat(e.target.value))} /></TableCell>
                        <TableCell><Input type="number" className="text-right" value={row.taxRate} onChange={(e) => handleB2cOtherChange(index, 'taxRate', parseFloat(e.target.value))} /></TableCell>
                        <TableCell><Input type="number" className="text-right" value={row.igst} onChange={(e) => handleB2cOtherChange(index, 'igst', parseFloat(e.target.value))} /></TableCell>
                        <TableCell><Input type="number" className="text-right" value={row.cgst} onChange={(e) => handleB2cOtherChange(index, 'cgst', parseFloat(e.target.value))} /></TableCell>
                        <TableCell><Input type="number" className="text-right" value={row.sgst} onChange={(e) => handleB2cOtherChange(index, 'sgst', parseFloat(e.target.value))} /></TableCell>
                        <TableCell><Input type="number" className="text-right" value={row.cess} onChange={(e) => handleB2cOtherChange(index, 'cess', parseFloat(e.target.value))} /></TableCell>
                        <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveB2cOther(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
               <Button variant="outline" size="sm" className="mt-4" onClick={handleAddB2cOther}>
                <PlusCircle className="mr-2 h-4 w-4"/> Add Summary Row
              </Button>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="mr-2" /> Back
              </Button>
              <Button onClick={handleNext}>
                  Save & Continue
                  <ArrowRight className="ml-2" />
              </Button>
            </CardFooter>
          </Card>
        );
    case 5:
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Step 5: Nil Rated, Exempted, and Non-GST Supplies (Table 8)</CardTitle>
                    <CardDescription>
                        Consolidated details of supplies that are nil rated, exempted, or not covered under GST.
                    </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-1/2">Description</TableHead>
                                <TableHead className="text-right">Nil Rated Supplies</TableHead>
                                <TableHead className="text-right">Exempted Supplies</TableHead>
                                <TableHead className="text-right">Non-GST Supplies</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {nilRated.map((row, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{row.description}</TableCell>
                                    <TableCell>
                                        <Input type="number" className="text-right" value={row.nilRated} onChange={(e) => handleNilRatedChange(index, 'nilRated', parseFloat(e.target.value))} />
                                    </TableCell>
                                    <TableCell>
                                        <Input type="number" className="text-right" value={row.exempted} onChange={(e) => handleNilRatedChange(index, 'exempted', parseFloat(e.target.value))} />
                                    </TableCell>
                                    <TableCell>
                                        <Input type="number" className="text-right" value={row.nonGst} onChange={(e) => handleNilRatedChange(index, 'nonGst', parseFloat(e.target.value))} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={handleBack}>
                        <ArrowLeft className="mr-2" /> Back
                    </Button>
                    <Button onClick={handleNext}>
                        Save & Continue
                        <ArrowRight className="ml-2" />
                    </Button>
                </CardFooter>
            </Card>
        );
    case 6:
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Step 6: Amendments to Outward Supplies (Table 9)</CardTitle>
                    <CardDescription>
                        Report amendments to details of taxable outward supplies furnished in returns for earlier tax periods. Select the original month to see invoices to amend.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="b2ba">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="b2ba">B2B (9A)</TabsTrigger>
                            <TabsTrigger value="b2cla">B2C (Large) (9A)</TabsTrigger>
                            <TabsTrigger value="cdra">Credit/Debit Notes (9C)</TabsTrigger>
                        </TabsList>
                        <TabsContent value="b2ba" className="pt-4">
                           <div className="p-4 border rounded-lg space-y-4">
                                <h3 className="font-medium">Amend B2B Invoice</h3>
                                <div className="grid md:grid-cols-3 gap-4">
                                    <div><Label>Original Month</Label><Input type="month" defaultValue="2024-04" /></div>
                                    <div><Label>Original Invoice No.</Label><Input placeholder="INV-OLD-001"/></div>
                                    <div><Label>Original Invoice Date</Label><Input type="date"/></div>
                                </div>
                                 <div className="grid md:grid-cols-3 gap-4 pt-4">
                                    <div><Label>Revised Invoice No.</Label><Input placeholder="INV-OLD-001-R1"/></div>
                                    <div><Label>Revised Invoice Date</Label><Input type="date"/></div>
                                    <div><Label>Revised Value</Label><Input type="number" placeholder="0.00"/></div>
                                </div>
                                <div className="flex justify-end">
                                    <Button size="sm">Add B2B Amendment</Button>
                                </div>
                           </div>
                        </TabsContent>
                         <TabsContent value="b2cla" className="pt-4">
                           <div className="p-4 border rounded-lg space-y-4">
                                <h3 className="font-medium">Amend B2C (Large) Invoice</h3>
                                <div className="grid md:grid-cols-3 gap-4">
                                    <div><Label>Original Month</Label><Input type="month" defaultValue="2024-04" /></div>
                                    <div><Label>Original Invoice No.</Label><Input placeholder="INV-BCL-OLD-01"/></div>
                                    <div><Label>Original Place of Supply</Label><Select><SelectTrigger><SelectValue placeholder="Select State" /></SelectTrigger><SelectContent>{states.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                                </div>
                                <div className="flex justify-end">
                                    <Button size="sm" variant="secondary">Fetch Details to Amend</Button>
                                </div>
                           </div>
                        </TabsContent>
                         <TabsContent value="cdra" className="pt-4">
                           <div className="p-4 border rounded-lg space-y-4">
                                <h3 className="font-medium">Amend Credit/Debit Note (Registered)</h3>
                                <div className="grid md:grid-cols-3 gap-4">
                                    <div><Label>Original Month</Label><Input type="month" defaultValue="2024-04" /></div>
                                    <div><Label>Original Note No.</Label><Input placeholder="CN-OLD-01"/></div>
                                    <div><Label>Original Note Date</Label><Input type="date"/></div>
                                </div>
                                <div className="flex justify-end">
                                    <Button size="sm">Add Note Amendment</Button>
                                </div>
                           </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={handleBack}>
                        <ArrowLeft className="mr-2" /> Back
                    </Button>
                    <Button onClick={handleNext}>
                        Save & Continue
                        <ArrowRight className="ml-2" />
                    </Button>
                </CardFooter>
            </Card>
        );
      case 7:
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Step 7: Amendments to B2C (Others) (Table 10)</CardTitle>
                    <CardDescription>
                        Report amendments to taxable outward supplies to unregistered persons from earlier tax periods.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="p-4 border rounded-lg space-y-4">
                        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <Label>Original Month</Label>
                                <Input type="month" defaultValue="2024-04" />
                            </div>
                            <div>
                                <Label>Place of Supply</Label>
                                <Select><SelectTrigger><SelectValue placeholder="Select State" /></SelectTrigger><SelectContent>{states.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                            </div>
                             <div>
                                <Label>Tax Rate (%)</Label>
                                <Input type="number" placeholder="18"/>
                            </div>
                        </div>
                        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                             <div>
                                <Label>Revised Taxable Value</Label>
                                <Input type="number" placeholder="0.00"/>
                            </div>
                            <div>
                                <Label>Revised IGST</Label>
                                <Input type="number" placeholder="0.00"/>
                            </div>
                            <div>
                                <Label>Revised CGST</Label>
                                <Input type="number" placeholder="0.00"/>
                            </div>
                            <div>
                                <Label>Revised SGST</Label>
                                <Input type="number" placeholder="0.00"/>
                            </div>
                        </div>
                        <div className="flex justify-end pt-2">
                           <Button size="sm">Add B2C Amendment</Button>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={handleBack}>
                        <ArrowLeft className="mr-2" /> Back
                    </Button>
                    <Button onClick={handleNext}>
                        Save & Continue
                        <ArrowRight className="ml-2" />
                    </Button>
                </CardFooter>
            </Card>
        );
      case 8:
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Step 8: Advances Received/Adjusted (Table 11)</CardTitle>
                    <CardDescription>
                        Consolidated statement of advances received, advances adjusted, and amendments.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Part I: Advances Received</h3>
                        <Table>
                            <TableHeader><TableRow>
                                <TableHead>Place of Supply</TableHead>
                                <TableHead>Tax Rate</TableHead>
                                <TableHead className="text-right">Gross Advance Received</TableHead>
                                <TableHead className="text-right">IGST</TableHead>
                                <TableHead className="text-right">CGST</TableHead>
                                <TableHead className="text-right">SGST</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                                {advancesReceived.map((row, index) => (
                                <TableRow key={index}>
                                    <TableCell><Select value={row.pos} onValueChange={v => handleAdvanceChange(index, 'received', 'pos', v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{states.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></TableCell>
                                    <TableCell><Input type="number" value={row.taxRate} onChange={e => handleAdvanceChange(index, 'received', 'taxRate', parseFloat(e.target.value))}/></TableCell>
                                    <TableCell><Input type="number" className="text-right" value={row.grossAdvance} onChange={e => handleAdvanceChange(index, 'received', 'grossAdvance', parseFloat(e.target.value))}/></TableCell>
                                    <TableCell><Input type="number" className="text-right" value={row.igst} onChange={e => handleAdvanceChange(index, 'received', 'igst', parseFloat(e.target.value))}/></TableCell>
                                    <TableCell><Input type="number" className="text-right" value={row.cgst} onChange={e => handleAdvanceChange(index, 'received', 'cgst', parseFloat(e.target.value))}/></TableCell>
                                    <TableCell><Input type="number" className="text-right" value={row.sgst} onChange={e => handleAdvanceChange(index, 'received', 'sgst', parseFloat(e.target.value))}/></TableCell>
                                    <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => removeAdvanceRow(index, 'received')}><Trash2 className="h-4 w-4 text-destructive"/></Button></TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                         <Button variant="outline" size="sm" className="mt-4" onClick={() => addAdvanceRow('received')}><PlusCircle className="mr-2"/>Add Advance Received</Button>
                    </div>
                     <div>
                        <h3 className="text-lg font-semibold mb-2">Part II: Advances Adjusted</h3>
                         <Table>
                            <TableHeader><TableRow>
                                <TableHead>Place of Supply</TableHead>
                                <TableHead>Tax Rate</TableHead>
                                <TableHead className="text-right">Gross Advance Adjusted</TableHead>
                                <TableHead className="text-right">IGST</TableHead>
                                <TableHead className="text-right">CGST</TableHead>
                                <TableHead className="text-right">SGST</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                                {advancesAdjusted.map((row, index) => (
                                <TableRow key={index}>
                                    <TableCell><Select value={row.pos} onValueChange={v => handleAdvanceChange(index, 'adjusted', 'pos', v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{states.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></TableCell>
                                    <TableCell><Input type="number" value={row.taxRate} onChange={e => handleAdvanceChange(index, 'adjusted', 'taxRate', parseFloat(e.target.value))}/></TableCell>
                                    <TableCell><Input type="number" className="text-right" value={row.grossAdvanceAdjusted} onChange={e => handleAdvanceChange(index, 'adjusted', 'grossAdvanceAdjusted', parseFloat(e.target.value))}/></TableCell>
                                    <TableCell><Input type="number" className="text-right" value={row.igst} onChange={e => handleAdvanceChange(index, 'adjusted', 'igst', parseFloat(e.target.value))}/></TableCell>
                                    <TableCell><Input type="number" className="text-right" value={row.cgst} onChange={e => handleAdvanceChange(index, 'adjusted', 'cgst', parseFloat(e.target.value))}/></TableCell>
                                    <TableCell><Input type="number" className="text-right" value={row.sgst} onChange={e => handleAdvanceChange(index, 'adjusted', 'sgst', parseFloat(e.target.value))}/></TableCell>
                                    <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => removeAdvanceRow(index, 'adjusted')}><Trash2 className="h-4 w-4 text-destructive"/></Button></TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                         <Button variant="outline" size="sm" className="mt-4" onClick={() => addAdvanceRow('adjusted')}><PlusCircle className="mr-2"/>Add Advance Adjusted</Button>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={handleBack}>
                        <ArrowLeft className="mr-2" /> Back
                    </Button>
                    <Button onClick={handleNext}>
                        Save & Continue
                        <ArrowRight className="ml-2" />
                    </Button>
                </CardFooter>
            </Card>
        );
      case 9:
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Step 9: HSN-wise Summary of Outward Supplies (Table 12)</CardTitle>
                    <CardDescription>
                        A summary of supplies reported in this return, categorized by HSN/SAC code.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="default">
                        <AlertTitle>Auto-Generated Summary</AlertTitle>
                        <AlertDescription>
                            This table would be automatically populated based on the items you've sold in your invoices.
                        </AlertDescription>
                    </Alert>
                    <Table className="mt-4">
                        <TableHeader>
                            <TableRow>
                                <TableHead>HSN</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>UQC</TableHead>
                                <TableHead className="text-right">Total Quantity</TableHead>
                                <TableHead className="text-right">Total Value</TableHead>
                                <TableHead className="text-right">Taxable Value</TableHead>
                                <TableHead className="text-right">IGST</TableHead>
                                <TableHead className="text-right">CGST</TableHead>
                                <TableHead className="text-right">SGST</TableHead>
                                <TableHead className="text-right">Cess</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                           
                        </TableBody>
                    </Table>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={handleBack}>
                        <ArrowLeft className="mr-2" /> Back
                    </Button>
                    <Button onClick={handleNext}>
                        Save & Continue
                        <ArrowRight className="ml-2" />
                    </Button>
                </CardFooter>
            </Card>
        );
      case 10:
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Step 10: Documents Issued (Table 13)</CardTitle>
                    <CardDescription>
                        Summary of documents issued during the tax period.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="default">
                        <AlertTitle>Auto-Generated Summary</AlertTitle>
                        <AlertDescription>
                            This table is automatically populated based on the documents you've created in GSTEase (invoices, credit notes, etc.). Review the summary below.
                        </AlertDescription>
                    </Alert>
                    <Table className="mt-4">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Document Type</TableHead>
                                <TableHead>Sr. No. From</TableHead>
                                <TableHead>Sr. No. To</TableHead>
                                <TableHead className="text-right">Total Number</TableHead>
                                <TableHead className="text-right">Cancelled</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {documentsIssued.map((doc, index) => (
                                <TableRow key={index}>
                                    <TableCell>
                                         <Input value={doc.type} onChange={(e) => handleDocumentsIssuedChange(index, 'type', e.target.value)} />
                                    </TableCell>
                                     <TableCell>
                                         <Input value={doc.from} onChange={(e) => handleDocumentsIssuedChange(index, 'from', e.target.value)} />
                                    </TableCell>
                                    <TableCell>
                                         <Input value={doc.to} onChange={(e) => handleDocumentsIssuedChange(index, 'to', e.target.value)} />
                                    </TableCell>
                                    <TableCell>
                                         <Input type="number" className="text-right" value={doc.total} onChange={(e) => handleDocumentsIssuedChange(index, 'total', parseInt(e.target.value))} />
                                    </TableCell>
                                    <TableCell>
                                         <Input type="number" className="text-right" value={doc.cancelled} onChange={(e) => handleDocumentsIssuedChange(index, 'cancelled', parseInt(e.target.value))} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveDocumentsIssued(index)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                     <Button variant="outline" size="sm" className="mt-4" onClick={handleAddDocumentsIssued}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Add Document Series
                    </Button>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={handleBack}>
                        <ArrowLeft className="mr-2" /> Back
                    </Button>
                    <Button onClick={handleNext}>
                        Save & Continue
                        <ArrowRight className="ml-2" />
                    </Button>
                </CardFooter>
            </Card>
        );
      default:
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Wizard Complete</CardTitle>
                    <CardDescription>You have finished preparing your GSTR-1 return.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="mb-4">You have completed all the data entry steps for your GSTR-1 return. The next step is to generate the files for uploading to the GST portal and for your records.</p>
                    <Alert>
                        <AlertTitle>Final Check</AlertTitle>
                        <AlertDescription>
                            Please ensure all data is accurate before generating the final files. You can go back to any step to review or make changes.
                        </AlertDescription>
                    </Alert>
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                    <Button variant="outline" onClick={handleBack}>
                        <ArrowLeft className="mr-2" /> Back
                    </Button>
                    <div className="flex gap-2">
                        <Button onClick={() => handleGenerateAction('JSON')}>
                           <FileJson className="mr-2" />
                           Generate GSTR-1 JSON
                        </Button>
                         <Button variant="outline" onClick={() => handleGenerateAction('PDF')}>
                           <FileDown className="mr-2" />
                           Download GSTR-1 PDF
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        );
    }
  }

  return (
    <div className="space-y-8">
       <div className="flex items-center justify-between">
        <Link href="/gst-filings" passHref>
          <Button variant="outline">
            <ArrowLeft className="mr-2" />
            Back to GST Filings
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">GSTR-1 Filing Wizard</h1>
          <p className="text-muted-foreground">Period: May 2024</p>
        </div>

      </div>

      {renderStep()}
    </div>
  );
}

    
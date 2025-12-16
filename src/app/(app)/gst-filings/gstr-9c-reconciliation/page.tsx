
"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Wand2, Upload, GitCompareArrows, Loader2, ArrowLeft, FileDown, FileSpreadsheet, FileJson } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { ShareButtons } from "@/components/documents/share-buttons";
import { format } from "date-fns";
import html2pdf from "html2pdf.js";
import { useAuthState } from "react-firebase-hooks/auth";
import { useDocumentData } from "react-firebase-hooks/firestore";
import { auth, db } from "@/lib/firebase";
import { doc } from "firebase/firestore";
import { UpgradeRequiredAlert } from "@/components/upgrade-required-alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";


// Reconciliation of Gross Turnover (Table 5)
const initialTurnoverRecon = [
    { id: "A", description: "Turnover (incl. exports) as per audited financial statements", value: 51000000 },
    { id: "B", description: "Unbilled revenue at the beginning of the Financial Year", value: 0 },
    { id: "C", description: "Unadjusted advances at the end of the Financial Year", value: 200000 },
    { id: "D", description: "Deemed Supply under Schedule I", value: 0 },
    { id: "E", description: "Credit Notes issued after the end of the FY but reflected in GSTR-9", value: -150000 },
    { id: "F", description: "Trade Discounts accounted for in the audited accounts but are not permissible under GST", value: 0 },
    { id: "I", description: "Unbilled revenue at the end of the Financial Year", value: -300000 },
    { id: "J", description: "Unadjusted advances at the beginning of the Financial Year", value: -100000 },
    { id: "L", description: "Adjustments on account of supply of goods by SEZ units to DTA Units", value: 0 },
    { id: "N", description: "Turnover for the period under composition scheme", value: 0 },
];

// Reconciliation of Taxable Turnover (Table 7)
const initialTaxableTurnoverRecon = [
    { id: "A", description: "Annual turnover after adjustments (from Table 5Q)", value: 50650000 },
    { id: "B", description: "Value of Exempted, Nil Rated, Non-GST supplies, No-Supply turnover", value: -500000 },
    { id: "C", description: "Zero-rated supplies without payment of tax", value: -200000 },
    { id: "D", description: "Supplies on which tax is to be paid by the recipient on reverse charge basis", value: -150000 },
];

// Reconciliation of Tax Paid (Table 9)
const initialTaxPaidRecon = [
    { rate: 5, taxableValue: 10000000, cgst: 250000, sgst: 250000, igst: 0, cess: 0 },
    { rate: 12, taxableValue: 15000000, cgst: 900000, sgst: 900000, igst: 0, cess: 0 },
    { rate: 18, taxableValue: 25000000, cgst: 0, sgst: 0, igst: 4500000, cess: 0 },
];

// Reconciliation of ITC (Table 12)
const initialItcRecon = [
    { id: "A", description: "ITC availed as per audited Financial Statements", value: 3500000 },
    { id: "B", description: "ITC booked in earlier FYs claimed in current FY", value: 50000 },
    { id: "C", description: "ITC booked in current FY to be claimed in subsequent FYs", value: -100000 },
    { id: "D", description: "ITC availed as per audited financial statements or books of account", value: 3450000, isTotal: true },
    { id: "E", description: "ITC claimed in Annual Return (GSTR-9)", value: 3400000 },
];

// Additional Liability (Table 11)
const initialAdditionalLiability = [
    { description: "IGST", value: 0 },
    { description: "CGST", value: 0 },
    { description: "SGST/UTGST", value: 0 },
    { description: "Cess", value: 0 },
    { description: "Interest", value: 0 },
    { description: "Penalty", value: 0 },
];

export default function Gstr9cPage() {
  // ALL HOOKS MUST BE CALLED UNCONDITIONALLY AT THE TOP LEVEL
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);
  const [user] = useAuthState(auth);
  const userDocRef = user ? doc(db, 'users', user.uid) : null;
  const [userData] = useDocumentData(userDocRef);
  const subscriptionPlan = userData?.subscriptionPlan || 'freemium';
  const isFreemium = subscriptionPlan === 'freemium';

  // All hooks must be called before any early returns
  const [turnoverReconData, setTurnoverReconData] = useState(initialTurnoverRecon);
  const [taxableTurnoverReconData, setTaxableTurnoverReconData] = useState(initialTaxableTurnoverRecon);
  const [taxPaidData, setTaxPaidData] = useState(initialTaxPaidRecon);
  const [itcReconData, setItcReconData] = useState(initialItcRecon);
  const [additionalLiabilityData, setAdditionalLiabilityData] = useState(initialAdditionalLiability);
  const [unreconciledReasons, setUnreconciledReasons] = useState({
      grossTurnover: [{ id: 1, reason: "", amount: 0 }],
      taxableTurnover: [{ id: 1, reason: "", amount: 0 }],
      taxPayable: [{ id: 1, reason: "", amount: 0 }],
      itc: [{ id: 1, reason: "", amount: 0 }],
  });
  
  const [auditorDetails, setAuditorDetails] = useState({
    auditorName: "S. Sharma",
    membershipNo: "123456",
    firmName: "S. Sharma & Associates"
  });

  // Early return AFTER all hooks are called
  if (user && isFreemium) {
    return (
      <div className="space-y-8 p-8">
        <h1 className="text-3xl font-bold">GSTR-9C Reconciliation</h1>
        <UpgradeRequiredAlert
          featureName="GSTR-9C Reconciliation"
          description="Generate GSTR-9C reconciliation statements with a Business or Professional plan."
          backHref="/dashboard"
          backLabel="Back to Dashboard"
        />
      </div>
    );
  }
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      toast({
        title: "GSTR-9 File Uploaded",
        description: `${file.name} has been processed. Data in relevant tables would be auto-filled in a real application.`,
      });
      // In a real app, you would parse the JSON and update the component's state.
    }
  };

  const totalTurnover = turnoverReconData.reduce((acc, item) => acc + item.value, 0);
  const totalTaxableTurnover = taxableTurnoverReconData.reduce((acc, item) => acc + item.value, 0);
  const itcDifference = (itcReconData.find(i=>i.id === 'D')?.value || 0) - (itcReconData.find(i=>i.id === 'E')?.value || 0);
  
  const handleGenerateJson = () => {
    const companyMetadata = {
        gstin: "27ABCDE1234F1Z5",
        legalName: "GSTEase Solutions Pvt Ltd",
        tradeName: "GSTEase Solutions",
        fy: "2023-24"
    };

    const gstr9cJson = {
      formName: "GSTR9C",
      schemaVersion: "1.0",
      gstin: companyMetadata.gstin,
      fy: companyMetadata.fy,
      legalName: companyMetadata.legalName,
      tradeName: companyMetadata.tradeName,
      partA: {
        turnoverDetails: {
          auditedTurnover: turnoverReconData.find(r => r.id === 'A')?.value || 0,
          unbilledRevenueBegin: turnoverReconData.find(r => r.id === 'B')?.value || 0,
          unadjAdvEnd: turnoverReconData.find(r => r.id === 'C')?.value || 0,
          deemedSupply: turnoverReconData.find(r => r.id === 'D')?.value || 0,
          turnoverAsPerGstr9: totalTurnover
        },
        taxableTurnoverDetails: {
            annualTurnoverAdj: taxableTurnoverReconData.find(r => r.id === 'A')?.value || 0,
            exemptedTurnover: taxableTurnoverReconData.find(r => r.id === 'B')?.value || 0,
            taxableTurnoverGstr9: totalTaxableTurnover
        },
        taxPaid: {
          details: taxPaidData.map(item => ({
            tax_rate: item.rate,
            taxable_val: item.taxableValue,
            igst: item.igst,
            cgst: item.cgst,
            sgst: item.sgst,
            cess: item.cess
          }))
        },
        itc: {
            itcBooked: itcReconData.find(r => r.id === 'D')?.value || 0,
            itcClaimedGstr9: itcReconData.find(r => r.id === 'E')?.value || 0,
            unreconciledItc: itcDifference
        }
      },
      partB: {
        auditorDetails: {
            memberName: auditorDetails.auditorName,
            membershipNo: auditorDetails.membershipNo,
            firmName: auditorDetails.firmName,
            certifyDate: new Date().toISOString().split('T')[0]
        },
        certStatus: "N"
      }
    };

    const jsonString = JSON.stringify(gstr9cJson, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `GSTR9C_${companyMetadata.gstin}_${companyMetadata.fy}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({
      title: `JSON Generation Complete`,
      description: `Your GSTR-9C JSON file has been downloaded.`,
    });
  };

  return (
    <div className="space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <Link href="/gst-filings" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" />
              Back to GST Filings
          </Link>
          <div className="flex-1 text-center">
              <h1 className="text-3xl font-bold">GSTR-9C Preparation Utility</h1>
              <p className="mt-2 max-w-2xl mx-auto text-muted-foreground">
                  Prepare the reconciliation statement between your audited annual financial statements and your GSTR-9 annual return.
              </p>
          </div>
          <ShareButtons
            contentRef={reportRef}
            fileName={`GSTR-9C-${format(new Date(), 'yyyy-MM-dd')}`}
            whatsappMessage="Check out my GSTR-9C reconciliation from ZenithBooks"
            emailSubject="GSTR-9C Reconciliation"
            emailBody="Please find attached the GSTR-9C reconciliation statement."
            shareTitle="GSTR-9C Reconciliation"
          />
        </div>

        {/* Report Summary View for PDF Generation - Positioned off-screen but accessible for PDF */}
        <div ref={reportRef} className="absolute left-[-9999px] w-[210mm] bg-white" style={{ position: 'absolute', left: '-9999px', width: '210mm' }}>
          <div className="p-8 bg-white text-black space-y-8">
            <div className="text-center border-b-2 border-gray-800 pb-4 mb-8">
              <h1 className="text-2xl font-bold">GSTR-9C Reconciliation Statement</h1>
              <p className="text-sm">Financial Year: 2024-25</p>
              <p className="text-xs mt-2">Generated on: {format(new Date(), "dd MMM yyyy, hh:mm a")}</p>
            </div>

            {/* Part II: Reconciliation of Turnover */}
            <div className="break-inside-avoid">
              <h2 className="text-lg font-bold mb-4">Part II: Reconciliation of Turnover</h2>
              <h3 className="text-md font-semibold mb-2">Table 5: Reconciliation of Gross Turnover</h3>
              <Table className="text-xs border border-gray-300">
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead className="border border-gray-300 p-2">Sl. No.</TableHead>
                    <TableHead className="border border-gray-300 p-2">Description</TableHead>
                    <TableHead className="border border-gray-300 p-2 text-right">Amount (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {turnoverReconData.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="border border-gray-300 p-2">{item.id}</TableCell>
                      <TableCell className="border border-gray-300 p-2">{item.description}</TableCell>
                      <TableCell className="border border-gray-300 p-2 text-right">{item.value.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-gray-100 font-bold">
                    <TableCell className="border border-gray-300 p-2">Q</TableCell>
                    <TableCell className="border border-gray-300 p-2">Annual turnover as per GSTR-9</TableCell>
                    <TableCell className="border border-gray-300 p-2 text-right font-mono">{totalTurnover.toFixed(2)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>

            {/* Part III: Reconciliation of Taxable Turnover */}
            <div className="break-inside-avoid mt-8">
              <h2 className="text-lg font-bold mb-4">Part III: Reconciliation of Taxable Turnover</h2>
              <h3 className="text-md font-semibold mb-2">Table 7: Reconciliation of Taxable Turnover</h3>
              <Table className="text-xs border border-gray-300">
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead className="border border-gray-300 p-2">Sl. No.</TableHead>
                    <TableHead className="border border-gray-300 p-2">Description</TableHead>
                    <TableHead className="border border-gray-300 p-2 text-right">Amount (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxableTurnoverReconData.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="border border-gray-300 p-2">{item.id}</TableCell>
                      <TableCell className="border border-gray-300 p-2">{item.description}</TableCell>
                      <TableCell className="border border-gray-300 p-2 text-right">{item.value.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-gray-100 font-bold">
                    <TableCell className="border border-gray-300 p-2">E</TableCell>
                    <TableCell className="border border-gray-300 p-2">Taxable Turnover as per liability declared in GSTR-9</TableCell>
                    <TableCell className="border border-gray-300 p-2 text-right font-mono">{totalTaxableTurnover.toFixed(2)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>

            {/* Part IV: Reconciliation of Tax Paid */}
            <div className="break-inside-avoid mt-8">
              <h2 className="text-lg font-bold mb-4">Part IV: Reconciliation of Tax Paid</h2>
              <h3 className="text-md font-semibold mb-2">Table 9: Reconciliation of rate wise liability and amount payable thereon</h3>
              <Table className="text-xs border border-gray-300">
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead className="border border-gray-300 p-2">Rate</TableHead>
                    <TableHead className="border border-gray-300 p-2 text-right">Taxable Value (₹)</TableHead>
                    <TableHead className="border border-gray-300 p-2 text-right">CGST (₹)</TableHead>
                    <TableHead className="border border-gray-300 p-2 text-right">SGST (₹)</TableHead>
                    <TableHead className="border border-gray-300 p-2 text-right">IGST (₹)</TableHead>
                    <TableHead className="border border-gray-300 p-2 text-right">Cess (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxPaidData.map(item => (
                    <TableRow key={item.rate}>
                      <TableCell className="border border-gray-300 p-2">{item.rate}%</TableCell>
                      <TableCell className="border border-gray-300 p-2 text-right">{item.taxableValue.toFixed(2)}</TableCell>
                      <TableCell className="border border-gray-300 p-2 text-right">{item.cgst.toFixed(2)}</TableCell>
                      <TableCell className="border border-gray-300 p-2 text-right">{item.sgst.toFixed(2)}</TableCell>
                      <TableCell className="border border-gray-300 p-2 text-right">{item.igst.toFixed(2)}</TableCell>
                      <TableCell className="border border-gray-300 p-2 text-right">{item.cess.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-gray-100 font-bold">
                    <TableCell className="border border-gray-300 p-2">Total</TableCell>
                    <TableCell className="border border-gray-300 p-2 text-right font-mono">{(taxPaidData.reduce((a, b) => a + b.taxableValue, 0)).toFixed(2)}</TableCell>
                    <TableCell className="border border-gray-300 p-2 text-right font-mono">{(taxPaidData.reduce((a, b) => a + b.cgst, 0)).toFixed(2)}</TableCell>
                    <TableCell className="border border-gray-300 p-2 text-right font-mono">{(taxPaidData.reduce((a, b) => a + b.sgst, 0)).toFixed(2)}</TableCell>
                    <TableCell className="border border-gray-300 p-2 text-right font-mono">{(taxPaidData.reduce((a, b) => a + b.igst, 0)).toFixed(2)}</TableCell>
                    <TableCell className="border border-gray-300 p-2 text-right font-mono">{(taxPaidData.reduce((a, b) => a + b.cess, 0)).toFixed(2)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>

            {/* Part V: Reconciliation of ITC */}
            <div className="break-inside-avoid mt-8 border-t-2 border-gray-800 pt-4">
              <h2 className="text-lg font-bold mb-4">Part V: Reconciliation of Input Tax Credit (ITC)</h2>
              <h3 className="text-md font-semibold mb-2">Table 12: Reconciliation of Net ITC</h3>
              <Table className="text-xs border border-gray-300">
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead className="border border-gray-300 p-2">Sl. No.</TableHead>
                    <TableHead className="border border-gray-300 p-2">Description</TableHead>
                    <TableHead className="border border-gray-300 p-2 text-right">Amount (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itcReconData.map(item => (
                    <TableRow key={item.id} className={item.isTotal ? 'font-bold bg-gray-100' : ''}>
                      <TableCell className="border border-gray-300 p-2">{item.id}</TableCell>
                      <TableCell className="border border-gray-300 p-2">{item.description}</TableCell>
                      <TableCell className="border border-gray-300 p-2 text-right font-mono">{item.value.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-destructive/10 text-destructive font-bold">
                    <TableCell className="border border-gray-300 p-2">F</TableCell>
                    <TableCell className="border border-gray-300 p-2">Un-reconciled ITC (D-E)</TableCell>
                    <TableCell className="border border-gray-300 p-2 text-right font-mono">{itcDifference.toFixed(2)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>

            {/* Part-B: Certification */}
            <div className="break-inside-avoid mt-8 border-t-2 border-gray-800 pt-4">
              <h2 className="text-lg font-bold mb-4">Part-B: Certification</h2>
              <Table className="text-xs border border-gray-300">
                <TableBody>
                  <TableRow>
                    <TableCell className="border border-gray-300 p-2 font-bold">Name of Auditor</TableCell>
                    <TableCell className="border border-gray-300 p-2">{auditorDetails.auditorName}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="border border-gray-300 p-2 font-bold">Membership No.</TableCell>
                    <TableCell className="border border-gray-300 p-2">{auditorDetails.membershipNo}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="border border-gray-300 p-2 font-bold">Name of Audit Firm</TableCell>
                    <TableCell className="border border-gray-300 p-2">{auditorDetails.firmName}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Wizard Steps - Visible in UI */}
        <div>
        <Card>
            <CardHeader>
                <CardTitle>GSTR-9C Data Entry (FY 2024-25)</CardTitle>
                <CardDescription>
                    Enter the values from your Audited Financials and GSTR-9. You can upload a GSTR-9 JSON file to auto-populate fields.
                </CardDescription>
                 <div className="pt-4">
                  <Input id="gstr9-upload" type="file" className="hidden" accept=".json" onChange={handleFileUpload} />
                  <Button asChild variant="outline">
                    <Label htmlFor="gstr9-upload">
                      <Upload className="mr-2" /> Upload GSTR-9 JSON
                    </Label>
                  </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Accordion type="multiple" defaultValue={['turnover-recon']} className="w-full">
                    <AccordionItem value="turnover-recon">
                        <AccordionTrigger>Part II: Reconciliation of Turnover</AccordionTrigger>
                        <AccordionContent>
                           <h4 className="font-semibold text-md mb-2">Table 5: Reconciliation of Gross Turnover</h4>
                           <Table>
                               <TableHeader>
                                   <TableRow>
                                       <TableHead>Sl. No.</TableHead>
                                       <TableHead className="w-2/3">Description</TableHead>
                                       <TableHead className="text-right">Amount (₹)</TableHead>
                                   </TableRow>
                               </TableHeader>
                               <TableBody>
                                   {turnoverReconData.map(item => (
                                       <TableRow key={item.id}>
                                           <TableCell>{item.id}</TableCell>
                                           <TableCell>{item.description}</TableCell>
                                           <TableCell><Input type="number" className="text-right" defaultValue={item.value} /></TableCell>
                                       </TableRow>
                                   ))}
                               </TableBody>
                               <TableFooter>
                                    <TableRow className="font-bold bg-muted/50">
                                       <TableCell>Q</TableCell>
                                       <TableCell>Annual turnover as per GSTR-9</TableCell>
                                       <TableCell className="text-right font-mono">{totalTurnover.toLocaleString()}</TableCell>
                                   </TableRow>
                               </TableFooter>
                           </Table>
                           <h4 className="font-semibold text-md mb-2 mt-6">Table 6: Reasons for Un-Reconciled difference in Gross Turnover</h4>
                           <p className="text-sm text-muted-foreground mb-2">Add reasons for any difference between Table 5Q and your audited annual turnover.</p>
                           <Table>
                               <TableHeader><TableRow><TableHead className="w-3/4">Reason</TableHead><TableHead className="text-right">Amount (₹)</TableHead></TableRow></TableHeader>
                               <TableBody><TableRow><TableCell><Input placeholder="Enter reason for difference"/></TableCell><TableCell><Input type="number" className="text-right" defaultValue="0" /></TableCell></TableRow></TableBody>
                           </Table>
                        </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="taxable-turnover-recon">
                        <AccordionTrigger>Part III: Reconciliation of Taxable Turnover (Table 7)</AccordionTrigger>
                        <AccordionContent>
                            <h4 className="font-semibold text-md mb-2">Table 7: Reconciliation of Taxable Turnover</h4>
                             <Table>
                               <TableHeader>
                                   <TableRow>
                                       <TableHead>Sl. No.</TableHead>
                                       <TableHead className="w-2/3">Description</TableHead>
                                       <TableHead className="text-right">Amount (₹)</TableHead>
                                   </TableRow>
                               </TableHeader>
                               <TableBody>
                                   {taxableTurnoverReconData.map(item => (
                                       <TableRow key={item.id}>
                                           <TableCell>{item.id}</TableCell>
                                           <TableCell>{item.description}</TableCell>
                                           <TableCell><Input type="number" className="text-right" defaultValue={item.value} /></TableCell>
                                       </TableRow>
                                   ))}
                               </TableBody>
                               <TableFooter>
                                    <TableRow className="font-bold bg-muted/50">
                                       <TableCell>E</TableCell>
                                       <TableCell>Taxable Turnover as per liability declared in GSTR-9</TableCell>
                                       <TableCell className="text-right font-mono">{totalTaxableTurnover.toLocaleString()}</TableCell>
                                   </TableRow>
                               </TableFooter>
                           </Table>
                           <h4 className="font-semibold text-md mb-2 mt-6">Table 8: Reasons for Un-Reconciled difference in Taxable Turnover</h4>
                           <Table>
                               <TableHeader><TableRow><TableHead className="w-3/4">Reason</TableHead><TableHead className="text-right">Amount (₹)</TableHead></TableRow></TableHeader>
                               <TableBody><TableRow><TableCell><Input placeholder="Enter reason for difference"/></TableCell><TableCell><Input type="number" className="text-right" defaultValue="0" /></TableCell></TableRow></TableBody>
                           </Table>
                        </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="tax-paid-recon">
                        <AccordionTrigger>Part IV: Reconciliation of Tax Paid (Table 9)</AccordionTrigger>
                        <AccordionContent>
                            <h4 className="font-semibold text-md mb-2">Table 9: Reconciliation of rate wise liability and amount payable thereon</h4>
                            <Table>
                                <TableHeader>
                                    <TableRow><TableHead>Rate</TableHead><TableHead className="text-right">Taxable Value (₹)</TableHead><TableHead className="text-right">CGST (₹)</TableHead><TableHead className="text-right">SGST (₹)</TableHead><TableHead className="text-right">IGST (₹)</TableHead><TableHead className="text-right">Cess (₹)</TableHead></TableRow>
                                </TableHeader>
                                <TableBody>
                                    {taxPaidData.map(item => (
                                        <TableRow key={item.rate}><TableCell>{item.rate}%</TableCell><TableCell><Input className="text-right" defaultValue={item.taxableValue}/></TableCell><TableCell><Input className="text-right" defaultValue={item.cgst}/></TableCell><TableCell><Input className="text-right" defaultValue={item.sgst}/></TableCell><TableCell><Input className="text-right" defaultValue={item.igst}/></TableCell><TableCell><Input className="text-right" defaultValue={item.cess}/></TableCell></TableRow>
                                    ))}
                                </TableBody>
                                <TableFooter>
                                     <TableRow className="font-bold bg-muted/50">
                                         <TableCell>Total</TableCell>
                                         <TableCell className="text-right font-mono">{(taxPaidData.reduce((a, b) => a + b.taxableValue, 0)).toLocaleString()}</TableCell>
                                         <TableCell className="text-right font-mono">{(taxPaidData.reduce((a, b) => a + b.cgst, 0)).toLocaleString()}</TableCell>
                                         <TableCell className="text-right font-mono">{(taxPaidData.reduce((a, b) => a + b.sgst, 0)).toLocaleString()}</TableCell>
                                         <TableCell className="text-right font-mono">{(taxPaidData.reduce((a, b) => a + b.igst, 0)).toLocaleString()}</TableCell>
                                         <TableCell className="text-right font-mono">{(taxPaidData.reduce((a, b) => a + b.cess, 0)).toLocaleString()}</TableCell>
                                     </TableRow>
                                </TableFooter>
                            </Table>
                             <h4 className="font-semibold text-md mb-2 mt-6">Table 10: Reasons for un-reconciled payment of tax</h4>
                           <Table>
                               <TableHeader><TableRow><TableHead className="w-3/4">Reason</TableHead><TableHead className="text-right">Amount (₹)</TableHead></TableRow></TableHeader>
                               <TableBody><TableRow><TableCell><Input placeholder="Enter reason for difference"/></TableCell><TableCell><Input type="number" className="text-right" defaultValue="0" /></TableCell></TableRow></TableBody>
                           </Table>
                           <h4 className="font-semibold text-md mb-2 mt-6">Table 11: Additional amount payable but not paid</h4>
                            <Table>
                               <TableHeader><TableRow><TableHead>Description</TableHead><TableHead className="text-right">Value (₹)</TableHead></TableRow></TableHeader>
                               <TableBody>
                                   {additionalLiabilityData.map(item => (
                                       <TableRow key={item.description}><TableCell>{item.description}</TableCell><TableCell><Input className="text-right" type="number" defaultValue={item.value}/></TableCell></TableRow>
                                   ))}
                               </TableBody>
                           </Table>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="itc-recon">
                        <AccordionTrigger>Part V: Reconciliation of Input Tax Credit (ITC) (Table 12)</AccordionTrigger>
                        <AccordionContent>
                             <h4 className="font-semibold text-md mb-2">Table 12: Reconciliation of Net ITC</h4>
                             <Table>
                               <TableHeader>
                                   <TableRow>
                                       <TableHead>Sl. No.</TableHead>
                                       <TableHead className="w-2/3">Description</TableHead>
                                       <TableHead className="text-right">Amount (₹)</TableHead>
                                   </TableRow>
                               </TableHeader>
                               <TableBody>
                                   {itcReconData.map(item => (
                                       <TableRow key={item.id} className={item.isTotal ? 'font-bold bg-muted/50' : ''}>
                                           <TableCell>{item.id}</TableCell>
                                           <TableCell>{item.description}</TableCell>
                                           <TableCell>
                                                {item.isTotal ? <div className="text-right font-mono">{item.value.toLocaleString()}</div> : <Input type="number" className="text-right" defaultValue={item.value} />}
                                           </TableCell>
                                       </TableRow>
                                   ))}
                               </TableBody>
                               <TableFooter>
                                    <TableRow className="font-bold bg-destructive/10 text-destructive">
                                       <TableCell>F</TableCell>
                                       <TableCell>Un-reconciled ITC (D-E)</TableCell>
                                       <TableCell className="text-right font-mono">{itcDifference.toLocaleString()}</TableCell>
                                   </TableRow>
                               </TableFooter>
                           </Table>
                            <h4 className="font-semibold text-md mb-2 mt-6">Table 13: Reasons for un-reconciled difference in ITC</h4>
                           <Table>
                               <TableHeader><TableRow><TableHead className="w-3-4">Reason</TableHead><TableHead className="text-right">Amount (₹)</TableHead></TableRow></TableHeader>
                               <TableBody><TableRow><TableCell><Input placeholder="Enter reason for difference"/></TableCell><TableCell><Input type="number" className="text-right" defaultValue="0" /></TableCell></TableRow></TableBody>
                           </Table>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Part-B: Certification</CardTitle>
                <CardDescription>Enter the details of the certifying auditor.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Name of Auditor</Label>
                        <Input value={auditorDetails.auditorName} onChange={e => setAuditorDetails(prev => ({...prev, auditorName: e.target.value}))} placeholder="e.g., S. Sharma" />
                    </div>
                    <div className="space-y-2">
                        <Label>Membership No.</Label>
                        <Input value={auditorDetails.membershipNo} onChange={e => setAuditorDetails(prev => ({...prev, membershipNo: e.target.value}))} placeholder="e.g., 123456" />
                    </div>
                 </div>
                  <div className="space-y-2">
                    <Label>Name of Audit Firm</Label>
                    <Input value={auditorDetails.firmName} onChange={e => setAuditorDetails(prev => ({...prev, firmName: e.target.value}))} placeholder="e.g., S. Sharma & Associates"/>
                </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <Button variant="outline"><FileSpreadsheet className="mr-2"/> Export to Excel</Button>
                <Button variant="outline" onClick={async () => {
                    if (!reportRef.current) {
                        toast({ variant: "destructive", title: "Error", description: "Could not find the report content to generate PDF." });
                        return;
                    }
                    toast({ title: "Generating PDF...", description: "Your GSTR-9C PDF is being generated." });
                    const opt = {
                        margin: [10, 10, 10, 10],
                        filename: `GSTR-9C-${format(new Date(), "yyyy-MM-dd")}.pdf`,
                        image: { type: "jpeg", quality: 0.98 },
                        html2canvas: { scale: 2, useCORS: true, logging: false, pagebreak: { mode: ['avoid-all', 'css', 'legacy'] } },
                        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
                        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
                    };
                    await html2pdf().set(opt).from(reportRef.current).save();
                    toast({ title: "PDF Generated", description: "Your GSTR-9C PDF has been downloaded successfully." });
                }}><FileDown className="mr-2"/> Download GSTR-9C PDF</Button>
                <Button onClick={handleGenerateJson}><FileJson className="mr-2"/> Download GSTR-9C JSON</Button>
             </CardFooter>
        </Card>
        </div>
    </div>
  );
}

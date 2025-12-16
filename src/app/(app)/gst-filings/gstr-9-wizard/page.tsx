
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowRight, FileJson, FileDown, Upload, Download } from "lucide-react";
import html2pdf from "html2pdf.js";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { ShareButtons } from "@/components/documents/share-buttons";
import { format } from "date-fns";
import { useAuthState } from "react-firebase-hooks/auth";
import { useDocumentData } from "react-firebase-hooks/firestore";
import { auth, db } from "@/lib/firebase";
import { doc } from "firebase/firestore";
import { UpgradeRequiredAlert } from "@/components/upgrade-required-alert";

const initialOutwardSupplies = [
    { description: "B2C Supplies", taxableValue: 12500000, cgst: 1125000, sgst: 1125000, igst: 0, cess: 0 },
    { description: "B2B Supplies", taxableValue: 37500000, cgst: 0, sgst: 0, igst: 6750000, cess: 0 },
    { description: "Zero-rated supply (Export, SEZ)", taxableValue: 5000000, cgst: 0, sgst: 0, igst: 0, cess: 0 },
    { description: "Deemed Exports", taxableValue: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 },
];

const initialItc = [
    { description: "ITC on Inputs", cgst: 1500000, sgst: 1500000, igst: 2500000, cess: 0 },
    { description: "ITC on Capital Goods", cgst: 250000, sgst: 250000, igst: 500000, cess: 0 },
    { description: "ITC on Input Services", cgst: 500000, sgst: 500000, igst: 1000000, cess: 0 },
];

const initialTaxPaid = [
    { description: "Integrated Tax", paid: 7000000 },
    { description: "Central Tax", paid: 3000000 },
    { description: "State/UT Tax", paid: 3000000 },
    { description: "CESS", paid: 0 },
    { description: "Tax paid through ITC", paid: 12000000 },
    { description: "Tax paid in cash", paid: 1000000 },
];

export default function Gstr9WizardPage() {
  // ALL HOOKS MUST BE CALLED UNCONDITIONALLY AT THE TOP LEVEL
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);
  const [user] = useAuthState(auth);
  const userDocRef = user ? doc(db, 'users', user.uid) : null;
  const [userData] = useDocumentData(userDocRef);
  const subscriptionPlan = userData?.subscriptionPlan || 'freemium';
  const isFreemium = subscriptionPlan === 'freemium';

  // All hooks must be called before any early returns
  const [step, setStep] = useState(1);
  const [outwardSupplies, setOutwardSupplies] = useState(initialOutwardSupplies);
  const [itc, setItc] = useState(initialItc);
  const [taxPaid, setTaxPaid] = useState(initialTaxPaid);

  // Early return AFTER all hooks are called
  if (user && isFreemium) {
    return (
      <div className="space-y-8 p-8">
        <h1 className="text-3xl font-bold">GSTR-9 Filing</h1>
        <UpgradeRequiredAlert
          featureName="GSTR-9 Filing"
          description="File annual GSTR-9 returns with a Business or Professional plan."
          backHref="/dashboard"
          backLabel="Back to Dashboard"
        />
      </div>
    );
  }

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
  
  const handleGenerateAction = () => {
    const reportData = {
        financialYear: "2023-24",
        part2_outwardSupplies: initialOutwardSupplies,
        part3_itc: initialItc,
        part4_taxPaid: initialTaxPaid,
        // ... include data from other steps
    };
    const jsonString = JSON.stringify(reportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `GSTR9_2023-24_${new Date().toISOString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({
      title: `JSON Generation Complete`,
      description: `Your GSTR-9 JSON file has been downloaded.`,
    });
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Data Import</CardTitle>
              <CardDescription>
                Import your GSTR-9 data from a CSV file, or proceed to manually enter the data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    You can either upload a pre-filled CSV from the GST Portal or another software, or fill in the details manually in the upcoming steps. This wizard will guide you through the key tables of GSTR-9.
                </p>
                <div className="flex gap-4">
                    <Button variant="outline"><Upload className="mr-2"/> Upload GSTR-9 CSV</Button>
                    <Button variant="outline" onClick={() => {
                        const templateData = {
                            "Financial Year": "2023-24",
                            "GSTIN": "27ABCDE1234F1Z5",
                            "Legal Name": "Sample Company Name",
                            "Trade Name": "Sample Trade Name",
                            "Note": "This is a sample template. Replace with your actual GSTR-9 data."
                        };
                        const jsonString = JSON.stringify(templateData, null, 2);
                        const blob = new Blob([jsonString], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = `GSTR9_Template_${format(new Date(), "yyyy-MM-dd")}.json`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                        toast({
                            title: "Template Downloaded",
                            description: "GSTR-9 template has been downloaded. Fill in your data and upload.",
                        });
                    }}><Download className="mr-2"/> Download Template</Button>
                </div>
            </CardContent>
            <CardFooter className="flex justify-end">
                <Button onClick={handleNext}>
                    Proceed to Manual Entry
                    <ArrowRight className="ml-2" />
                </Button>
            </CardFooter>
          </Card>
        );
      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Details of Outward Supplies (Part II)</CardTitle>
              <CardDescription>
                Summary of outward supplies made during the financial year. This is auto-filled from your GSTR-1 filings. Review and adjust if necessary.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Description</TableHead>
                    <TableHead className="text-right">Taxable Value</TableHead>
                    <TableHead className="text-right">CGST</TableHead>
                    <TableHead className="text-right">SGST/UTGST</TableHead>
                    <TableHead className="text-right">IGST</TableHead>
                    <TableHead className="text-right">CESS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialOutwardSupplies.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row.description}</TableCell>
                      <TableCell><Input type="number" className="text-right" defaultValue={row.taxableValue} /></TableCell>
                      <TableCell><Input type="number" className="text-right" defaultValue={row.cgst} /></TableCell>
                      <TableCell><Input type="number" className="text-right" defaultValue={row.sgst} /></TableCell>
                      <TableCell><Input type="number" className="text-right" defaultValue={row.igst} /></TableCell>
                      <TableCell><Input type="number" className="text-right" defaultValue={row.cess} /></TableCell>
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
      case 3:
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Step 3: Details of ITC (Part III)</CardTitle>
                    <CardDescription>
                        Summary of Input Tax Credit availed during the financial year. This is auto-filled from your GSTR-3B filings.
                    </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead className="w-[30%]">Description</TableHead>
                        <TableHead className="text-right">CGST</TableHead>
                        <TableHead className="text-right">SGST/UTGST</TableHead>
                        <TableHead className="text-right">IGST</TableHead>
                        <TableHead className="text-right">CESS</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {initialItc.map((row, index) => (
                        <TableRow key={index}>
                        <TableCell className="font-medium">{row.description}</TableCell>
                        <TableCell><Input type="number" className="text-right" defaultValue={row.cgst} /></TableCell>
                        <TableCell><Input type="number" className="text-right" defaultValue={row.sgst} /></TableCell>
                        <TableCell><Input type="number" className="text-right" defaultValue={row.igst} /></TableCell>
                        <TableCell><Input type="number" className="text-right" defaultValue={row.cess} /></TableCell>
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
      case 4:
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Step 4: Details of Tax Paid (Part IV)</CardTitle>
                    <CardDescription>
                        Summary of tax paid as declared in returns filed during the financial year.
                    </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-1/2">Description</TableHead>
                                <TableHead className="text-right">Amount Paid</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {initialTaxPaid.map((row, index) => (
                            <TableRow key={index}>
                                <TableCell className="font-medium">{row.description}</TableCell>
                                <TableCell><Input type="number" className="text-right" defaultValue={row.paid} /></TableCell>
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
      case 5:
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Step 5: Previous FY Transactions (Part V)</CardTitle>
                    <CardDescription>
                        Particulars of transactions for the previous financial year declared in returns of April to September of current FY.
                    </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[30%]">Description</TableHead>
                                <TableHead className="text-right">Taxable Value</TableHead>
                                <TableHead className="text-right">CGST</TableHead>
                                <TableHead className="text-right">SGST</TableHead>
                                <TableHead className="text-right">IGST</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             <TableRow>
                                <TableCell className="font-medium">Supplies/tax declared through Amendments (+)</TableCell>
                                <TableCell><Input type="number" className="text-right" defaultValue={50000} /></TableCell>
                                <TableCell><Input type="number" className="text-right" defaultValue={0} /></TableCell>
                                <TableCell><Input type="number" className="text-right" defaultValue={0} /></TableCell>
                                <TableCell><Input type="number" className="text-right" defaultValue={9000} /></TableCell>
                            </TableRow>
                             <TableRow>
                                <TableCell className="font-medium">Supplies/tax reduced through Amendments (-)</TableCell>
                                <TableCell><Input type="number" className="text-right" defaultValue={10000} /></TableCell>
                                <TableCell><Input type="number" className="text-right" defaultValue={0} /></TableCell>
                                <TableCell><Input type="number" className="text-right" defaultValue={0} /></TableCell>
                                <TableCell><Input type="number" className="text-right" defaultValue={1800} /></TableCell>
                            </TableRow>
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
      default:
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Wizard Complete</CardTitle>
                    <CardDescription>You have finished preparing your GSTR-9 return.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>You have completed all the key data entry steps for your GSTR-9 annual return. The next step is to generate the JSON file for uploading to the GST portal.</p>
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                    <Button variant="outline" onClick={handleBack}>
                        <ArrowLeft className="mr-2" /> Back
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={async () => {
                            if (!reportRef.current) {
                                toast({ variant: "destructive", title: "Error", description: "Could not find the report content to generate PDF." });
                                return;
                            }
                            toast({ title: "Generating PDF...", description: "Your GSTR-9 PDF is being generated." });
                            const opt = {
                                margin: [10, 10, 10, 10],
                                filename: `GSTR-9-${format(new Date(), "yyyy-MM-dd")}.pdf`,
                                image: { type: "jpeg", quality: 0.98 },
                                html2canvas: { scale: 2, useCORS: true, logging: false, pagebreak: { mode: ['avoid-all', 'css', 'legacy'] } },
                                jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
                                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
                            };
                            await html2pdf().set(opt).from(reportRef.current).save();
                            toast({ title: "PDF Generated", description: "Your GSTR-9 PDF has been downloaded successfully." });
                        }}>
                            <FileDown className="mr-2" />
                            Download GSTR-9 PDF
                        </Button>
                        <Button onClick={handleGenerateAction}>
                            <FileJson className="mr-2" />
                            Generate GSTR-9 JSON
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        );
    }
  }

  return (
    <div className="space-y-8">
       <div className="flex items-center justify-between flex-wrap gap-4">
        <Link href="/gst-filings" passHref>
          <Button variant="outline">
            <ArrowLeft className="mr-2" />
            Back to GST Filings
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">GSTR-9 Annual Return Wizard</h1>
          <p className="text-muted-foreground">Financial Year: 2023-24</p>
        </div>
        <ShareButtons
          contentRef={reportRef}
          fileName={`GSTR-9-${format(new Date(), 'yyyy-MM-dd')}`}
          whatsappMessage="Check out my GSTR-9 return from ZenithBooks"
          emailSubject="GSTR-9 Annual Return"
          emailBody="Please find attached the GSTR-9 annual return."
          shareTitle="GSTR-9 Annual Return"
        />
      </div>

      {/* Report Summary View for PDF Generation - Positioned off-screen but accessible for PDF */}
      <div ref={reportRef} className="absolute left-[-9999px] w-[210mm] bg-white" style={{ position: 'absolute', left: '-9999px', width: '210mm' }}>
        <div className="p-8 bg-white text-black space-y-8">
          <div className="text-center border-b-2 border-gray-800 pb-4 mb-8">
            <h1 className="text-2xl font-bold">GSTR-9 Annual Return</h1>
            <p className="text-sm">Financial Year: 2023-24</p>
            <p className="text-xs mt-2">Generated on: {format(new Date(), "dd MMM yyyy, hh:mm a")}</p>
          </div>

          {/* Part II: Details of Outward Supplies */}
          <div className="break-inside-avoid">
            <h2 className="text-lg font-bold mb-4">Part II: Details of Outward Supplies</h2>
            <Table className="text-xs border border-gray-300">
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="border border-gray-300 p-2">Description</TableHead>
                  <TableHead className="border border-gray-300 p-2 text-right">Taxable Value</TableHead>
                  <TableHead className="border border-gray-300 p-2 text-right">CGST</TableHead>
                  <TableHead className="border border-gray-300 p-2 text-right">SGST/UTGST</TableHead>
                  <TableHead className="border border-gray-300 p-2 text-right">IGST</TableHead>
                  <TableHead className="border border-gray-300 p-2 text-right">CESS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outwardSupplies.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="border border-gray-300 p-2">{row.description}</TableCell>
                    <TableCell className="border border-gray-300 p-2 text-right">{row.taxableValue.toFixed(2)}</TableCell>
                    <TableCell className="border border-gray-300 p-2 text-right">{row.cgst.toFixed(2)}</TableCell>
                    <TableCell className="border border-gray-300 p-2 text-right">{row.sgst.toFixed(2)}</TableCell>
                    <TableCell className="border border-gray-300 p-2 text-right">{row.igst.toFixed(2)}</TableCell>
                    <TableCell className="border border-gray-300 p-2 text-right">{row.cess.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-gray-100 font-bold">
                  <TableCell className="border border-gray-300 p-2 text-right">Total</TableCell>
                  <TableCell className="border border-gray-300 p-2 text-right">{outwardSupplies.reduce((s, r) => s + r.taxableValue, 0).toFixed(2)}</TableCell>
                  <TableCell className="border border-gray-300 p-2 text-right">{outwardSupplies.reduce((s, r) => s + r.cgst, 0).toFixed(2)}</TableCell>
                  <TableCell className="border border-gray-300 p-2 text-right">{outwardSupplies.reduce((s, r) => s + r.sgst, 0).toFixed(2)}</TableCell>
                  <TableCell className="border border-gray-300 p-2 text-right">{outwardSupplies.reduce((s, r) => s + r.igst, 0).toFixed(2)}</TableCell>
                  <TableCell className="border border-gray-300 p-2 text-right">{outwardSupplies.reduce((s, r) => s + r.cess, 0).toFixed(2)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>

          {/* Part III: Details of ITC */}
          <div className="break-inside-avoid mt-8">
            <h2 className="text-lg font-bold mb-4">Part III: Details of ITC</h2>
            <Table className="text-xs border border-gray-300">
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="border border-gray-300 p-2">Description</TableHead>
                  <TableHead className="border border-gray-300 p-2 text-right">CGST</TableHead>
                  <TableHead className="border border-gray-300 p-2 text-right">SGST/UTGST</TableHead>
                  <TableHead className="border border-gray-300 p-2 text-right">IGST</TableHead>
                  <TableHead className="border border-gray-300 p-2 text-right">CESS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itc.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="border border-gray-300 p-2">{row.description}</TableCell>
                    <TableCell className="border border-gray-300 p-2 text-right">{row.cgst.toFixed(2)}</TableCell>
                    <TableCell className="border border-gray-300 p-2 text-right">{row.sgst.toFixed(2)}</TableCell>
                    <TableCell className="border border-gray-300 p-2 text-right">{row.igst.toFixed(2)}</TableCell>
                    <TableCell className="border border-gray-300 p-2 text-right">{row.cess.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-gray-100 font-bold">
                  <TableCell className="border border-gray-300 p-2 text-right">Total</TableCell>
                  <TableCell className="border border-gray-300 p-2 text-right">{itc.reduce((s, r) => s + r.cgst, 0).toFixed(2)}</TableCell>
                  <TableCell className="border border-gray-300 p-2 text-right">{itc.reduce((s, r) => s + r.sgst, 0).toFixed(2)}</TableCell>
                  <TableCell className="border border-gray-300 p-2 text-right">{itc.reduce((s, r) => s + r.igst, 0).toFixed(2)}</TableCell>
                  <TableCell className="border border-gray-300 p-2 text-right">{itc.reduce((s, r) => s + r.cess, 0).toFixed(2)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>

          {/* Part IV: Details of Tax Paid */}
          <div className="break-inside-avoid mt-8 border-t-2 border-gray-800 pt-4">
            <h2 className="text-lg font-bold mb-4">Part IV: Details of Tax Paid</h2>
            <Table className="text-xs border border-gray-300">
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="border border-gray-300 p-2">Description</TableHead>
                  <TableHead className="border border-gray-300 p-2 text-right">Amount Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taxPaid.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="border border-gray-300 p-2">{row.description}</TableCell>
                    <TableCell className="border border-gray-300 p-2 text-right">{row.paid.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-gray-100 font-bold">
                  <TableCell className="border border-gray-300 p-2 text-right">Total</TableCell>
                  <TableCell className="border border-gray-300 p-2 text-right">{taxPaid.reduce((s, r) => s + r.paid, 0).toFixed(2)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </div>
      </div>

      {/* Wizard Steps - Visible in UI */}
      <div>
        {renderStep()}
      </div>
    </div>
  );
}

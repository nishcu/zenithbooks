
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
  TableFooter
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, Save, FileJson, AlertTriangle } from "lucide-react";
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
import { AccountingContext } from "@/context/accounting-context";
import { allAccounts } from "@/lib/accounts";


const states = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
    "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
    "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

export default function Gstr3bWizardPage() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const { journalVouchers } = useContext(AccountingContext)!;

  const initialStep1Data = useMemo(() => {
    const salesInvoices = journalVouchers.filter(v => v && v.id && v.id.startsWith("INV-"));
    const salesReturns = journalVouchers.filter(v => v && v.id && v.id.startsWith("CN-"));

    const outwardTaxableValue = salesInvoices.reduce((acc, v) => acc + (v.lines.find(l => l.account === '4010')?.credit ? parseFloat(v.lines.find(l => l.account === '4010')!.credit) : 0), 0);
    const outwardTax = salesInvoices.reduce((acc, v) => acc + (v.lines.find(l => l.account === '2110')?.credit ? parseFloat(v.lines.find(l => l.account === '2110')!.credit) : 0), 0);

    const salesReturnTaxableValue = salesReturns.reduce((acc, v) => acc + (v.lines.find(l => l.account === '4010')?.debit ? parseFloat(v.lines.find(l => l.account === '4010')!.debit) : 0), 0);
    const salesReturnTax = salesReturns.reduce((acc, v) => acc + (v.lines.find(l => l.account === '2110')?.debit ? parseFloat(v.lines.find(l => l.account === '2110')!.debit) : 0), 0);

    return [
      {
        description: "(a) Outward taxable supplies (other than zero rated, nil rated and exempted)",
        taxableValue: outwardTaxableValue - salesReturnTaxableValue,
        integratedTax: outwardTax - salesReturnTax, // Assuming all IGST for simplicity
        centralTax: 0,
        stateTax: 0,
        cess: 0,
      },
      {
        description: "(b) Outward taxable supplies (zero rated)",
        taxableValue: 0,
        integratedTax: 0,
        centralTax: 0,
        stateTax: 0,
        cess: 0,
      },
      {
        description: "(c) Other outward supplies (nil rated, exempted)",
        taxableValue: 0,
        integratedTax: 0,
        centralTax: 0,
        stateTax: 0,
        cess: 0,
      },
      {
        description: "(d) Inward supplies (liable to reverse charge)",
        taxableValue: 0,
        integratedTax: 0,
        centralTax: 0,
        stateTax: 0,
        cess: 0,
      },
      {
        description: "(e) Non-GST outward supplies",
        taxableValue: 0,
        integratedTax: 0,
        centralTax: 0,
        stateTax: 0,
        cess: 0,
      },
    ];
  }, [journalVouchers]);
  
  const initialStep3Data = useMemo(() => {
    const purchaseBills = journalVouchers.filter(v => v && v.id && v.id.startsWith("BILL-"));
    const purchaseReturns = journalVouchers.filter(v => v && v.id && v.id.startsWith("DN-"));

    const itcFromPurchases = purchaseBills.reduce((acc, v) => acc + (v.lines.find(l => l.account === '2110')?.debit ? parseFloat(v.lines.find(l => l.account === '2110')!.debit) : 0), 0);
    const itcReversedOnReturns = purchaseReturns.reduce((acc, v) => acc + (v.lines.find(l => l.account === '2110')?.credit ? parseFloat(v.lines.find(l => l.account === '2110')!.credit) : 0), 0);

    return {
        importGoods: { igst: 0, cess: 0 },
        importServices: { igst: 0, cess: 0 },
        inwardReverseCharge: { igst: 0, cgst: 0, sgst: 0, cess: 0 },
        inwardISD: { igst: 0, cgst: 0, sgst: 0, cess: 0 },
        allOtherITC: { igst: itcFromPurchases, cgst: 0, sgst: 0, cess: 0 }, // Assuming all IGST for simplicity
        rule42_43: { igst: 0, cgst: 0, sgst: 0, cess: 0 },
        othersReversed: { igst: itcReversedOnReturns, cgst: 0, sgst: 0, cess: 0 },
    };
  }, [journalVouchers]);


  const [step1Data, setStep1Data] = useState(initialStep1Data);
  const [step2Data, setStep2Data] = useState<{placeOfSupply: string, taxableValue: number, integratedTax: number}[]>([]);
  const [step3Data, setStep3Data] = useState(initialStep3Data);
  const [step4Data, setStep4Data] = useState<any[]>([]);
  const [step5Data, setStep5Data] = useState<{
    liability: { igst: number, cgst: number, sgst: number, cess: number },
    availableItc: { igst: number, cgst: number, sgst: number, cess: number },
    paidThroughItc: any
  }>({
    liability: { igst: 0, cgst: 0, sgst: 0, cess: 0 },
    availableItc: { igst: 0, cgst: 0, sgst: 0, cess: 0 },
    paidThroughItc: {
        igst: { igst: 0, cgst: 0, sgst: 0, cess: 0 },
        cgst: { igst: 0, cgst: 0, sgst: 0, cess: 0 },
        sgst: { igst: 0, cgst: 0, sgst: 0, cess: 0 },
        cess: { igst: 0, cgst: 0, sgst: 0, cess: 0 },
    }
  });

  useEffect(() => {
    setStep1Data(initialStep1Data);
    setStep3Data(initialStep3Data);
  }, [initialStep1Data, initialStep3Data]);
  
  useEffect(() => {
    const totalLiability = step1Data.reduce((acc, row) => ({
      igst: acc.igst + row.integratedTax,
      cgst: acc.cgst + row.centralTax,
      sgst: acc.sgst + row.stateTax,
      cess: acc.cess + row.cess,
    }), { igst: 0, cgst: 0, sgst: 0, cess: 0 });

    const totalAvailableItc = Object.values(step3Data).reduce((acc, section) => {
        if (section.hasOwnProperty('igst')) acc.igst += (section as {igst: number}).igst || 0;
        if (section.hasOwnProperty('cgst')) acc.cgst += (section as {cgst: number}).cgst || 0;
        if (section.hasOwnProperty('sgst')) acc.sgst += (section as {sgst: number}).sgst || 0;
        if (section.hasOwnProperty('cess')) acc.cess += (section as {cess: number}).cess || 0;
        return acc;
    }, { igst: 0, cgst: 0, sgst: 0, cess: 0 });
    
    // Subtract reversed ITC
    totalAvailableItc.igst -= step3Data.rule42_43.igst + step3Data.othersReversed.igst;
    totalAvailableItc.cgst -= step3Data.rule42_43.cgst + step3Data.othersReversed.cgst;
    totalAvailableItc.sgst -= step3Data.rule42_43.sgst + step3Data.othersReversed.sgst;
    totalAvailableItc.cess -= step3Data.rule42_43.cess + step3Data.othersReversed.cess;


    // Basic ITC utilization logic
    const paidIgst = Math.min(totalLiability.igst, totalAvailableItc.igst);
    
    setStep5Data(prev => ({
        ...prev,
        liability: totalLiability,
        availableItc: totalAvailableItc,
        paidThroughItc: {
          igst: { igst: paidIgst, cgst: 0, sgst: 0, cess: 0 },
          cgst: { igst: 0, cgst: 0, sgst: 0, cess: 0 },
          sgst: { igst: 0, cgst: 0, sgst: 0, cess: 0 },
          cess: { igst: 0, cgst: 0, sgst: 0, cess: 0 },
        }
    }));
  }, [step1Data, step3Data]);


  const handleStep1Change = (index: number, field: keyof typeof step1Data[0], value: string) => {
    const newData = [...step1Data];
    (newData[index] as any)[field] = parseFloat(value) || 0;
    setStep1Data(newData);
  };

  const handleStep2Change = (index: number, field: keyof typeof step2Data[0], value: string) => {
    const newData = [...step2Data];
    if (field !== 'placeOfSupply') {
        (newData[index] as any)[field] = parseFloat(value) || 0;
    } else {
         (newData[index] as any)[field] = value;
    }
    setStep2Data(newData);
  };
  const addStep2Row = () => setStep2Data([...step2Data, { placeOfSupply: "", taxableValue: 0, integratedTax: 0 }]);

  const handleStep3Change = (section: keyof typeof step3Data, field: 'igst' | 'cgst' | 'sgst' | 'cess', value: string) => {
      const newData = {...step3Data};
      (newData[section] as any)[field] = parseFloat(value) || 0;
      setStep3Data(newData);
  }

  const handleStep4Change = (index: number, field: 'interState' | 'intraState', value: string) => {
    const newData = [...step4Data];
    (newData[index] as any)[field] = parseFloat(value) || 0;
    setStep4Data(newData);
  };
  
  const handleStep5Change = (taxType: 'igst' | 'cgst' | 'sgst' | 'cess', creditType: 'igst' | 'cgst' | 'sgst' | 'cess', value: string) => {
    const newData = {...step5Data};
    (newData.paidThroughItc[taxType] as any)[creditType] = parseFloat(value) || 0;
    setStep5Data(newData);
  }

  const handleNext = () => {
    toast({
      title: `Step ${step} Saved!`,
      description: `Moving to Step ${step + 1}.`,
    });
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
     setStep(prev => prev - 1);
  };
  
  const handleGenerateJson = () => {
      toast({
          title: "JSON Generation Started",
          description: "Your GSTR-3B JSON file is being generated and will be downloaded shortly. (This is a simulation)."
      })
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Outward and Inward Supplies</CardTitle>
              <CardDescription>
                Table 3.1: Details of Outward Supplies and inward supplies liable to reverse charge.
                <br />
                Review the auto-populated data from your journal and make any necessary adjustments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/3">Nature of Supplies</TableHead>
                    <TableHead className="text-right">Total Taxable Value</TableHead>
                    <TableHead className="text-right">Integrated Tax</TableHead>
                    <TableHead className="text-right">Central Tax</TableHead>
                    <TableHead className="text-right">State/UT Tax</TableHead>
                    <TableHead className="text-right">Cess</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {step1Data.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Label className="font-normal">{row.description}</Label>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="text-right"
                          value={row.taxableValue}
                          onChange={(e) => handleStep1Change(index, 'taxableValue', e.target.value)}
                        />
                      </TableCell>
                       <TableCell>
                        <Input
                          type="number"
                          className="text-right"
                          value={row.integratedTax}
                          onChange={(e) => handleStep1Change(index, 'integratedTax', e.target.value)}
                        />
                      </TableCell>
                       <TableCell>
                        <Input
                          type="number"
                          className="text-right"
                          value={row.centralTax}
                           onChange={(e) => handleStep1Change(index, 'centralTax', e.target.value)}
                        />
                      </TableCell>
                       <TableCell>
                        <Input
                          type="number"
                          className="text-right"
                          value={row.stateTax}
                           onChange={(e) => handleStep1Change(index, 'stateTax', e.target.value)}
                        />
                      </TableCell>
                       <TableCell>
                        <Input
                          type="number"
                          className="text-right"
                          value={row.cess}
                           onChange={(e) => handleStep1Change(index, 'cess', e.target.value)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
              <CardTitle>Step 2: Inter-state Supplies</CardTitle>
              <CardDescription>
                Table 3.2: Of the supplies shown in 3.1 (a) above, details of inter-State supplies made to unregistered persons, composition taxable persons and UIN holders.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/2">Place of Supply (State/UT)</TableHead>
                    <TableHead className="text-right">Total Taxable Value</TableHead>
                    <TableHead className="text-right">Amount of Integrated Tax</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {step2Data.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Select value={row.placeOfSupply} onValueChange={(value) => handleStep2Change(index, 'placeOfSupply', value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a State/UT"/>
                            </SelectTrigger>
                            <SelectContent>
                                {states.map(state => <SelectItem key={state} value={state}>{state}</SelectItem>)}
                            </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="text-right"
                          value={row.taxableValue}
                          onChange={(e) => handleStep2Change(index, 'taxableValue', e.target.value)}
                        />
                      </TableCell>
                       <TableCell>
                        <Input
                          type="number"
                          className="text-right"
                          value={row.integratedTax}
                          onChange={(e) => handleStep2Change(index, 'integratedTax', e.target.value)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button variant="outline" size="sm" className="mt-4" onClick={addStep2Row}>Add Row</Button>
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
                        <CardTitle>Step 3: Eligible ITC</CardTitle>
                        <CardDescription>Table 4: Details of Eligible Input Tax Credit. Auto-populated from your purchase records.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-1/2">Details</TableHead>
                                    <TableHead className="text-right">Integrated Tax</TableHead>
                                    <TableHead className="text-right">Central Tax</TableHead>
                                    <TableHead className="text-right">State/UT Tax</TableHead>
                                    <TableHead className="text-right">Cess</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow className="bg-muted/50"><TableCell colSpan={5} className="font-bold"> (A) ITC Available (whether in full or part)</TableCell></TableRow>
                                <TableRow><TableCell>(1) Import of goods</TableCell>
                                    <TableCell><Input type="number" className="text-right" value={step3Data.importGoods.igst} onChange={(e) => handleStep3Change('importGoods', 'igst', e.target.value)} /></TableCell>
                                    <TableCell colSpan={2} className="bg-muted"></TableCell>
                                    <TableCell><Input type="number" className="text-right" value={step3Data.importGoods.cess} onChange={(e) => handleStep3Change('importGoods', 'cess', e.target.value)} /></TableCell>
                                </TableRow>
                                 <TableRow><TableCell>(2) Import of services</TableCell>
                                    <TableCell><Input type="number" className="text-right" value={step3Data.importServices.igst} onChange={(e) => handleStep3Change('importServices', 'igst', e.target.value)} /></TableCell>
                                     <TableCell colSpan={2} className="bg-muted"></TableCell>
                                    <TableCell><Input type="number" className="text-right" value={step3Data.importServices.cess} onChange={(e) => handleStep3Change('importServices', 'cess', e.target.value)}/></TableCell>
                                </TableRow>
                                <TableRow><TableCell>(3) Inward supplies liable to reverse charge (other than 1 & 2 above)</TableCell>
                                    <TableCell><Input type="number" className="text-right" value={step3Data.inwardReverseCharge.igst} onChange={(e) => handleStep3Change('inwardReverseCharge', 'igst', e.target.value)} /></TableCell>
                                    <TableCell><Input type="number" className="text-right" value={step3Data.inwardReverseCharge.cgst} onChange={(e) => handleStep3Change('inwardReverseCharge', 'cgst', e.target.value)} /></TableCell>
                                    <TableCell><Input type="number" className="text-right" value={step3Data.inwardReverseCharge.sgst} onChange={(e) => handleStep3Change('inwardReverseCharge', 'sgst', e.target.value)} /></TableCell>
                                    <TableCell><Input type="number" className="text-right" value={step3Data.inwardReverseCharge.cess} onChange={(e) => handleStep3Change('inwardReverseCharge', 'cess', e.target.value)} /></TableCell>
                                </TableRow>
                                <TableRow><TableCell>(4) Inward supplies from ISD</TableCell>
                                    <TableCell><Input type="number" className="text-right" value={step3Data.inwardISD.igst} onChange={(e) => handleStep3Change('inwardISD', 'igst', e.target.value)}/></TableCell>
                                    <TableCell><Input type="number" className="text-right" value={step3Data.inwardISD.cgst} onChange={(e) => handleStep3Change('inwardISD', 'cgst', e.target.value)}/></TableCell>
                                    <TableCell><Input type="number" className="text-right" value={step3Data.inwardISD.sgst} onChange={(e) => handleStep3Change('inwardISD', 'sgst', e.target.value)}/></TableCell>
                                    <TableCell><Input type="number" className="text-right" value={step3Data.inwardISD.cess} onChange={(e) => handleStep3Change('inwardISD', 'cess', e.target.value)}/></TableCell>
                                </TableRow>
                                <TableRow><TableCell>(5) All other ITC</TableCell>
                                    <TableCell><Input type="number" className="text-right" value={step3Data.allOtherITC.igst} onChange={(e) => handleStep3Change('allOtherITC', 'igst', e.target.value)}/></TableCell>
                                    <TableCell><Input type="number" className="text-right" value={step3Data.allOtherITC.cgst} onChange={(e) => handleStep3Change('allOtherITC', 'cgst', e.target.value)}/></TableCell>
                                    <TableCell><Input type="number" className="text-right" value={step3Data.allOtherITC.sgst} onChange={(e) => handleStep3Change('allOtherITC', 'sgst', e.target.value)}/></TableCell>
                                    <TableCell><Input type="number" className="text-right" value={step3Data.allOtherITC.cess} onChange={(e) => handleStep3Change('allOtherITC', 'cess', e.target.value)}/></TableCell>
                                </TableRow>

                                <TableRow className="bg-muted/50"><TableCell colSpan={5} className="font-bold">(B) ITC Reversed</TableCell></TableRow>
                                <TableRow><TableCell>(1) As per rules 42 & 43 of CGST Rules</TableCell>
                                    <TableCell><Input type="number" className="text-right" value={step3Data.rule42_43.igst} onChange={(e) => handleStep3Change('rule42_43', 'igst', e.target.value)}/></TableCell>
                                    <TableCell><Input type="number" className="text-right" value={step3Data.rule42_43.cgst} onChange={(e) => handleStep3Change('rule42_43', 'cgst', e.target.value)}/></TableCell>
                                    <TableCell><Input type="number" className="text-right" value={step3Data.rule42_43.sgst} onChange={(e) => handleStep3Change('rule42_43', 'sgst', e.target.value)}/></TableCell>
                                    <TableCell><Input type="number" className="text-right" value={step3Data.rule42_43.cess} onChange={(e) => handleStep3Change('rule42_43', 'cess', e.target.value)}/></TableCell>
                                </TableRow>
                                <TableRow><TableCell>(2) Others</TableCell>
                                    <TableCell><Input type="number" className="text-right" value={step3Data.othersReversed.igst} onChange={(e) => handleStep3Change('othersReversed', 'igst', e.target.value)}/></TableCell>
                                    <TableCell><Input type="number" className="text-right" value={step3Data.othersReversed.cgst} onChange={(e) => handleStep3Change('othersReversed', 'cgst', e.target.value)}/></TableCell>
                                    <TableCell><Input type="number" className="text-right" value={step3Data.othersReversed.sgst} onChange={(e) => handleStep3Change('othersReversed', 'sgst', e.target.value)}/></TableCell>
                                    <TableCell><Input type="number" className="text-right" value={step3Data.othersReversed.cess} onChange={(e) => handleStep3Change('othersReversed', 'cess', e.target.value)}/></TableCell>
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
        case 4:
            return (
                <Card>
                    <CardHeader>
                        <CardTitle>Step 4: Exempt, nil and Non-GST inward supplies</CardTitle>
                        <CardDescription>Table 5: Values of exempt, nil-rated and non-GST inward supplies.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-2/3">Nature of Supplies</TableHead>
                                    <TableHead className="text-right">Inter-State supplies</TableHead>
                                    <TableHead className="text-right">Intra-State supplies</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {step4Data.map((row, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            <Label className="font-normal">{row.description}</Label>
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                            type="number"
                                            className="text-right"
                                            value={row.interState}
                                            onChange={(e) => handleStep4Change(index, 'interState', e.target.value)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                            type="number"
                                            className="text-right"
                                            value={row.intraState}
                                            onChange={(e) => handleStep4Change(index, 'intraState', e.target.value)}
                                            />
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
        case 5:
            const { liability, availableItc, paidThroughItc } = step5Data;
            
            const cashPayableIgst = liability.igst - (paidThroughItc.igst?.igst || 0);
            const cashPayableCgst = liability.cgst - (paidThroughItc.cgst?.cgst || 0) - (paidThroughItc.cgst?.igst || 0);
            const cashPayableSgst = liability.sgst - (paidThroughItc.sgst?.sgst || 0) - (paidThroughItc.sgst?.igst || 0);
            const cashPayableCess = liability.cess - (paidThroughItc.cess?.cess || 0);


            return (
                 <Card>
                    <CardHeader>
                        <CardTitle>Step 5: Payment of Tax</CardTitle>
                        <CardDescription>Table 6.1: Enter ITC amounts to be utilized for tax payment. Balance will be payable in cash.</CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="min-w-[200px]">Description</TableHead>
                                    <TableHead className="text-right">Total Tax Liability</TableHead>
                                    <TableHead className="text-right">Paid through ITC (IGST)</TableHead>
                                    <TableHead className="text-right">Paid through ITC (CGST)</TableHead>
                                    <TableHead className="text-right">Paid through ITC (SGST)</TableHead>
                                    <TableHead className="text-right">Paid through ITC (Cess)</TableHead>
                                    <TableHead className="text-right">Tax to be paid in cash</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                 <TableRow>
                                    <TableCell className="font-medium">IGST</TableCell>
                                    <TableCell className="text-right font-mono">{liability.igst.toFixed(2)}</TableCell>
                                    <TableCell><Input type="number" className="text-right" value={paidThroughItc.igst.igst} onChange={(e) => handleStep5Change('igst', 'igst', e.target.value)}/></TableCell>
                                    <TableCell><Input type="number" className="text-right" disabled value={0} /></TableCell>
                                    <TableCell><Input type="number" className="text-right" disabled value={0} /></TableCell>
                                    <TableCell><Input type="number" className="text-right" disabled value={0} /></TableCell>
                                    <TableCell className="text-right font-mono">{cashPayableIgst.toFixed(2)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">CGST</TableCell>
                                    <TableCell className="text-right font-mono">{liability.cgst.toFixed(2)}</TableCell>
                                    <TableCell><Input type="number" className="text-right" value={paidThroughItc.cgst.igst} onChange={(e) => handleStep5Change('cgst', 'igst', e.target.value)} /></TableCell>
                                    <TableCell><Input type="number" className="text-right" value={paidThroughItc.cgst.cgst} onChange={(e) => handleStep5Change('cgst', 'cgst', e.target.value)}/></TableCell>
                                    <TableCell><Input type="number" className="text-right" disabled value={0} /></TableCell>
                                    <TableCell><Input type="number" className="text-right" disabled value={0} /></TableCell>
                                    <TableCell className="text-right font-mono">{cashPayableCgst.toFixed(2)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">SGST</TableCell>
                                    <TableCell className="text-right font-mono">{liability.sgst.toFixed(2)}</TableCell>
                                    <TableCell><Input type="number" className="text-right" value={paidThroughItc.sgst.igst} onChange={(e) => handleStep5Change('sgst', 'igst', e.target.value)} /></TableCell>
                                    <TableCell><Input type="number" className="text-right" disabled value={0} /></TableCell>
                                    <TableCell><Input type="number" className="text-right" value={paidThroughItc.sgst.sgst} onChange={(e) => handleStep5Change('sgst', 'sgst', e.target.value)} /></TableCell>
                                    <TableCell><Input type="number" className="text-right" disabled value={0} /></TableCell>
                                    <TableCell className="text-right font-mono">{cashPayableSgst.toFixed(2)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">Cess</TableCell>
                                    <TableCell className="text-right font-mono">{liability.cess.toFixed(2)}</TableCell>
                                    <TableCell><Input type="number" className="text-right" disabled value={0} /></TableCell>
                                    <TableCell><Input type="number" className="text-right" disabled value={0} /></TableCell>
                                    <TableCell><Input type="number" className="text-right" disabled value={0} /></TableCell>
                                    <TableCell><Input type="number" className="text-right" value={paidThroughItc.cess.cess} onChange={(e) => handleStep5Change('cess', 'cess', e.target.value)} /></TableCell>
                                    <TableCell className="text-right font-mono">{cashPayableCess.toFixed(2)}</TableCell>
                                </TableRow>
                            </TableBody>
                            <TableFooter>
                                 <TableRow>
                                    <TableCell colSpan={2} className="text-right font-bold">Available ITC</TableCell>
                                    <TableCell className="text-right font-mono">{availableItc.igst.toFixed(2)}</TableCell>
                                    <TableCell className="text-right font-mono">{availableItc.cgst.toFixed(2)}</TableCell>
                                    <TableCell className="text-right font-mono">{availableItc.sgst.toFixed(2)}</TableCell>
                                    <TableCell className="text-right font-mono">{availableItc.cess.toFixed(2)}</TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            </TableFooter>
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
                        <CardTitle>Step 6: Generate JSON for Filing</CardTitle>
                        <CardDescription>
                           You have reviewed your GSTR-3B data. The final step is to generate the JSON file for uploading to the GST portal.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Final Check</AlertTitle>
                            <AlertDescription>
                                Please review all the data entered in the previous steps carefully. Once you generate the JSON file, you should upload it to the GST portal to complete your filing.
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button variant="outline" onClick={handleBack}>
                            <ArrowLeft className="mr-2" /> Back
                        </Button>
                        <Button onClick={handleGenerateJson}>
                           <FileJson className="mr-2" />
                           Generate GSTR-3B JSON
                        </Button>
                    </CardFooter>
                </Card>
            );
      default:
        return null;
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
          <h1 className="text-3xl font-bold">GSTR-3B Filing Wizard</h1>
          <p className="text-muted-foreground">Period: May 2024</p>
        </div>
      </div>

      {renderStep()}
    </div>
  );
}

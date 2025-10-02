
"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormField, FormItem, FormControl, FormMessage, FormLabel, FormDescription } from "@/components/ui/form";
import {
  ArrowLeft,
  ArrowRight,
  Printer
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { useReactToPrint } from "react-to-print";

const formSchema = z.object({
  landlordName: z.string().min(3, "Lessor name is required."),
  landlordParentage: z.string().min(3, "Parentage is required."),
  landlordAddress: z.string().min(10, "Lessor address is required."),
  
  tenantName: z.string().min(3, "Lessee name is required."),
  tenantParentage: z.string().min(3, "Parentage is required."),
  tenantAddress: z.string().min(10, "Lessee address is required."),

  propertyAddress: z.string().min(10, "Property address is required."),
  propertyType: z.enum(["residential", "commercial"]).default("commercial"),

  leaseStartDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  leaseTermMonths: z.coerce.number().positive("Must be a positive number.").default(36),
  lockInMonths: z.coerce.number().min(0, "Cannot be negative.").default(12),

  monthlyRent: z.coerce.number().positive("Rent must be a positive number."),
  rentPaymentDay: z.coerce.number().min(1).max(28, "Must be between 1 and 28.").default(5),
  rentIncreasePercent: z.coerce.number().min(0).max(100).default(5),
  rentIncreaseFrequency: z.coerce.number().min(1).default(12),
  
  securityDeposit: z.coerce.number().min(0, "Cannot be negative."),
  depositRefundDays: z.coerce.number().positive().default(60),

  noticePeriodMonths: z.coerce.number().positive().default(3),

  allowPets: z.boolean().default(false),
  allowSubletting: z.boolean().default(false),
});

type FormData = z.infer<typeof formSchema>;

export default function LeaseDeedPage() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const printRef = useRef(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      landlordName: "",
      landlordParentage: "",
      landlordAddress: "",
      tenantName: "",
      tenantParentage: "",
      tenantAddress: "",
      propertyAddress: "",
      propertyType: "commercial",
      leaseStartDate: new Date().toISOString().split("T")[0],
      leaseTermMonths: 36,
      lockInMonths: 12,
      monthlyRent: 50000,
      rentPaymentDay: 5,
      rentIncreasePercent: 5,
      rentIncreaseFrequency: 12,
      securityDeposit: 300000,
      depositRefundDays: 60,
      noticePeriodMonths: 3,
      allowPets: false,
      allowSubletting: false,
    },
  });

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
  });

  const processStep = async () => {
    let fieldsToValidate: (keyof FormData)[] = [];
    switch (step) {
        case 1:
            fieldsToValidate = ["landlordName", "landlordParentage", "landlordAddress", "tenantName", "tenantParentage", "tenantAddress", "propertyAddress", "propertyType"];
            break;
        case 2:
            fieldsToValidate = ["leaseStartDate", "leaseTermMonths", "lockInMonths", "monthlyRent", "rentPaymentDay", "securityDeposit", "depositRefundDays"];
            break;
        case 3:
            fieldsToValidate = ["noticePeriodMonths", "allowPets", "allowSubletting"];
            break;
    }
    
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setStep(prev => prev + 1);
       if (step < 4) {
        toast({
            title: `Step ${step} Saved`,
            description: `Proceeding to step ${step + 1}.`,
        });
      }
    } else {
        toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Please correct the errors before proceeding.",
        });
    }
  };

  const handleBack = () => setStep(prev => prev - 1);

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Card>
            <CardHeader><CardTitle>Step 1: Parties & Property</CardTitle><CardDescription>Enter details about the lessor, lessee, and the leased property.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold mb-2">Lessor (Property Owner) Details</h3>
                    <div className="space-y-4 p-4 border rounded-lg">
                        <FormField control={form.control} name="landlordName" render={({ field }) => ( <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="landlordParentage" render={({ field }) => ( <FormItem><FormLabel>S/o, W/o, D/o</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="landlordAddress" render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>
                </div>
                 <div>
                    <h3 className="text-lg font-semibold mb-2">Lessee (Tenant) Details</h3>
                    <div className="space-y-4 p-4 border rounded-lg">
                        <FormField control={form.control} name="tenantName" render={({ field }) => ( <FormItem><FormLabel>Full Name / Company Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="tenantParentage" render={({ field }) => ( <FormItem><FormLabel>S/o, W/o, D/o / Authorized Signatory</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="tenantAddress" render={({ field }) => ( <FormItem><FormLabel>Current Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>
                </div>
                 <div>
                    <h3 className="text-lg font-semibold mb-2">Property Details</h3>
                    <div className="space-y-4 p-4 border rounded-lg">
                        <FormField control={form.control} name="propertyAddress" render={({ field }) => ( <FormItem><FormLabel>Full Address of Leased Property</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="propertyType" render={({ field }) => (
                            <FormItem><FormLabel>Property Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent><SelectItem value="commercial">Commercial</SelectItem><SelectItem value="residential">Residential</SelectItem></SelectContent>
                                </Select>
                            <FormMessage /></FormItem>
                        )}/>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="justify-end"><Button type="button" onClick={processStep}>Next <ArrowRight className="ml-2"/></Button></CardFooter>
          </Card>
        );
      case 2:
        return (
          <Card>
            <CardHeader><CardTitle>Step 2: Rent & Deposit</CardTitle><CardDescription>Define the financial terms of the lease.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="monthlyRent" render={({ field }) => ( <FormItem><FormLabel>Monthly Rent (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="rentPaymentDay" render={({ field }) => ( <FormItem><FormLabel>Rent Due Day of Month</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                     <FormField control={form.control} name="rentIncreasePercent" render={({ field }) => ( <FormItem><FormLabel>Rent Increase (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormDescription>Periodic rent increase percentage.</FormDescription><FormMessage /></FormItem> )}/>
                     <FormField control={form.control} name="rentIncreaseFrequency" render={({ field }) => ( <FormItem><FormLabel>Increase After (Months)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormDescription>Rent will increase after every X months.</FormDescription><FormMessage /></FormItem> )}/>
                </div>
                <Separator/>
                 <div className="grid md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="securityDeposit" render={({ field }) => ( <FormItem><FormLabel>Security Deposit (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="depositRefundDays" render={({ field }) => ( <FormItem><FormLabel>Deposit Refund (Days)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormDescription>To be refunded within X days of vacation.</FormDescription><FormMessage /></FormItem> )}/>
                </div>
            </CardContent>
            <CardFooter className="justify-between"><Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button><Button type="button" onClick={processStep}>Next <ArrowRight className="ml-2"/></Button></CardFooter>
          </Card>
        );
      case 3:
          return (
            <Card>
                <CardHeader><CardTitle>Step 3: Lease & Occupancy Terms</CardTitle><CardDescription>Define the duration, notice period, and rules of the lease.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <FormField control={form.control} name="leaseStartDate" render={({ field }) => ( <FormItem><FormLabel>Lease Start Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="leaseTermMonths" render={({ field }) => ( <FormItem><FormLabel>Lease Term (Months)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="lockInMonths" render={({ field }) => ( <FormItem><FormLabel>Lock-in Period (Months)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>
                    <Separator/>
                     <FormField control={form.control} name="noticePeriodMonths" render={({ field }) => ( <FormItem className="max-w-xs"><FormLabel>Notice Period (Months)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormDescription>For termination by either party.</FormDescription><FormMessage /></FormItem> )}/>
                    <Separator/>
                    <h3 className="font-medium">Specific Clauses</h3>
                    <div className="space-y-2">
                        <FormField control={form.control} name="allowPets" render={({ field }) => ( <FormItem className="flex items-center gap-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><Label className="font-normal">Allow pets on the property</Label></FormItem> )}/>
                        <FormField control={form.control} name="allowSubletting" render={({ field }) => ( <FormItem className="flex items-center gap-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><Label className="font-normal">Allow sub-letting of the property</Label></FormItem> )}/>
                    </div>
                </CardContent>
                <CardFooter className="justify-between"><Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button><Button type="button" onClick={processStep}>Preview Draft <ArrowRight className="ml-2"/></Button></CardFooter>
            </Card>
          );
      case 4:
        const formData = form.getValues();
        const dateOptions: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' };
        const startDate = new Date(formData.leaseStartDate).toLocaleDateString('en-GB', dateOptions);
        const termInYears = formData.leaseTermMonths / 12;

        return (
             <Card>
                <CardHeader><CardTitle>Final Step: Preview & Download</CardTitle><CardDescription>Review the generated Lease Deed.</CardDescription></CardHeader>
                <CardContent>
                    <div ref={printRef} className="prose prose-sm dark:prose-invert max-w-none border rounded-md p-6 bg-muted/20 leading-relaxed">
                        <h2 className="text-center font-bold">DEED OF LEASE</h2>
                        <p>This Deed of Lease is made at <strong>{formData.landlordAddress.split(',').pop()?.trim()}</strong> this <strong>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></p>
                        
                        <p className="font-bold">BETWEEN:</p>
                        <p><strong>{formData.landlordName}</strong>, {formData.landlordParentage}, resident of {formData.landlordAddress}. (Hereinafter called 'The Lessor' of the One Part).</p>
                        
                        <p className="font-bold">AND:</p>
                        <p><strong>{formData.tenantName}</strong>, {formData.tenantParentage}, resident of {formData.tenantAddress}. (Hereinafter called 'The Lessee' of the Other Part).</p>

                        <h4 className="font-bold mt-4">WHEREAS:</h4>
                        <ol className="list-[upper-alpha] list-inside space-y-2">
                            <li>The Lessor is the absolute owner of or otherwise well and sufficiently entitled to the land and premises described in the Schedule hereunder written.</li>
                            <li>The Lessor has agreed to grant to the Lessee a lease in respect of the said land and premises for a term of <strong>{termInYears.toFixed(1)} years</strong> in the manner hereinafter appearing.</li>
                        </ol>

                        <h4 className="font-bold mt-4">NOW THIS DEED WITNESSETH AS FOLLOWS:</h4>
                        <ol className="list-decimal list-inside space-y-3">
                            <li>In pursuance of the said agreement and in consideration of the rent hereby reserved and of the terms and conditions, covenants and agreements herein contained and on the part of the Lessee to be observed and performed the Lessor doth hereby demise unto the Lessee all that the said land and premises situated at <strong>{formData.propertyAddress}</strong> (hereinafter for the brevity's sake referred to as 'the demised premises') to hold the demised premises unto the Lessee for a term of <strong>{formData.leaseTermMonths} months</strong> commencing from <strong>{startDate}</strong>, yielding and paying therefor during the said term the monthly rent of <strong>₹{formData.monthlyRent.toLocaleString('en-IN')}</strong> free and clear of all deductions and strictly in advance on or before the <strong>{formData.rentPaymentDay}th day</strong> of each and every calendar month.</li>
                            
                            <li>The Lessee hereby covenants with the Lessor as follows:
                                <ul className="list-[lower-alpha] list-inside pl-4 mt-2 space-y-2">
                                    <li>To pay the rent hereby reserved on the days and in the manner aforesaid. If the rent is not paid on the due dates, the Lessee shall pay interest thereon at the rate of 18% per annum from the due date till payment.</li>
                                    <li>To bear, pay and discharge all existing and future rates, taxes, assessment duties, cess, impositions, and other outgoings whatsoever imposed or charged upon the demised land and payable by the occupier.</li>
                                    <li>To keep the demised premises in good and tenantable repairs (reasonable wear and tear excepted).</li>
                                    <li>Not to make any structural alterations or additions to the demised premises without the prior written consent of the Lessor.</li>
                                    <li>To use the demised premises only for <strong>{formData.propertyType}</strong> purposes and not for any illegal or immoral activities.</li>
                                </ul>
                            </li>

                            <li>The Lessor doth hereby covenant with the Lessee that on the Lessee paying the said monthly rent and observing and performing the covenants herein contained, they shall peaceably and quietly hold, possess and enjoy the demised premises during the said term without any eviction, interruption, or disturbance by the Lessor.</li>

                            <li>It is hereby agreed that if the rent shall be in arrears for a space of two months or if any of the covenants on the part of the Lessee shall not be performed, it shall be lawful for the Lessor to re-enter upon the demised premises, without prejudice to the right of action of the Lessor in respect of any breach of the covenants.</li>

                            <li>On the expiration of the term hereby created, all buildings and structures standing on the demised land shall automatically vest in the Lessor without payment of any compensation therefor by the Lessor to the Lessee.</li>

                            <li>The Lessee shall not be entitled, without obtaining in writing the permission of the Lessor, to assign, mortgage, or sublet the demised premises. Such permission shall not be unreasonably withheld.</li>
                        </ol>

                        <p className="mt-8">IN WITNESS WHEREOF, the Lessor and the Lessee have put their respective hands on the original and duplicate hereof the day and year first herein above written.</p>
                        
                         <h4 className="font-bold mt-8">THE SCHEDULE ABOVE REFERRED TO</h4>
                         <p>(Full description of the property being leased)</p>
                         <p>All that piece and parcel of {formData.propertyType} premises situated at: <strong>{formData.propertyAddress}</strong>, with all fittings, fixtures, and appurtenances.</p>

                        <div className="flex justify-between mt-16">
                            <div className="text-center">
                                <p>_________________________</p>
                                <p>(THE LESSOR)</p>
                                <p>{formData.landlordName}</p>
                            </div>
                            <div className="text-center">
                                <p>_________________________</p>
                                <p>(THE LESSEE)</p>
                                <p>{formData.tenantName}</p>
                            </div>
                        </div>
                         <div className="mt-16">
                            <p>WITNESSES:</p>
                            <ol className="list-decimal list-inside mt-8 space-y-8">
                                <li>
                                    <p>Name: _________________________</p>
                                    <p>Address: _______________________</p>
                                    <p>Signature: ______________________</p>
                                </li>
                                <li>
                                    <p>Name: _________________________</p>
                                    <p>Address: _______________________</p>
                                    <p>Signature: ______________________</p>
                                </li>
                            </ol>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="justify-between mt-6">
                  <Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button>
                  <Button onClick={handlePrint}><Printer className="mr-2"/> Print / Save as PDF</Button>
                </CardFooter>
            </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Link href="/legal-documents" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Document Selection
      </Link>
      <div className="text-center">
        <h1 className="text-3xl font-bold">Lease Deed Generator</h1>
        <p className="text-muted-foreground">Follow the steps to create your lease deed.</p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(() => processStep())} className="space-y-8">
          {renderStep()}
        </form>
      </Form>
    </div>
  );
}

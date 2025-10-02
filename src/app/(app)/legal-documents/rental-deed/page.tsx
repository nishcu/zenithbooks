
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
import { ShareButtons } from "@/components/documents/share-buttons";

const formSchema = z.object({
  landlordName: z.string().min(3, "Lessor name is required."),
  landlordParentage: z.string().min(3, "Parentage is required."),
  landlordAddress: z.string().min(10, "Lessor address is required."),
  
  tenantName: z.string().min(3, "Lessee name is required."),
  tenantParentage: z.string().min(3, "Parentage is required."),
  tenantAddress: z.string().min(10, "Lessee address is required."),

  propertyAddress: z.string().min(10, "Property address is required."),
  propertyType: z.enum(["residential", "commercial"]).default("residential"),

  leaseStartDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  leaseTermMonths: z.coerce.number().positive("Must be a positive number.").default(11),
  lockInMonths: z.coerce.number().min(0, "Cannot be negative.").default(6),

  monthlyRent: z.coerce.number().positive("Rent must be a positive number."),
  rentPaymentDay: z.coerce.number().min(1).max(28, "Must be between 1 and 28.").default(5),
  rentIncreasePercent: z.coerce.number().min(0).max(100).default(10),
  rentIncreaseFrequency: z.coerce.number().min(1).default(12),
  
  securityDeposit: z.coerce.number().min(0, "Cannot be negative."),
  depositRefundDays: z.coerce.number().positive().default(30),

  noticePeriodMonths: z.coerce.number().positive().default(1),

  allowPets: z.boolean().default(false),
  allowSubletting: z.boolean().default(false),
});

type FormData = z.infer<typeof formSchema>;

export default function RentalDeedPage() {
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
      propertyType: "residential",
      leaseStartDate: new Date().toISOString().split("T")[0],
      leaseTermMonths: 11,
      lockInMonths: 6,
      monthlyRent: 20000,
      rentPaymentDay: 5,
      rentIncreasePercent: 10,
      rentIncreaseFrequency: 12,
      securityDeposit: 40000,
      depositRefundDays: 30,
      noticePeriodMonths: 1,
      allowPets: false,
      allowSubletting: false,
    },
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
            <CardHeader><CardTitle>Step 1: Parties & Property</CardTitle><CardDescription>Enter details about the landlord, tenant, and the rental property.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold mb-2">Landlord (Lessor) Details</h3>
                    <div className="space-y-4 p-4 border rounded-lg">
                        <FormField control={form.control} name="landlordName" render={({ field }) => ( <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="landlordParentage" render={({ field }) => ( <FormItem><FormLabel>S/o, W/o, D/o</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="landlordAddress" render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>
                </div>
                 <div>
                    <h3 className="text-lg font-semibold mb-2">Tenant (Lessee) Details</h3>
                    <div className="space-y-4 p-4 border rounded-lg">
                        <FormField control={form.control} name="tenantName" render={({ field }) => ( <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="tenantParentage" render={({ field }) => ( <FormItem><FormLabel>S/o, W/o, D/o</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="tenantAddress" render={({ field }) => ( <FormItem><FormLabel>Current Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>
                </div>
                 <div>
                    <h3 className="text-lg font-semibold mb-2">Property Details</h3>
                    <div className="space-y-4 p-4 border rounded-lg">
                        <FormField control={form.control} name="propertyAddress" render={({ field }) => ( <FormItem><FormLabel>Full Address of Rental Property</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="propertyType" render={({ field }) => (
                            <FormItem><FormLabel>Property Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent><SelectItem value="residential">Residential</SelectItem><SelectItem value="commercial">Commercial</SelectItem></SelectContent>
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
            <CardHeader><CardTitle>Step 2: Rent & Deposit</CardTitle><CardDescription>Define the financial terms of the agreement.</CardDescription></CardHeader>
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
                <CardHeader><CardTitle>Step 3: Lease & Occupancy Terms</CardTitle><CardDescription>Define the duration, notice period, and rules.</CardDescription></CardHeader>
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
        const formData = form.watch();
        const dateOptions: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' };
        const startDate = formData.leaseStartDate ? new Date(formData.leaseStartDate).toLocaleDateString('en-GB', dateOptions) : "[Start Date]";
        const endDate = formData.leaseStartDate ? new Date(new Date(formData.leaseStartDate).setMonth(new Date(formData.leaseStartDate).getMonth() + formData.leaseTermMonths)).toLocaleDateString('en-GB', dateOptions) : "[End Date]";

        return (
             <Card>
                <CardHeader><CardTitle>Final Step: Preview & Download</CardTitle><CardDescription>Review the generated Rental Agreement.</CardDescription></CardHeader>
                <CardContent>
                    <div ref={printRef} className="prose prose-sm dark:prose-invert max-w-none border rounded-md p-6 bg-muted/20 leading-relaxed">
                        <h2 className="text-center font-bold">RENTAL AGREEMENT</h2>
                        <p>This Rental Agreement is made and executed on this <strong>{new Date().toLocaleDateString('en-GB', dateOptions)}</strong> at {formData.landlordAddress.split(',').pop()?.trim()}.</p>
                        
                        <p className="font-bold">BETWEEN:</p>
                        <p><strong>{formData.landlordName}</strong>, {formData.landlordParentage}, resident of {formData.landlordAddress}. (Hereinafter called the "LANDLORD" or "LESSOR" of the one part).</p>
                        
                        <p className="font-bold">AND:</p>
                        <p><strong>{formData.tenantName}</strong>, {formData.tenantParentage}, resident of {formData.tenantAddress}. (Hereinafter called the "TENANT" or "LESSEE" of the other part).</p>

                        <p>"LANDLORD" and "TENANT" are hereinafter collectively referred to as "the Parties".</p>
                        
                        <h4 className="font-bold mt-4">WHEREAS:</h4>
                        <ol className="list-[upper-alpha] list-inside space-y-2">
                            <li>The Landlord is the absolute owner of the {formData.propertyType} property situated at <strong>{formData.propertyAddress}</strong> (hereinafter referred to as the "Scheduled Property").</li>
                            <li>The Tenant has approached the Landlord to take on rent the Scheduled Property for {formData.propertyType} purposes.</li>
                            <li>The Landlord has agreed to let out the property to the Tenant on the terms and conditions hereafter appearing.</li>
                        </ol>

                        <h4 className="font-bold mt-4">NOW THIS AGREEMENT WITNESSETH AS FOLLOWS:</h4>
                        <ol className="list-decimal list-inside space-y-3">
                            <li>The tenancy shall commence from <strong>{startDate}</strong> and shall be for a period of <strong>{formData.leaseTermMonths} months</strong>, ending on <strong>{endDate}</strong>.</li>
                            <li>The Tenant shall pay a monthly rent of <strong>₹{(formData.monthlyRent || 0).toLocaleString('en-IN')}</strong>. The rent shall be paid on or before the <strong>{formData.rentPaymentDay}th day</strong> of each English calendar month.</li>
                            <li>The rent shall be increased by <strong>{formData.rentIncreasePercent}%</strong> after every <strong>{formData.rentIncreaseFrequency} months</strong> of tenancy.</li>
                            <li>The Tenant has paid an interest-free security deposit of <strong>₹{(formData.securityDeposit || 0).toLocaleString('en-IN')}</strong> to the Landlord. This deposit will be refunded to the Tenant within <strong>{formData.depositRefundDays} days</strong> of vacating the Scheduled Property, after deducting any arrears of rent or costs of damages caused by the Tenant.</li>
                            <li>There shall be a lock-in period of <strong>{formData.lockInMonths} months</strong> from the commencement of the lease. If the Tenant vacates the property during this period for any reason, the entire security deposit shall be forfeited by the Landlord.</li>
                            <li>After the lock-in period, either party may terminate this agreement by giving <strong>{formData.noticePeriodMonths} month(s)</strong> written notice to the other party.</li>
                            <li>The Tenant shall bear and pay for all charges for electricity, water, internet, gas, and any other utilities consumed on the Scheduled Property directly to the concerned authorities.</li>
                            <li>The Tenant shall use the Scheduled Property only for <strong>{formData.propertyType}</strong> purposes and shall not use it for any illegal, immoral, or commercial activities (unless specified as commercial).</li>
                            <li>The Tenant shall maintain the Scheduled Property in a good, clean, and habitable condition and shall not cause any damage to the fixtures, fittings, and appliances. Any damage caused beyond normal wear and tear shall be repaired at the Tenant's expense.</li>
                            <li>The Tenant shall not make any structural alterations or additions to the Scheduled Property without the prior written consent of the Landlord.</li>
                            <li>The Landlord shall have the right to inspect the Scheduled Property at reasonable times with at least 24 hours prior notice to the Tenant.</li>
                            <li>The Tenant shall {formData.allowPets ? "" : "not"} be allowed to keep pets on the property.</li>
                            <li>The Tenant shall {formData.allowSubletting ? "" : "not"} sublet, assign, or part with the possession of the property or any part thereof without the prior written consent of the Landlord.</li>
                            <li>Any disputes between the parties shall be subject to the exclusive jurisdiction of the courts in {formData.landlordAddress.split(',').pop()?.trim()}.</li>
                        </ol>

                        <p className="mt-8">IN WITNESS WHEREOF, the parties have executed this agreement on the date first above written in the presence of the following witnesses.</p>
                        
                        <div className="flex justify-between mt-16">
                            <div className="text-center">
                                <p>_________________________</p>
                                <p>(LANDLORD)</p>
                                <p>{formData.landlordName}</p>
                            </div>
                            <div className="text-center">
                                <p>_________________________</p>
                                <p>(TENANT)</p>
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
                  <ShareButtons
                    contentRef={printRef}
                    fileName={`Rental_Agreement_${formData.tenantName}`}
                  />
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
        <h1 className="text-3xl font-bold">Rental Agreement Generator</h1>
        <p className="text-muted-foreground">Follow the steps to create your rental deed.</p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(() => processStep())} className="space-y-8">
          {renderStep()}
        </form>
      </Form>
    </div>
  );
}

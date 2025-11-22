
"use client";

import { useState, useRef } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PlusCircle, Printer, Trash2, FileSignature, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ShareButtons } from "@/components/documents/share-buttons";
import { RazorpayCheckout } from "@/components/payment/razorpay-checkout";
import { getServicePricing } from "@/lib/pricing-service";
import { useCertificationRequest } from "@/hooks/use-certification-request";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { useEffect } from "react";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useReactToPrint } from "react-to-print";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

const partnerSchema = z.object({
  name: z.string().min(1, "Partner name is required."),
  isDesignated: z.boolean().default(false),
  contribution: z.coerce.number().min(0, "Contribution must be a positive number."),
  profitShare: z.coerce.number().min(0, "Profit share must be positive.").max(100, "Profit share cannot exceed 100."),
});

const llpAgreementSchema = z.object({
  llpName: z.string().min(3, "LLP Name is required."),
  registeredAddress: z.string().min(10, "Registered address is required."),
  businessActivity: z.string().min(10, "Business activity description is required."),
  agreementDate: z.date({
    required_error: "Agreement date is required.",
  }),
  partners: z.array(partnerSchema).min(2, "At least two partners are required."),
}).refine(data => {
    const totalProfitShare = data.partners.reduce((acc, partner) => acc + partner.profitShare, 0);
    return Math.abs(totalProfitShare - 100) < 0.001;
}, {
    message: "Total profit sharing percentage must be exactly 100%.",
    path: ["partners"],
});

type LlpAgreementFormValues = z.infer<typeof llpAgreementSchema>;

export default function LlpAgreementPage() {
    const [generatedAgreement, setGeneratedAgreement] = useState<string | null>(null);
    const { toast } = useToast();
    const printRef = useRef<HTMLDivElement>(null);
    const [user] = useAuthState(auth);
    const [pricing, setPricing] = useState(null);

    const { handleCertificationRequest, handlePaymentSuccess, isSubmitting: isCertifying } = useCertificationRequest({
      pricing,
      serviceId: 'llp_agreement'
    });

    const form = useForm<LlpAgreementFormValues>({
        resolver: zodResolver(llpAgreementSchema),
        defaultValues: {
            llpName: "",
            registeredAddress: "",
            businessActivity: "",
            partners: [
                { name: "", isDesignated: true, contribution: 0, profitShare: 50 },
                { name: "", isDesignated: true, contribution: 0, profitShare: 50 },
            ]
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "partners",
    });

    // Load pricing data
    useEffect(() => {
      getServicePricing().then(pricingData => {
        setPricing(pricingData);
      }).catch(error => {
        console.error('Error loading pricing:', error);
      });
    }, []);

    const handlePrint = useReactToPrint({
        content: () => printRef.current,
    });
    
    const totalProfit = form.watch("partners").reduce((acc, p) => acc + (Number(p.profitShare) || 0), 0);

    function generateAgreementText(data: LlpAgreementFormValues): string {
        const partnersList = data.partners.map((p, i) => 
            `AND ${p.name}, residing at [Partner ${i+1} Address], hereinafter referred to as "Partner ${i+1}"`
        ).join("\n");

        const designatedPartners = data.partners.filter(p => p.isDesignated).map(p => p.name).join(", ");

        return `
LIMITED LIABILITY PARTNERSHIP AGREEMENT
of
${data.llpName}

This Agreement of Limited Liability Partnership is made at [City] on this ${format(data.agreementDate, 'PPP')}.

BETWEEN:
[First Partner Name], residing at [First Partner Address], hereinafter referred to as "Partner 1"
${partnersList}

(The above persons hereinafter collectively referred to as the "Partners" which expression shall unless it be repugnant to the context or meaning thereof, be deemed to mean and include their heirs, executors, administrators, representatives and assigns of the First Part).

AND

The Partners are desirous of carrying on the business of ${data.businessActivity} in accordance with the provisions of the Limited Liability Partnership Act, 2008.

NOW, IT IS HEREBY AGREED BY AND BETWEEN THE PARTNERS AS FOLLOWS:

1.  **Name and Business:** The name of the LLP shall be **${data.llpName}**. The business of the LLP shall be ${data.businessActivity}.

2.  **Registered Office:** The registered office of the LLP shall be at ${data.registeredAddress}.

3.  **Capital Contribution:** The initial capital contribution of the partners shall be as follows:
    ${data.partners.map(p => `${p.name}: ₹${p.contribution.toLocaleString()}`).join("\n    ")}

4.  **Profit/Loss Sharing:** The net profits and losses of the business shall be shared among the partners in the following proportions:
    ${data.partners.map(p => `${p.name}: ${p.profitShare}%`).join("\n    ")}

5.  **Designated Partners:** The designated partners of the LLP shall be: ${designatedPartners}.

6.  **Management:** The management of the LLP shall be vested in the designated partners. All decisions shall be made by mutual consent.

IN WITNESS WHEREOF, the parties have executed this Agreement on the date first above written.

_________________________
(Partner 1)

${data.partners.slice(1).map((p, i) => `_________________________\n(Partner ${i+2})`).join("\n\n")}
        `;
    }

    function onSubmit(data: LlpAgreementFormValues) {
        try {
            const agreementText = generateAgreementText(data);
            setGeneratedAgreement(agreementText);
            toast({ title: "LLP Agreement Generated Successfully!" });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error Generating Agreement",
                description: "An unexpected error occurred."
            });
            console.error(error);
        }
    }

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <Link href="/legal-documents" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                <ArrowLeft className="size-4" />
                Back to Document Selection
            </Link>
            <div className="text-center">
                <h1 className="text-3xl font-bold">LLP Agreement Generator</h1>
                <p className="mt-2 max-w-2xl mx-auto text-muted-foreground">
                    Create a Limited Liability Partnership (LLP) Agreement as per the LLP Act, 2008.
                </p>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>LLP Details</CardTitle>
                            <CardDescription>Enter the basic details of the LLP.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField control={form.control} name="llpName" render={({ field }) => ( <FormItem><FormLabel>LLP Name</FormLabel><FormControl><Input placeholder="e.g., Zenith Consultants LLP" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="registeredAddress" render={({ field }) => ( <FormItem><FormLabel>Registered Office Address</FormLabel><FormControl><Textarea placeholder="Full address of the LLP's registered office" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="businessActivity" render={({ field }) => ( <FormItem><FormLabel>Principal Business Activity</FormLabel><FormControl><Textarea placeholder="Describe the main business of the LLP" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="agreementDate" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Date of Agreement</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                                </FormItem>
                            )}/>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Partner Details</CardTitle>
                            <CardDescription>Add the details for each partner. The total profit share must be 100%.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {fields.map((field, index) => (
                                <div key={field.id} className="p-4 border rounded-md relative space-y-4">
                                     <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => remove(index)} disabled={fields.length <= 2}>
                                        <Trash2 className="size-4 text-destructive" />
                                    </Button>
                                    <FormField control={form.control} name={`partners.${index}.name`} render={({ field }) => ( <FormItem><FormLabel>Partner Name</FormLabel><FormControl><Input placeholder="Full Name" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name={`partners.${index}.contribution`} render={({ field }) => ( <FormItem><FormLabel>Capital Contribution (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                        <FormField control={form.control} name={`partners.${index}.profitShare`} render={({ field }) => ( <FormItem><FormLabel>Profit Share (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                    </div>
                                    <FormField control={form.control} name={`partners.${index}.isDesignated`} render={({ field }) => (
                                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>Designated Partner</FormLabel>
                                                <FormDescription>This partner is a designated partner under the LLP Act.</FormDescription>
                                            </div>
                                        </FormItem>
                                    )}/>
                                </div>
                            ))}
                             <div className="flex justify-between items-center">
                                <Button type="button" variant="outline" onClick={() => append({ name: "", isDesignated: false, contribution: 0, profitShare: 0 })}>
                                    <PlusCircle className="mr-2" /> Add Partner
                                </Button>
                                <div>
                                    <p className={cn("text-sm font-medium", totalProfit !== 100 ? "text-destructive" : "text-muted-foreground")}>
                                        Total Profit Share: {totalProfit}%
                                    </p>
                                </div>
                            </div>
                            {form.formState.errors.partners && (
                                <p className="text-sm font-medium text-destructive">{form.formState.errors.partners.message}</p>
                            )}
                        </CardContent>
                        <CardFooter>
                            <Button type="submit">
                                Generate Agreement
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
            </Form>

            {generatedAgreement && (
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Generated LLP Agreement</CardTitle>
                            <Button variant="outline" onClick={handlePrint}>
                                <Printer className="mr-2" /> Print
                            </Button>
                        </div>
                        <CardDescription>Review the generated agreement. Note: This is a draft and should be reviewed by a legal professional.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div ref={printRef} className="p-4 border rounded-md bg-secondary/20">
                            <pre className="whitespace-pre-wrap font-sans text-sm">{generatedAgreement}</pre>
                        </div>
                    </CardContent>
                </Card>

                <Card className="mt-8">
                    <CardHeader>
                        <CardTitle>Professional Certification Service</CardTitle>
                        <CardDescription>Get your LLP Agreement professionally reviewed and certified by a qualified legal expert.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Our legal experts will review your LLP agreement for compliance with LLP Act, ensure all necessary clauses are included (partner rights, profit sharing, dissolution terms, etc.), and provide certification for registration and legal validity.
                        </p>
                    </CardContent>
                    <CardFooter>
                        {pricing && pricing.legal_docs?.find(s => s.id === 'llp_agreement')?.price > 0 ? (
                            <RazorpayCheckout
                                amount={pricing.legal_docs.find(s => s.id === 'llp_agreement')?.price || 0}
                                planId="llp_agreement_certification"
                                planName="LLP Agreement Professional Certification"
                                userId={user?.uid || ''}
                                userEmail={user?.email || ''}
                                userName={user?.displayName || ''}
                                onSuccess={(paymentId) => {
                                    handlePaymentSuccess(paymentId, {
                                        reportType: "LLP Agreement Certification",
                                        clientName: form.getValues("llpName"),
                                        formData: form.getValues(),
                                    });
                                }}
                                onFailure={() => {
                                    toast({
                                        variant: "destructive",
                                        title: "Payment Failed",
                                        description: "Payment was not completed. Please try again."
                                    });
                                }}
                            />
                        ) : (
                            <Button type="button" onClick={handleCertificationRequest} disabled={isCertifying}>
                                {isCertifying ? <Loader2 className="mr-2 animate-spin"/> : <FileSignature className="mr-2"/>}
                                Request Professional Certification
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            )}
        </div>
    );
}

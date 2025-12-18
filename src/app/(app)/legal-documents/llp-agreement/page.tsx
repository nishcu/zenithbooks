
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
import { CashfreeCheckout } from "@\/components\/payment\/cashfree-checkout";
import { getServicePricing, onPricingUpdate } from "@/lib/pricing-service";
import { useCertificationRequest } from "@/hooks/use-certification-request";
import { getUserSubscriptionInfo, getEffectiveServicePrice } from "@/lib/service-pricing-utils";
import { useOnDemandUnlock } from "@/hooks/use-on-demand-unlock";
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
    const [step, setStep] = useState(1);
    const { toast } = useToast();
    const printRef = useRef<HTMLDivElement>(null);
    const [user] = useAuthState(auth);
    const [pricing, setPricing] = useState(null);
    const [userSubscriptionInfo, setUserSubscriptionInfo] = useState<{ userType: "business" | "professional" | null; subscriptionPlan: "freemium" | "business" | "professional" | null } | null>(null);
    const [showDocument, setShowDocument] = useState(false);
    useOnDemandUnlock("llp_agreement_download", () => setShowDocument(true));

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

    // Fetch user subscription info
    useEffect(() => {
      if (user) {
        getUserSubscriptionInfo(user.uid).then(setUserSubscriptionInfo);
      }
    }, [user]);

    // Load pricing data with real-time updates
    useEffect(() => {
      getServicePricing().then(pricingData => {
        setPricing(pricingData);
      }).catch(error => {
        console.error('Error loading pricing:', error);
      });

      // Subscribe to real-time pricing updates
      const unsubscribe = onPricingUpdate(pricingData => {
        setPricing(pricingData);
      });

      return () => unsubscribe();
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
            setStep(2);
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

    const basePrice = pricing?.registration_deeds?.find(s => s.id === 'llp_agreement')?.price || 0;
    const effectivePrice = userSubscriptionInfo
      ? getEffectiveServicePrice(
          basePrice,
          userSubscriptionInfo.userType,
          userSubscriptionInfo.subscriptionPlan,
          "registration_deeds"
        )
      : basePrice;

    if (!showDocument && effectivePrice === 0 && generatedAgreement) {
      setShowDocument(true);
    }

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <Link href="/legal-documents" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                <ArrowLeft className="size-4" />
                Back to Document Selection
            </Link>
            <div className="text-center">
                <h1 className="text-3xl font-bold">LLP Agreement Generator</h1>
                <p className="text-muted-foreground">Draft an agreement for a Limited Liability Partnership.</p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    {step === 1 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>LLP Details</CardTitle>
                                <CardDescription>Enter the basic information about your LLP.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <FormField control={form.control} name="llpName" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>LLP Name</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="registeredAddress" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Registered Address</FormLabel>
                                        <FormControl><Textarea {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="businessActivity" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Business Activity</FormLabel>
                                        <FormControl><Textarea {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="agreementDate" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Agreement Date</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {field.value ? format(field.value, "PPP") : "Pick a date"}
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <FormLabel>Partners</FormLabel>
                                        <Button type="button" variant="outline" size="sm" onClick={() => append({ name: "", isDesignated: false, contribution: 0, profitShare: 0 })}>
                                            <PlusCircle className="mr-2 h-4 w-4" /> Add Partner
                                        </Button>
                                    </div>
                                    {fields.map((field, index) => (
                                        <Card key={field.id}>
                                            <CardContent className="pt-6 space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <h3 className="font-medium">Partner {index + 1}</h3>
                                                    <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)} disabled={fields.length <= 2}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                                <FormField control={form.control} name={`partners.${index}.name`} render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Partner Name</FormLabel>
                                                        <FormControl><Input {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}/>
                                                <div className="grid md:grid-cols-2 gap-4">
                                                    <FormField control={form.control} name={`partners.${index}.contribution`} render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Capital Contribution (₹)</FormLabel>
                                                            <FormControl><Input type="number" {...field} /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}/>
                                                    <FormField control={form.control} name={`partners.${index}.profitShare`} render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Profit Share (%)</FormLabel>
                                                            <FormControl><Input type="number" {...field} /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}/>
                                                </div>
                                                <FormField control={form.control} name={`partners.${index}.isDesignated`} render={({ field }) => (
                                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                                        <FormControl>
                                                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                                        </FormControl>
                                                        <FormLabel className="font-normal">Designated Partner</FormLabel>
                                                    </FormItem>
                                                )}/>
                                            </CardContent>
                                        </Card>
                                    ))}
                                    {totalProfit !== 100 && totalProfit > 0 && (
                                        <p className="text-sm text-destructive">Total profit share must equal 100% (Current: {totalProfit}%)</p>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button type="submit">Generate Agreement</Button>
                            </CardFooter>
                        </Card>
                    )}

                    {step === 2 && generatedAgreement && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Preview & Download</CardTitle>
                                <CardDescription>Review the generated LLP Agreement.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div ref={printRef} className="prose prose-sm dark:prose-invert max-w-none border p-6 rounded-md whitespace-pre-wrap">
                                    {generatedAgreement}
                                </div>
                            </CardContent>
                            <CardFooter className="justify-between">
                                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                                    <ArrowLeft className="mr-2"/> Back to Edit
                                </Button>
                                {effectivePrice > 0 && !showDocument ? (
                                    <CashfreeCheckout
                                        amount={effectivePrice}
                                        planId="llp_agreement_download"
                                        planName="LLP Agreement Download"
                                        userId={user?.uid || ''}
                                        userEmail={user?.email || ''}
                                        userName={user?.displayName || ''}
                                        onSuccess={(paymentId) => {
                                            setShowDocument(true);
                                            toast({
                                                title: "Payment Successful",
                                                description: "Your document is ready for download."
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
                                    showDocument && (
                                        <div className="flex gap-2">
                                            <Button type="button" onClick={handlePrint}>
                                                <Printer className="mr-2"/> Print/Save as PDF
                                            </Button>
                                            <ShareButtons
                                                contentRef={printRef}
                                                fileName={`LLP_Agreement_${form.getValues("llpName")}`}
                                            />
                                        </div>
                                    )
                                )}
                            </CardFooter>
                        </Card>
                    )}
                </form>
            </Form>
        </div>
    );
}

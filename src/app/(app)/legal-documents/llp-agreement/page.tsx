
"use client";

import * as React from "react";
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
        <div>Test</div>
    );
}

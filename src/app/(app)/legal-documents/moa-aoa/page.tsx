
"use client";

import * as React from "react";
import * as React from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Wand2, ArrowLeft, FileSignature } from "lucide-react";
import { generateMoaObjectsAction } from "./actions";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShareButtons } from "@/components/documents/share-buttons";
import { RazorpayCheckout } from "@/components/payment/razorpay-checkout";
import { getServicePricing } from "@/lib/pricing-service";
import { useCertificationRequest } from "@/hooks/use-certification-request";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { useEffect, useRef } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const formSchema = z.object({
  companyName: z.string().min(5, "Company name is required."),
  businessDescription: z.string().min(20, "A detailed business description is required."),
});


export default function MoaAoaPage() {
    const [result, setResult] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const printRef = useRef<HTMLDivElement>(null);
    const [user] = useAuthState(auth);
    const [pricing, setPricing] = useState(null);

    const { handleCertificationRequest, handlePaymentSuccess, isSubmitting: isCertifying } = useCertificationRequest({
      pricing,
      serviceId: 'moa_aoa'
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            companyName: "",
            businessDescription: "",
        },
    });

    // Load pricing data
    useEffect(() => {
      getServicePricing().then(pricingData => {
        setPricing(pricingData);
      }).catch(error => {
        console.error('Error loading pricing:', error);
      });
    }, []);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        setResult(null);
        try {
            const response = await generateMoaObjectsAction(values);
            if (response?.mainObjects) {
                setResult(response.mainObjects);
                toast({ title: "MOA Objects Generated!"});
            } else {
                 toast({ variant: "destructive", title: "Generation Failed" });
            }
        } catch (e) {
            toast({ variant: "destructive", title: "An Error Occurred" });
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }
  return "test";
        <Link href="/legal-documents" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            Back to Document Selection
        </Link>
        <div className="text-center">
            <h1 className="text-3xl font-bold">Memorandum of Association (MOA) - Main Objects Generator</h1>
            <p className="mt-2 max-w-2xl mx-auto text-muted-foreground">
            Describe your business, and our AI will draft the main objects clause for your company's MOA, a crucial step for incorporation.
            </p>
        </div>
        <Card>
            <CardHeader>
            <CardTitle>Company & Business Details</CardTitle>
            <CardDescription>
                Provide the company name and a clear description of its business activities.
            </CardDescription>
            </CardHeader>
             <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent className="space-y-4">
                        <FormField control={form.control} name="companyName" render={({ field }) => ( <FormItem><FormLabel>Proposed Company Name</FormLabel><FormControl><Input placeholder="e.g., Zenith Innovative Tech Pvt. Ltd." {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="businessDescription" render={({ field }) => ( <FormItem><FormLabel>Description of Business</FormLabel><FormControl><Textarea className="min-h-32" placeholder="e.g., 'To develop, market, and support a cloud-based accounting software platform for small and medium businesses in India...'" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </CardContent>
                    <CardFooter>
                         <Button type="submit" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <Wand2 className="mr-2"/>}
                            Generate Main Objects
                        </Button>
                    </CardFooter>
                </form>
             </Form>
        </Card>

        {result && (
        <Card className="animate-in fade-in-50">
          <CardHeader>
            <CardTitle>AI-Generated Main Objects Clause</CardTitle>
          </CardHeader>
          <CardContent>
             <Alert>
                <Wand2 className="h-4 w-4" />
                <AlertTitle>Generated Clause</AlertTitle>
                <AlertDescription className="prose prose-sm dark:prose-invert whitespace-pre-wrap">
                    {result}
                </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Professional Certification Service</CardTitle>
            <CardDescription>Get your MOA & AOA professionally reviewed and certified by a qualified legal expert.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Our legal experts will review your Memorandum and Articles of Association for compliance with Companies Act, ensure all necessary clauses are included (business objects, share structure, director powers, etc.), and provide certification for incorporation and legal validity.
            </p>
          </CardContent>
          <CardFooter>
            {pricing && pricing.legal_docs?.find(s => s.id === 'moa_aoa')?.price > 0 ? (
              <RazorpayCheckout
                amount={pricing.legal_docs.find(s => s.id === 'moa_aoa')?.price || 0}
                planId="moa_aoa_certification"
                planName="MOA & AOA Professional Certification"
                userId={user?.uid || ''}
                userEmail={user?.email || ''}
                userName={user?.displayName || ''}
                onSuccess={(paymentId) => {
                  handlePaymentSuccess(paymentId, {
                    reportType: "MOA & AOA Certification",
                    clientName: form.getValues("companyName"),
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

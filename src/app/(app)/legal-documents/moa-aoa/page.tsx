
"use client";

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
import { CashfreeCheckout } from "@\/components\/payment\/cashfree-checkout";
import { getServicePricing, onPricingUpdate } from "@/lib/pricing-service";
import { useCertificationRequest } from "@/hooks/use-certification-request";
import { getUserSubscriptionInfo, getEffectiveServicePrice } from "@/lib/service-pricing-utils";
import { useOnDemandUnlock } from "@/hooks/use-on-demand-unlock";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { useEffect, useRef } from "react";


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
    const [userSubscriptionInfo, setUserSubscriptionInfo] = useState<{ userType: "business" | "professional" | null; subscriptionPlan: "freemium" | "business" | "professional" | null } | null>(null);
    const [showDocument, setShowDocument] = useState(false);
    useOnDemandUnlock("moa_aoa_download", () => setShowDocument(true));

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
  const basePrice = pricing?.founder_startup?.find(s => s.id === 'moa_aoa')?.price || 0;
  const effectivePrice = userSubscriptionInfo
    ? getEffectiveServicePrice(
        basePrice,
        userSubscriptionInfo.userType,
        userSubscriptionInfo.subscriptionPlan,
        "founder_startup"
      )
    : basePrice;

  if (!showDocument && effectivePrice === 0 && result) {
    setShowDocument(true);
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Link href="/legal-documents" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Document Selection
      </Link>
      <div className="text-center">
        <h1 className="text-3xl font-bold">MOA & AOA Generator</h1>
        <p className="text-muted-foreground">Generate Memorandum and Articles of Association for companies.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Company Details</CardTitle>
              <CardDescription>Provide information about your company to generate MOA Objects.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="companyName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="businessDescription" render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Description</FormLabel>
                  <FormControl><Textarea className="min-h-32" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate MOA Objects
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {result && (
            <Card>
              <CardHeader>
                <CardTitle>Generated MOA Objects</CardTitle>
                <CardDescription>Review the generated objects for your Memorandum of Association.</CardDescription>
              </CardHeader>
              <CardContent>
                <div ref={printRef} className="prose prose-sm dark:prose-invert max-w-none border p-6 rounded-md whitespace-pre-wrap">
                  {result}
                </div>
              </CardContent>
              <CardFooter className="justify-end">
                {effectivePrice > 0 && !showDocument ? (
                  <CashfreeCheckout
                    amount={effectivePrice}
                    planId="moa_aoa_download"
                    planName="MOA & AOA Download"
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
                    <ShareButtons
                      contentRef={printRef}
                      fileName={`MOA_Objects_${form.getValues("companyName")}`}
                    />
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

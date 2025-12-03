
"use client";

import { useState, useEffect, useRef } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
  FormLabel,
} from "@/components/ui/form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { CashfreeCheckout } from "@/components/payment/cashfree-checkout";
import { getServicePricing, onPricingUpdate, ServicePricing } from "@/lib/pricing-service";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { getUserSubscriptionInfo, getEffectiveServicePrice } from "@/lib/service-pricing-utils";
import { ShareButtons } from "@/components/documents/share-buttons";

const formSchema = z.object({
  deponentName: z.string().min(3, "Deponent's name is required."),
  parentage: z.string().min(3, "Parentage is required (e.g., S/o, W/o, D/o)."),
  address: z.string().min(10, "A full address is required."),
  aadhaar: z.string().regex(/^\d{12}$/, "Must be a 12-digit Aadhaar number.").optional().or(z.literal("")),
  firmName: z.string().min(3, "Firm name is required."),
});

type FormData = z.infer<typeof formSchema>;

export default function SelfAffidavitGstPage() {
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const [user] = useAuthState(auth);
  const [pricing, setPricing] = useState<ServicePricing | null>(null);
  const [userSubscriptionInfo, setUserSubscriptionInfo] = useState<{ userType: "business" | "professional" | null; subscriptionPlan: "freemium" | "business" | "professional" | null } | null>(null);
  const [showDocument, setShowDocument] = useState(false);

  // Fetch user subscription info
  useEffect(() => {
    if (user) {
      getUserSubscriptionInfo(user.uid).then(setUserSubscriptionInfo);
    }
  }, [user]);

  // Load pricing data
  useEffect(() => {
    getServicePricing().then(setPricing);
    const unsubscribe = onPricingUpdate(setPricing);
    return () => unsubscribe();
  }, []);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      deponentName: "",
      parentage: "",
      address: "",
      aadhaar: "",
      firmName: "",
    },
  });

  const formData = form.watch();

  const generateAffidavitText = (data: Partial<FormData>) => {
    const { deponentName, parentage, address, aadhaar, firmName } = data;
    const aadhaarText = aadhaar ? ` holding (Aadhaar ${aadhaar})` : "";

    return `
AFFIDAVIT

I ${deponentName || "[Deponent Name]"}, ${parentage || "[S/o, W/o, D/o]"} R/o "${address || "[Full Address]"}${aadhaarText}, do hereby solemnly affirm and state that as follows:

That I am the owner of the above mentioned property at "${address || "[Full Address]"}".

We are doing partnership/proprietorship business in the name and style of M/s "${firmName || "[Firm Name]"}" and which is managed by me i.e. ${deponentName || "[Deponent Name]"} at R/o "${address || "[Full Address]"}" which is owned by me and I am not charging any rent for running this partnership business.

I do hereby declare and confirm that the contents of the affidavit are true and correct to the best of my knowledge and belief and nothing material has been concealed.


Place:
Date:                                       Deponent Signature
    `.trim();
  };
  
  const affidavitText = generateAffidavitText(formData);

  const handleGenerate = () => {
    if (!formData.deponentName || !formData.parentage || !formData.address || !formData.firmName) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in all the required fields to generate the affidavit."
      });
      return;
    }

    // Check if payment is required
    const basePrice = pricing?.gst_documents?.find(s => s.id === 'self_affidavit_gst')?.price || 0;
    const effectivePrice = userSubscriptionInfo
      ? getEffectiveServicePrice(
          basePrice,
          userSubscriptionInfo.userType,
          userSubscriptionInfo.subscriptionPlan,
          "gst_documents"
        )
      : basePrice;

    // If payment required, don't show document yet
    if (effectivePrice > 0) {
      return; // Payment will be handled by CashfreeCheckout
    }

    // No payment required - show document
    setShowDocument(true);
    toast({
      title: "Affidavit Generated",
      description: "Your affidavit has been generated and is ready for download."
    });
  };

  const handlePaymentSuccess = (paymentId: string) => {
    setShowDocument(true);
    toast({
      title: "Payment Successful",
      description: "Your affidavit has been generated and is ready for download."
    });
  };

  const basePrice = pricing?.gst_documents?.find(s => s.id === 'self_affidavit_gst')?.price || 0;
  const effectivePrice = userSubscriptionInfo
    ? getEffectiveServicePrice(
        basePrice,
        userSubscriptionInfo.userType,
        userSubscriptionInfo.subscriptionPlan,
        "gst_documents"
      )
    : basePrice;
  const requiresPayment = effectivePrice > 0;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <Link href="/legal-documents" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Document Selection
      </Link>
      <div className="text-center">
        <h1 className="text-3xl font-bold">Self Affidavit for GST</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Generate an affidavit for using a self-occupied property for business without a rental agreement.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        <Card>
          <CardHeader>
            <CardTitle>Enter Details</CardTitle>
            <CardDescription>Fill in the information to generate the affidavit.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-4">
                 <FormField control={form.control} name="deponentName" render={({ field }) => (
                    <FormItem><FormLabel>Deponent Full Name</FormLabel><FormControl><Input placeholder="e.g., Suryadevara Kranthi Kumar" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                 <FormField control={form.control} name="parentage" render={({ field }) => (
                    <FormItem><FormLabel>Parentage</FormLabel><FormControl><Input placeholder="e.g., S/o Suyradevara Mohan Rao (Late)" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                 <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem><FormLabel>Full Address</FormLabel><FormControl><Textarea placeholder="Enter the full property and residential address" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={form.control} name="aadhaar" render={({ field }) => (
                    <FormItem><FormLabel>Aadhaar Number (Optional)</FormLabel><FormControl><Input placeholder="12-digit number" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                 <FormField control={form.control} name="firmName" render={({ field }) => (
                    <FormItem><FormLabel>Firm/Business Name</FormLabel><FormControl><Input placeholder="e.g., MAHADEV REGTECH SOLUTIONS" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <Card className="sticky top-20">
            <CardHeader>
                <CardTitle>Live Preview</CardTitle>
                <CardDescription>The draft will update as you type.</CardDescription>
            </CardHeader>
            <CardContent>
                <pre className="p-4 bg-muted/50 rounded-md whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {affidavitText}
                </pre>
            </CardContent>
            <CardFooter>
                {!formData.deponentName || !formData.parentage || !formData.address || !formData.firmName ? (
                    <Button disabled className="w-full">
                        Please fill all required fields
                    </Button>
                ) : requiresPayment ? (
                    <CashfreeCheckout
                        amount={effectivePrice}
                        planId="self_affidavit_gst"
                        planName="Self Affidavit for GST"
                        userId={user?.uid || ''}
                        userEmail={user?.email || ''}
                        userName={user?.displayName || ''}
                        onSuccess={handlePaymentSuccess}
                        onFailure={() => {
                            toast({
                                variant: "destructive",
                                title: "Payment Failed",
                                description: "Payment was not completed. Please try again."
                            });
                        }}
                    />
                ) : (
                    <Button onClick={handleGenerate} className="w-full">
                        Generate & Download
                    </Button>
                )}
            </CardFooter>
        </Card>
      </div>

      {/* Generated Document for Download */}
      {showDocument && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Affidavit</CardTitle>
            <CardDescription>Your affidavit is ready for download and printing.</CardDescription>
          </CardHeader>
          <CardContent>
            <div ref={printRef} className="p-4 bg-white rounded-md border">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {affidavitText}
              </pre>
            </div>
          </CardContent>
          <CardFooter>
            <ShareButtons 
              contentRef={printRef}
              fileName={`Self_Affidavit_GST_${formData.deponentName}`}
            />
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

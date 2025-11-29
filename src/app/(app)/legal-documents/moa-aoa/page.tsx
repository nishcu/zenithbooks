
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
import { getServicePricing } from "@/lib/pricing-service";
import { useCertificationRequest } from "@/hooks/use-certification-request";
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
}

/**
 * Business Registration – Payment Step
 * After submitting the registration request, user pays here. On success, redirect to [id] for document upload.
 */

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { Loader2, IndianRupee, CreditCard, ArrowRight, Building } from "lucide-react";
import { CashfreeCheckout } from "@/components/payment/cashfree-checkout";
import { getRegistrationConfig } from "@/lib/business-registrations/constants";
import type { BusinessRegistration } from "@/lib/business-registrations/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export default function BusinessRegistrationPayPage() {
  const params = useParams();
  const router = useRouter();
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [registration, setRegistration] = useState<BusinessRegistration | null>(null);

  const registrationId = params.id as string;

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    loadRegistration();
  }, [user, registrationId, router]);

  const loadRegistration = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/registrations/${registrationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          toast({ variant: "destructive", title: "Access denied", description: "You cannot access this registration." });
          router.push("/business-registrations");
          return;
        }
        if (res.status === 404) {
          toast({ variant: "destructive", title: "Not found", description: "Registration not found." });
          router.push("/business-registrations");
          return;
        }
        throw new Error("Failed to load registration");
      }
      const data = await res.json();
      const reg: BusinessRegistration = {
        ...data,
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
        completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
        documents: (data.documents || []).map((d: { uploadedAt?: string }) => ({
          ...d,
          uploadedAt: d.uploadedAt ? new Date(d.uploadedAt) : new Date(),
        })),
      };
      setRegistration(reg);
    } catch (e: any) {
      console.error(e);
      toast({ variant: "destructive", title: "Error", description: e?.message || "Failed to load registration." });
      router.push("/business-registrations");
    } finally {
      setLoading(false);
    }
  };

  if (!user || loading) {
    return (
      <div className="container mx-auto p-6 max-w-2xl flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!registration) {
    return null;
  }

  if (registration.feePaid) {
    router.replace(`/business-registrations/${registrationId}`);
    return (
      <div className="container mx-auto p-6 max-w-2xl flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const config = getRegistrationConfig(registration.registrationType);

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Building className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Pay for {config.name}</h1>
          <p className="text-muted-foreground text-sm">Complete payment to proceed to document upload (optional).</p>
        </div>
      </div>

      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          After successful payment you will be able to upload documents (all optional) and track status.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5" />
            Registration fee
          </CardTitle>
          <CardDescription>Professional charges for {config.name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold">₹{registration.feeAmount.toLocaleString("en-IN")}</span>
          </div>

          <CashfreeCheckout
            amount={registration.feeAmount}
            planId={`business_registration_${registrationId}`}
            planName={`${config.name} – Business Registration`}
            userId={user.uid}
            userEmail={user.email || undefined}
            userName={user.displayName || undefined}
            postPaymentContext={{
              key: "pending_business_registration",
              payload: {
                type: "business_registration",
                registrationId,
                amount: registration.feeAmount,
                registrationType: registration.registrationType,
                returnTo: `/business-registrations/${registrationId}`,
              },
            }}
            onSuccess={() => {
              router.push(`/business-registrations/${registrationId}`);
            }}
          />
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-center">
        <Button variant="ghost" onClick={() => router.push(`/business-registrations/${registrationId}`)}>
          Back to registration details
        </Button>
      </div>
    </div>
  );
}

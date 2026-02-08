/**
 * Business Registration Application Page
 * Client workflow for submitting registration requests
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { Loader2, Building, ArrowRight, CheckCircle2, Upload, FileText } from "lucide-react";
import { getRegistrationConfig, REGISTRATION_CHARGES_NOTE, type RegistrationType } from "@/lib/business-registrations/constants";
import { createBusinessRegistration } from "@/lib/business-registrations/firestore";
import { doc, getDoc } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export default function BusinessRegistrationApplyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [registrationType, setRegistrationType] = useState<RegistrationType | null>(null);
  const [userData, setUserData] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    businessName: "",
    businessType: "",
    pan: "",
    address: {
      line1: "",
      line2: "",
      city: "",
      state: "",
      pincode: "",
    },
  });

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    // Get registration type from query params
    const type = searchParams.get("type") as RegistrationType | null;
    if (type) {
      setRegistrationType(type);
    }

    // Load user data
    const loadUserData = async () => {
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserData(userSnap.data());
          const data = userSnap.data();
          // Pre-fill form with user data
          setFormData({
            businessName: data.businessName || "",
            businessType: data.businessType || "",
            pan: data.pan || "",
            address: {
              line1: data.address?.line1 || "",
              line2: data.address?.line2 || "",
              city: data.address?.city || "",
              state: data.address?.state || "",
              pincode: data.address?.pincode || "",
            },
          });
        }
      }
    };
    loadUserData();
  }, [user, searchParams, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !registrationType) return;

    setLoading(true);
    try {
      // Get firm ID (use user ID as firm ID for now, or get from user data)
      const firmId = userData?.firmId || user.uid;

      // Create registration request
      const registrationId = await createBusinessRegistration({
        userId: user.uid,
        firmId,
        registrationType,
        businessName: formData.businessName,
        businessType: formData.businessType,
        pan: formData.pan,
        address: formData.address,
        documents: [],
        feeAmount: getRegistrationConfig(registrationType).basePrice,
        feePaid: false,
        createdBy: user.uid,
      });

      toast({
        title: "Registration Request Submitted",
        description: "Proceed to payment to complete your registration request.",
      });

      router.push(`/business-registrations/${registrationId}/pay`);
    } catch (error: any) {
      console.error("Error creating registration:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to submit registration request. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!registrationType) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No registration type selected.</p>
              <Button onClick={() => router.push("/business-registrations")}>
                Select Registration Type
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const config = getRegistrationConfig(registrationType);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Building className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Apply for {config.name}</h1>
            <p className="text-muted-foreground mt-1">{config.description}</p>
          </div>
        </div>
      </div>

      <Alert className="mb-4">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>ICAI-Compliant Service:</strong> All registration tasks are handled by ZenithBooks Compliance Team 
          in compliance with Indian laws and ICAI regulations. You will receive updates as your registration progresses.
        </AlertDescription>
      </Alert>

      <Alert className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
        <Info className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          <strong>Note:</strong> {REGISTRATION_CHARGES_NOTE}
        </AlertDescription>
      </Alert>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Registration Details</CardTitle>
              <CardDescription>
                Estimated time: {config.estimatedDays} business days | 
                Fee: ₹{config.basePrice.toLocaleString("en-IN")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) =>
                      setFormData({ ...formData, businessName: e.target.value })
                    }
                    required
                    placeholder="Enter your business name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessType">Business Type *</Label>
                  <Input
                    id="businessType"
                    value={formData.businessType}
                    onChange={(e) =>
                      setFormData({ ...formData, businessType: e.target.value })
                    }
                    required
                    placeholder="e.g., Manufacturing, Trading, Services"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pan">PAN Number</Label>
                  <Input
                    id="pan"
                    value={formData.pan}
                    onChange={(e) =>
                      setFormData({ ...formData, pan: e.target.value.toUpperCase() })
                    }
                    placeholder="ABCDE1234F"
                    maxLength={10}
                  />
                </div>

                <div className="space-y-4">
                  <Label>Business Address *</Label>
                  <div className="space-y-2">
                    <Input
                      placeholder="Address Line 1 *"
                      value={formData.address.line1}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: { ...formData.address, line1: e.target.value },
                        })
                      }
                      required
                    />
                    <Input
                      placeholder="Address Line 2"
                      value={formData.address.line2}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: { ...formData.address, line2: e.target.value },
                        })
                      }
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="City *"
                        value={formData.address.city}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            address: { ...formData.address, city: e.target.value },
                          })
                        }
                        required
                      />
                      <Input
                        placeholder="State *"
                        value={formData.address.state}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            address: { ...formData.address, state: e.target.value },
                          })
                        }
                        required
                      />
                    </div>
                    <Input
                      placeholder="Pincode *"
                      value={formData.address.pincode}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: { ...formData.address, pincode: e.target.value },
                        })
                      }
                      required
                      maxLength={6}
                    />
                  </div>
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Registration Request
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Required Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {config.requiredDocuments.map((doc, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span>{doc}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-4">
                After payment you can optionally upload documents on the registration status page.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Workflow Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {config.workflowSteps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                      {idx + 1}
                    </div>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground text-center">
                All registration tasks are handled by ZenithBooks Compliance Team in compliance 
                with Indian laws and ICAI regulations.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


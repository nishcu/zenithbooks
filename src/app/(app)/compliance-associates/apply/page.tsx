/**
 * Zenith Corporate Mitra Registration Page
 * Public page for associates to register and pay platform fee.
 * Zenith Corporate Mitra is an internal platform-defined role and not a government-authorized designation.
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { Loader2, UserPlus, CheckCircle2, Building, CreditCard } from "lucide-react";
import { CashfreeCheckout } from "@/components/payment/cashfree-checkout";
import { ASSOCIATE_QUALIFICATIONS, ASSOCIATE_SPECIALIZATIONS, PLATFORM_FEE_ANNUAL } from "@/lib/compliance-associates/constants";
import type { AssociateQualification } from "@/lib/compliance-associates/types";
import { createAssociateRegistration, getAssociateByEmail } from "@/lib/compliance-associates/firestore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export default function ComplianceAssociateApplyPage() {
  const router = useRouter();
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1); // 1: Form, 2: Payment
  const [associateId, setAssociateId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    panNumber: "",
    qualification: "" as AssociateQualification | "",
    otherQualification: "",
    yearsOfExperience: "",
    specializations: [] as string[],
    bankAccountNumber: "",
    bankIFSC: "",
    bankName: "",
    bankAccountHolderName: "",
  });

  useEffect(() => {
    // Check if user is logged in
    if (!user) {
      router.push("/login?redirect=/compliance-associates/apply");
      return;
    }

    // Pre-fill email if user is logged in
    if (user.email && !formData.email) {
      setFormData(prev => ({ ...prev, email: user.email || "" }));
    }

    // Check if user already has an associate registration
    const checkExisting = async () => {
      if (user.email) {
        try {
          const existing = await getAssociateByEmail(user.email);
          if (existing) {
            toast({
              variant: "default",
              title: "Registration Already Exists",
              description: `You already have an associate registration (${existing.associateCode}). Status: ${existing.status}`,
            });
            router.push("/dashboard");
          }
        } catch (error) {
          // Ignore error - user might not be registered yet
        }
      }
    };
    checkExisting();
  }, [user, router, toast]);

  const handleSpecializationToggle = (specId: string) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.includes(specId)
        ? prev.specializations.filter(id => id !== specId)
        : [...prev.specializations, specId],
    }));
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.email || !formData.phone || !formData.panNumber) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill all required fields.",
      });
      return;
    }

    if (!formData.qualification) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select your qualification.",
      });
      return;
    }

    if (formData.qualification === "Other" && !formData.otherQualification) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please specify your qualification if 'Other' is selected.",
      });
      return;
    }

    if (formData.specializations.length === 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select at least one specialization.",
      });
      return;
    }

    if (!formData.bankAccountNumber || !formData.bankIFSC || !formData.bankName || !formData.bankAccountHolderName) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill all bank account details.",
      });
      return;
    }

    setLoading(true);
    try {
      // Create associate registration (pending payment)
      const newAssociateId = await createAssociateRegistration({
        email: formData.email,
        name: formData.name,
        phone: formData.phone,
        panNumber: formData.panNumber,
        qualification: formData.qualification as AssociateQualification,
        otherQualification: formData.qualification === "Other" ? formData.otherQualification : undefined,
        yearsOfExperience: parseInt(formData.yearsOfExperience) || 0,
        specializations: formData.specializations,
        bankAccount: {
          accountNumber: formData.bankAccountNumber,
          ifscCode: formData.bankIFSC,
          bankName: formData.bankName,
          accountHolderName: formData.bankAccountHolderName,
        },
      });

      setAssociateId(newAssociateId);
      
      // Store associate ID in localStorage for payment success handler
      localStorage.setItem("pending_associate_registration", JSON.stringify({
        associateId: newAssociateId,
        email: formData.email,
      }));

      // Move to payment step
      setStep(2);
    } catch (error: any) {
      console.error("Error creating associate registration:", error);
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.message || "Failed to submit registration. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Redirecting to login...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Register as Zenith Corporate Mitra</h1>
        <p className="text-muted-foreground">
          Join ZenithBooks as a Zenith Corporate Mitra and help businesses with their compliance needs.
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Zenith Corporate Mitra is an internal platform-defined role and not a government-authorized designation.
        </p>
      </div>

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Associate Information
            </CardTitle>
            <CardDescription>
              Fill in your details to register as a Zenith Corporate Mitra. All information will be verified before approval.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitForm} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="your.email@example.com"
                      required
                      disabled
                    />
                    <p className="text-xs text-muted-foreground mt-1">Email is set from your account</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="panNumber">PAN Number *</Label>
                    <Input
                      id="panNumber"
                      value={formData.panNumber}
                      onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                      placeholder="ABCDE1234F"
                      maxLength={10}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Professional Details */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-lg">Professional Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="qualification">Qualification *</Label>
                    <Select
                      value={formData.qualification}
                      onValueChange={(value) => setFormData({ ...formData, qualification: value as AssociateQualification })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select qualification" />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSOCIATE_QUALIFICATIONS.map((q) => (
                          <SelectItem key={q.value} value={q.value}>
                            {q.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.qualification === "Other" && (
                    <div>
                      <Label htmlFor="otherQualification">Specify Qualification *</Label>
                      <Input
                        id="otherQualification"
                        value={formData.otherQualification}
                        onChange={(e) => setFormData({ ...formData, otherQualification: e.target.value })}
                        placeholder="Enter your qualification"
                        required
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="yearsOfExperience">Years of Experience *</Label>
                    <Input
                      id="yearsOfExperience"
                      type="number"
                      min="0"
                      value={formData.yearsOfExperience}
                      onChange={(e) => setFormData({ ...formData, yearsOfExperience: e.target.value })}
                      placeholder="e.g., 5"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label>Specializations * (Select at least one)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                    {ASSOCIATE_SPECIALIZATIONS.map((spec) => (
                      <div key={spec.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={spec.id}
                          checked={formData.specializations.includes(spec.id)}
                          onCheckedChange={() => handleSpecializationToggle(spec.id)}
                        />
                        <Label htmlFor={spec.id} className="text-sm font-normal cursor-pointer">
                          {spec.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bank Details */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-lg">Bank Account Details (For Payouts)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bankAccountNumber">Account Number *</Label>
                    <Input
                      id="bankAccountNumber"
                      value={formData.bankAccountNumber}
                      onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                      placeholder="Enter account number"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="bankIFSC">IFSC Code *</Label>
                    <Input
                      id="bankIFSC"
                      value={formData.bankIFSC}
                      onChange={(e) => setFormData({ ...formData, bankIFSC: e.target.value.toUpperCase() })}
                      placeholder="BANK0001234"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bankName">Bank Name *</Label>
                    <Input
                      id="bankName"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      placeholder="Enter bank name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="bankAccountHolderName">Account Holder Name *</Label>
                    <Input
                      id="bankAccountHolderName"
                      value={formData.bankAccountHolderName}
                      onChange={(e) => setFormData({ ...formData, bankAccountHolderName: e.target.value })}
                      placeholder="Enter account holder name"
                      required
                    />
                  </div>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  After submitting this form, you will be redirected to pay the annual platform fee of ₹{PLATFORM_FEE_ANNUAL}. 
                  Your registration will be reviewed by our admin team after payment.
                </AlertDescription>
              </Alert>

              <div className="flex gap-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Continue to Payment
                      <CreditCard className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Platform Fee Payment
            </CardTitle>
            <CardDescription>
              Pay the annual platform fee of ₹{PLATFORM_FEE_ANNUAL} to complete your registration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Your registration information has been submitted. Please complete the payment to proceed.
                </AlertDescription>
              </Alert>

              <div className="border rounded-lg p-6 bg-muted/50">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-medium">Annual Platform Fee</span>
                  <span className="text-2xl font-bold">₹{PLATFORM_FEE_ANNUAL}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  This fee covers access to the compliance task assignment system for one year.
                </p>
              </div>

              {associateId && user.email && (
                <CashfreeCheckout
                  amount={PLATFORM_FEE_ANNUAL}
                  planId={`associate_registration_${associateId}`}
                  planName="Zenith Corporate Mitra Registration - Annual Platform Fee"
                  userId={user.uid}
                  userEmail={user.email}
                  userName={user.displayName || formData.name}
                  postPaymentContext={{
                    key: "pending_associate_registration",
                    payload: {
                      associateId,
                      email: formData.email,
                      paymentType: "associate_registration",
                    },
                  }}
                  onSuccess={(paymentId) => {
                    toast({
                      title: "Payment Successful!",
                      description: "Your registration is under review. You will be notified once approved.",
                    });
                    router.push("/dashboard");
                  }}
                  onFailure={() => {
                    toast({
                      variant: "destructive",
                      title: "Payment Failed",
                      description: "Payment could not be processed. Please try again.",
                    });
                  }}
                />
              )}

              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="w-full"
              >
                Back to Form
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


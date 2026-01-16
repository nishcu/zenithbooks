"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Lock, CheckCircle2, AlertCircle, CreditCard, Camera } from "lucide-react";
import { createITRApplication, createITRDocument, createITRCredentials } from "@/lib/itr/firestore";
import { encryptCredential } from "@/lib/itr/encryption";
import { validatePAN, formatPAN } from "@/lib/itr/encryption";
import { getCurrentFinancialYear, ITR_STORAGE_PATHS, ITR_UPLOAD_LIMITS } from "@/lib/itr/constants";
import type { DocumentType, ITRFormType } from "@/lib/itr/types";
import { CashfreeCheckout } from "@/components/payment/cashfree-checkout";
import { getServicePricing } from "@/lib/pricing-service";
import { getUserSubscriptionInfo, getEffectiveServicePrice } from "@/lib/service-pricing-utils";

interface UploadedFile {
  file: File;
  type: DocumentType;
  progress: number;
  url?: string;
  error?: string;
}

export default function NewITRApplicationPage() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const { toast } = useToast();
  
  const [financialYear] = useState(getCurrentFinancialYear());
  const [step, setStep] = useState(0); // Start with form type selection
  const [selectedFormType, setSelectedFormType] = useState<ITRFormType | null>(null);
  const [pricing, setPricing] = useState<any>(null);
  const [userSubscriptionInfo, setUserSubscriptionInfo] = useState<any>(null);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [pan, setPan] = useState("");
  const [panError, setPanError] = useState("");
  
  // Document uploads
  const [panFront, setPanFront] = useState<UploadedFile | null>(null);
  const [aadhaar, setAadhaar] = useState<UploadedFile | null>(null);
  const [form16, setForm16] = useState<UploadedFile | null>(null);
  const [bankStatement, setBankStatement] = useState<UploadedFile | null>(null);
  const [rentReceipt, setRentReceipt] = useState<UploadedFile | null>(null);
  const [licPremium, setLicPremium] = useState<UploadedFile | null>(null);
  const [homeLoan, setHomeLoan] = useState<UploadedFile | null>(null);
  
  // Credentials
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Load pricing and user subscription info
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      const [pricingData, subscriptionInfo] = await Promise.all([
        getServicePricing(),
        getUserSubscriptionInfo(user.uid),
      ]);
      setPricing(pricingData);
      setUserSubscriptionInfo(subscriptionInfo);
    };
    loadData();
  }, [user]);

  // Check for payment completion from URL params or localStorage (redirected from payment success)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderStatus = urlParams.get('order_status');
    const planId = urlParams.get('plan_id');
    const paymentCompletedParam = urlParams.get('payment_completed');
    const formTypeParam = urlParams.get('form_type') as ITRFormType | null;

    // Check URL params first
    if (orderStatus === 'PAID' && (planId?.startsWith('itr') || paymentCompletedParam === 'true')) {
      setPaymentCompleted(true);
      if (formTypeParam) {
        setSelectedFormType(formTypeParam);
      }
      setStep(1); // Move to document upload step
      // Clean up URL params
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }

    // Check localStorage for payment completion token
    try {
      const itrPaymentCompleted = localStorage.getItem('itr_payment_completed');
      if (itrPaymentCompleted) {
        const paymentData = JSON.parse(itrPaymentCompleted);
        if (paymentData?.formType) {
          setPaymentCompleted(true);
          setSelectedFormType(paymentData.formType);
          setStep(1);
          // Clear the localStorage token after using it
          localStorage.removeItem('itr_payment_completed');
        }
      }
    } catch (e) {
      console.error('Failed to parse ITR payment completion token:', e);
    }
  }, []);

  const handleFileSelect = (
    file: File,
    type: DocumentType,
    setter: (file: UploadedFile | null) => void
  ) => {
    // Validate file type
    const allowedTypes = [...ITR_UPLOAD_LIMITS.ALLOWED_IMAGE_TYPES, ...ITR_UPLOAD_LIMITS.ALLOWED_PDF_TYPES];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload PDF or image files only.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size
    if (file.size > ITR_UPLOAD_LIMITS.MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: `Maximum file size is ${ITR_UPLOAD_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB`,
        variant: "destructive",
      });
      return;
    }

    setter({
      file,
      type,
      progress: 0,
    });
  };

  const uploadFile = async (
    file: File,
    type: DocumentType,
    applicationId: string
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const storagePath = ITR_STORAGE_PATHS.getDocumentPath(
        user!.uid,
        applicationId,
        type,
        file.name
      );
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  };

  const getFormPrice = (formType: ITRFormType): number => {
    if (!pricing || !userSubscriptionInfo) return 0;
    const serviceIdMap: Record<ITRFormType, string> = {
      'ITR-1': 'itr1',
      'ITR-2': 'itr2',
      'ITR-3': 'itr3',
      'ITR-4': 'itr4',
    };
    const serviceId = serviceIdMap[formType];
    const basePrice = pricing.itr_filing?.find((s: any) => s.id === serviceId)?.price || 0;
    return getEffectiveServicePrice(
      basePrice,
      userSubscriptionInfo.userType,
      userSubscriptionInfo.subscriptionPlan,
      "itr_filing"
    );
  };

  const handleFormTypeSelect = (formType: ITRFormType) => {
    setSelectedFormType(formType);
    const price = getFormPrice(formType);
    if (price === 0 || paymentCompleted) {
      // Free for professionals or already paid
      setStep(1);
    }
    // If payment required, stay on step 0 and show payment
  };

  const handlePaymentSuccess = () => {
    setPaymentCompleted(true);
    setStep(1);
    toast({
      title: "Payment Successful",
      description: "You can now proceed with document upload.",
    });
  };

  const handleSubmit = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    if (!selectedFormType) {
      toast({
        title: "Form type not selected",
        description: "Please select ITR form type first",
        variant: "destructive",
      });
      return;
    }

    // Validate PAN
    if (!pan || !validatePAN(pan)) {
      setPanError("Please enter a valid PAN number");
      return;
    }

    // Validate required documents based on form type
    const isForm16Required = selectedFormType === 'ITR-1' || selectedFormType === 'ITR-2';
    
    if (!panFront) {
      toast({
        title: "Missing documents",
        description: "Please upload PAN (front)",
        variant: "destructive",
      });
      return;
    }

    if (!aadhaar) {
      toast({
        title: "Missing documents",
        description: "Please upload Aadhaar card",
        variant: "destructive",
      });
      return;
    }

    if (isForm16Required && !form16) {
      toast({
        title: "Missing documents",
        description: "Form 16 is required for ITR-1 and ITR-2",
        variant: "destructive",
      });
      return;
    }

    // Validate credentials
    if (!username || !password) {
      toast({
        title: "Missing credentials",
        description: "Please enter your Income Tax Portal login credentials",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Create ITR Application
      const applicationId = await createITRApplication({
        userId: user.uid,
        financialYear,
        pan: formatPAN(pan),
        status: "ITR_INITIATED",
        formType: selectedFormType,
      });

      // Upload documents
      setUploading(true);
      const documents = [
        { file: panFront, type: "PAN_FRONT" as DocumentType },
        { file: aadhaar, type: "AADHAAR" as DocumentType },
        form16 && { file: form16, type: "FORM_16" as DocumentType },
        bankStatement && { file: bankStatement, type: "BANK_STATEMENT" as DocumentType },
        rentReceipt && { file: rentReceipt, type: "RENT_RECEIPT" as DocumentType },
        licPremium && { file: licPremium, type: "LIC_PREMIUM" as DocumentType },
        homeLoan && { file: homeLoan, type: "HOME_LOAN_STATEMENT" as DocumentType },
      ].filter(Boolean) as Array<{ file: UploadedFile; type: DocumentType }>;

      for (const doc of documents) {
        const fileUrl = await uploadFile(doc.file.file, doc.type, applicationId);
        await createITRDocument({
          applicationId,
          userId: user.uid,
          type: doc.type,
          financialYear,
          fileName: doc.file.file.name,
          fileUrl,
          fileSize: doc.file.file.size,
          mimeType: doc.file.file.type,
          storagePath: ITR_STORAGE_PATHS.getDocumentPath(
            user.uid,
            applicationId,
            doc.type,
            doc.file.file.name
          ),
          encrypted: false,
          uploadedAt: new Date(),
          uploadedBy: user.uid,
        });
      }

      // Encrypt and store credentials
      // Note: In production, encryption should be done server-side via API
      const usernameResponse = await fetch("/api/itr/encrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: username }),
      });

      if (!usernameResponse.ok) {
        const errorData = await usernameResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to encrypt username");
      }

      const usernameData = await usernameResponse.json();
      const encryptedUsername = usernameData.encrypted;

      if (!encryptedUsername) {
        throw new Error("Encryption returned empty result for username");
      }

      const passwordResponse = await fetch("/api/itr/encrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: password }),
      });

      if (!passwordResponse.ok) {
        const errorData = await passwordResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to encrypt password");
      }

      const passwordData = await passwordResponse.json();
      const encryptedPassword = passwordData.encrypted;

      if (!encryptedPassword) {
        throw new Error("Encryption returned empty result for password");
      }

      await createITRCredentials(
        applicationId,
        user.uid,
        encryptedUsername,
        encryptedPassword
      );

      toast({
        title: "Application submitted successfully!",
        description: "Your documents have been received. CA team will verify shortly.",
      });

      router.push(`/itr-filing/${applicationId}`);
    } catch (error: any) {
      console.error("Error submitting application:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">New ITR Application</h1>
        <p className="text-muted-foreground mt-1">
          Financial Year: {financialYear}
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step >= s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s ? <CheckCircle2 className="h-5 w-5" /> : s === 0 ? 'Type' : s}
              </div>
              {s < 3 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    step > s ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-sm text-muted-foreground">
          <span>Form Type</span>
          <span>Documents</span>
          <span>Credentials</span>
          <span>Review</span>
        </div>
      </div>

      {/* Step 0: Form Type Selection & Payment */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Select ITR Form Type</CardTitle>
            <CardDescription>
              Choose the appropriate ITR form based on your income sources
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              {/* ITR-1 Option */}
              <Card 
                className={`cursor-pointer transition-all ${
                  selectedFormType === 'ITR-1' 
                    ? 'border-primary ring-2 ring-primary' 
                    : 'hover:border-primary/50'
                }`}
                onClick={() => handleFormTypeSelect('ITR-1')}
              >
                <CardHeader>
                  <CardTitle className="text-lg">ITR-1 (Sahaj)</CardTitle>
                  <CardDescription>
                    For Salaried Individuals
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-2xl font-bold text-primary">
                      ₹{pricing?.itr_filing?.find((s: any) => s.id === 'itr1')?.price || 999}
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Salary income only</li>
                      <li>• Income from one house property</li>
                      <li>• Interest income up to ₹5,000</li>
                      <li>• No capital gains</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* ITR-2 Option */}
              <Card 
                className={`cursor-pointer transition-all ${
                  selectedFormType === 'ITR-2' 
                    ? 'border-primary ring-2 ring-primary' 
                    : 'hover:border-primary/50'
                }`}
                onClick={() => handleFormTypeSelect('ITR-2')}
              >
                <CardHeader>
                  <CardTitle className="text-lg">ITR-2</CardTitle>
                  <CardDescription>
                    For Individuals with Capital Gains
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-2xl font-bold text-primary">
                      ₹{pricing?.itr_filing?.find((s: any) => s.id === 'itr2')?.price || 1999}
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Salary + Capital Gains</li>
                      <li>• Multiple house properties</li>
                      <li>• Foreign income/assets</li>
                      <li>• Director in a company</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* ITR-3 Option */}
              <Card 
                className={`cursor-pointer transition-all ${
                  selectedFormType === 'ITR-3' 
                    ? 'border-primary ring-2 ring-primary' 
                    : 'hover:border-primary/50'
                }`}
                onClick={() => handleFormTypeSelect('ITR-3')}
              >
                <CardHeader>
                  <CardTitle className="text-lg">ITR-3</CardTitle>
                  <CardDescription>
                    For Business/Profession Income
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-2xl font-bold text-primary">
                      ₹{pricing?.itr_filing?.find((s: any) => s.id === 'itr3')?.price || 2999}
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Business/Profession income</li>
                      <li>• Proprietary business</li>
                      <li>• Partnership firm (as partner)</li>
                      <li>• Complex tax calculations</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* ITR-4 Option */}
              <Card 
                className={`cursor-pointer transition-all ${
                  selectedFormType === 'ITR-4' 
                    ? 'border-primary ring-2 ring-primary' 
                    : 'hover:border-primary/50'
                }`}
                onClick={() => handleFormTypeSelect('ITR-4')}
              >
                <CardHeader>
                  <CardTitle className="text-lg">ITR-4 (Sugam)</CardTitle>
                  <CardDescription>
                    For Presumptive Taxation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-2xl font-bold text-primary">
                      ₹{pricing?.itr_filing?.find((s: any) => s.id === 'itr4')?.price || 2499}
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Section 44AD/44ADA/44AE</li>
                      <li>• Business income (presumptive)</li>
                      <li>• Total income upto ₹50 lakh</li>
                      <li>• Simplified filing process</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>

            {selectedFormType && (
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">Selected: {selectedFormType}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedFormType === 'ITR-1' 
                        ? 'For salaried individuals with simple income sources'
                        : selectedFormType === 'ITR-2'
                        ? 'For individuals with capital gains and multiple income sources'
                        : selectedFormType === 'ITR-3'
                        ? 'For individuals and HUFs having income from proprietary business or profession'
                        : 'For individuals, HUFs and Firms with presumptive taxation (Section 44AD/44ADA/44AE)'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      ₹{getFormPrice(selectedFormType)}
                    </div>
                    {getFormPrice(selectedFormType) === 0 && (
                      <div className="text-sm text-green-600 font-medium">
                        Free for Professional Users
                      </div>
                    )}
                  </div>
                </div>

                {getFormPrice(selectedFormType) > 0 && !paymentCompleted && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <CreditCard className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-blue-900 mb-2">
                          Complete Payment to Proceed
                        </p>
                        <p className="text-sm text-blue-800 mb-4">
                          Please complete the payment to unlock document upload and proceed with your ITR filing application.
                        </p>
                        {user && (
                          <CashfreeCheckout
                            amount={getFormPrice(selectedFormType)}
                            planId={`${selectedFormType.toLowerCase()}_${financialYear}`}
                            planName={`${selectedFormType} Filing - ${financialYear}`}
                            userId={user.uid}
                            userEmail={user.email || ''}
                            userName={user.displayName || user.email || ''}
                            postPaymentContext={{
                              key: 'pending_itr_payment',
                              payload: {
                                type: 'itr_filing',
                                formType: selectedFormType,
                                financialYear,
                                amount: getFormPrice(selectedFormType),
                              },
                            }}
                            onSuccess={handlePaymentSuccess}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {paymentCompleted && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mr-3" />
                    <div>
                      <p className="font-semibold text-green-900">Payment Completed</p>
                      <p className="text-sm text-green-800">You can now proceed with document upload.</p>
                    </div>
                  </div>
                )}

                {(getFormPrice(selectedFormType) === 0 || paymentCompleted) && (
                  <div className="flex justify-end mt-4">
                    <Button onClick={() => setStep(1)} size="lg">
                      Continue to Document Upload
                      <FileText className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 1: Documents */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Documents</CardTitle>
            <CardDescription>
              Upload your PAN{selectedFormType === 'ITR-1' || selectedFormType === 'ITR-2' ? ', Form 16' : ' (Form 16 optional for ITR-3/ITR-4)'}, and other supporting documents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* PAN */}
            <div className="space-y-4">
              <div>
                <Label>PAN Number *</Label>
                <Input
                  value={pan}
                  onChange={(e) => {
                    setPan(e.target.value.toUpperCase());
                    setPanError("");
                  }}
                  placeholder="ABCDE1234F"
                  className="mt-1 font-mono"
                  maxLength={10}
                />
                {panError && (
                  <p className="text-sm text-destructive mt-1">{panError}</p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>PAN Front *</Label>
                  <FileUploadInput
                    file={panFront}
                    onFileSelect={(file) =>
                      handleFileSelect(file, "PAN_FRONT", setPanFront)
                    }
                    accept="image/*,application/pdf"
                    enableCamera={true}
                  />
                </div>
                <div>
                  <Label>Aadhaar Card *</Label>
                  <FileUploadInput
                    file={aadhaar}
                    onFileSelect={(file) =>
                      handleFileSelect(file, "AADHAAR", setAadhaar)
                    }
                    accept="image/*,application/pdf"
                    enableCamera={true}
                  />
                </div>
              </div>
            </div>

            {/* Form 16 */}
            <div>
              <Label>
                Form 16 {selectedFormType === 'ITR-3' || selectedFormType === 'ITR-4' ? '(Optional)' : '*'}
              </Label>
              {(selectedFormType === 'ITR-3' || selectedFormType === 'ITR-4') && (
                <p className="text-sm text-muted-foreground mt-1 mb-2">
                  Form 16 is not required for ITR-3 and ITR-4 as these forms are for business/profession income.
                </p>
              )}
              <FileUploadInput
                file={form16}
                onFileSelect={(file) =>
                  handleFileSelect(file, "FORM_16", setForm16)
                }
                accept="application/pdf,image/*"
              />
            </div>

            {/* Optional Documents */}
            <div className="space-y-4">
              <h3 className="font-semibold">Optional Documents</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Bank Statements</Label>
                  <FileUploadInput
                    file={bankStatement}
                    onFileSelect={(file) =>
                      handleFileSelect(file, "BANK_STATEMENT", setBankStatement)
                    }
                    accept="application/pdf,image/*"
                  />
                </div>
                <div>
                  <Label>Rent Receipts</Label>
                  <FileUploadInput
                    file={rentReceipt}
                    onFileSelect={(file) =>
                      handleFileSelect(file, "RENT_RECEIPT", setRentReceipt)
                    }
                    accept="application/pdf,image/*"
                  />
                </div>
                <div>
                  <Label>LIC Premium Receipts</Label>
                  <FileUploadInput
                    file={licPremium}
                    onFileSelect={(file) =>
                      handleFileSelect(file, "LIC_PREMIUM", setLicPremium)
                    }
                    accept="application/pdf,image/*"
                  />
                </div>
                <div>
                  <Label>Home Loan Statements</Label>
                  <FileUploadInput
                    file={homeLoan}
                    onFileSelect={(file) =>
                      handleFileSelect(file, "HOME_LOAN_STATEMENT", setHomeLoan)
                    }
                    accept="application/pdf,image/*"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={() => setStep(2)} 
                disabled={
                  !panFront || 
                  !aadhaar ||
                  ((selectedFormType === 'ITR-1' || selectedFormType === 'ITR-2') && !form16)
                }
              >
                Next: Credentials
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Credentials */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Income Tax Portal Credentials</CardTitle>
            <CardDescription>
              Your credentials are encrypted and only accessible by our CA team
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start">
              <Lock className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">Secure Storage</p>
                <p>
                  Your credentials are encrypted with AES-256 encryption and can only be
                  decrypted by authorized CA team members. They will be automatically
                  deleted after filing is completed.
                </p>
              </div>
            </div>

            <div>
              <Label>Username *</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your Income Tax Portal username"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Password *</Label>
              <div className="relative mt-1">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your Income Tax Portal password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </Button>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={!username || !password}>
                Next: Review
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Submit</CardTitle>
            <CardDescription>
              Review your information before submitting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">PAN Number</h3>
              <p className="font-mono">{formatPAN(pan)}</p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Form Type</h3>
              <p className="text-sm">{selectedFormType}</p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Documents</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>PAN Front: {panFront?.file.name}</li>
                <li>Aadhaar: {aadhaar?.file.name}</li>
                {form16 && <li>Form 16: {form16.file.name}</li>}
                {!form16 && (selectedFormType === 'ITR-3' || selectedFormType === 'ITR-4') && (
                  <li className="text-muted-foreground italic">Form 16: Not required for {selectedFormType}</li>
                )}
                {bankStatement && (
                  <li>Bank Statement: {bankStatement.file.name}</li>
                )}
                {rentReceipt && <li>Rent Receipt: {rentReceipt.file.name}</li>}
                {licPremium && <li>LIC Premium: {licPremium.file.name}</li>}
                {homeLoan && <li>Home Loan: {homeLoan.file.name}</li>}
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Credentials</h3>
              <p className="text-sm text-muted-foreground">
                Username: {username.substring(0, 2)}****
              </p>
              <p className="text-sm text-muted-foreground">
                Password: ********
              </p>
            </div>

            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Uploading documents...</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || uploading}
              >
                {submitting || uploading ? "Submitting..." : "Submit Application"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// File Upload Input Component with Camera Support
function FileUploadInput({
  file,
  onFileSelect,
  accept,
  enableCamera = false,
}: {
  file: UploadedFile | null;
  onFileSelect: (file: File) => void;
  accept: string;
  enableCamera?: boolean;
}) {
  const fileInputId = `file-input-${Math.random().toString(36).substr(2, 9)}`;
  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera on mobile
      });
      
      // Create video element
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      
      // Create modal/dialog for camera preview
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col items-center justify-center';
      
      const videoContainer = document.createElement('div');
      videoContainer.className = 'relative max-w-md w-full aspect-video bg-black rounded-lg overflow-hidden';
      
      video.className = 'w-full h-full object-cover';
      videoContainer.appendChild(video);
      
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'flex gap-4 mt-4';
      
      const captureButton = document.createElement('button');
      captureButton.className = 'px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700';
      captureButton.textContent = 'Capture Photo';
      
      const cancelButton = document.createElement('button');
      cancelButton.className = 'px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700';
      cancelButton.textContent = 'Cancel';
      
      captureButton.onclick = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) {
              const fileName = `camera_${Date.now()}.jpg`;
              const file = new File([blob], fileName, { type: 'image/jpeg' });
              onFileSelect(file);
            }
            stream.getTracks().forEach(track => track.stop());
            document.body.removeChild(modal);
          }, 'image/jpeg', 0.9);
        }
      };
      
      cancelButton.onclick = () => {
        stream.getTracks().forEach(track => track.stop());
        document.body.removeChild(modal);
      };
      
      buttonContainer.appendChild(captureButton);
      buttonContainer.appendChild(cancelButton);
      
      modal.appendChild(videoContainer);
      modal.appendChild(buttonContainer);
      document.body.appendChild(modal);
      
    } catch (error: any) {
      console.error('Camera error:', error);
      alert('Unable to access camera. Please ensure you have granted camera permissions and try again.');
    }
  };

  return (
    <div className="mt-1 space-y-2">
      <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors relative">
        <input
          type="file"
          className="hidden"
          id={fileInputId}
          accept={accept}
          capture={enableCamera ? 'environment' : undefined}
          onChange={(e) => {
            const selectedFile = e.target.files?.[0];
            if (selectedFile) {
              onFileSelect(selectedFile);
            }
          }}
        />
        {file ? (
          <div className="flex items-center space-x-2 p-4">
            <FileText className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium">{file.file.name}</span>
          </div>
        ) : (
          <label htmlFor={fileInputId} className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
            <div className="flex flex-col items-center">
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">
                Click to upload
              </span>
            </div>
          </label>
        )}
      </div>
      {enableCamera && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCameraCapture}
          className="w-full"
        >
          <Camera className="h-4 w-4 mr-2" />
          Take Photo with Camera
        </Button>
      )}
    </div>
  );
}


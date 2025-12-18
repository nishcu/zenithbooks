
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileArchive, FileDown, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import Link from "next/link";
import { CashfreeCheckout } from "@/components/payment/cashfree-checkout";
import { getServicePricing, onPricingUpdate } from "@/lib/pricing-service";
import { getUserSubscriptionInfo, getEffectiveServicePrice } from "@/lib/service-pricing-utils";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { useOnDemandUnlock } from "@/hooks/use-on-demand-unlock";

const registers = [
    { id: "reg_members", label: "Register of Members (MGT-1)" },
    { id: "reg_debenture", label: "Register of Debenture Holders" },
    { id: "reg_charges", label: "Register of Charges (CHG-7)" },
    { id: "reg_directors", label: "Register of Directors & KMP" },
    { id: "reg_related_party", label: "Register of Contracts with Related Parties (MBP-4)" },
    { id: "reg_investments", label: "Register of Investments Not Held in Company's Name" },
    { id: "reg_deposits", label: "Register of Deposits" },
];

export default function StatutoryRegisters() {
    const { toast } = useToast();
    const [selectedRegisters, setSelectedRegisters] = useState<string[]>(["reg_members", "reg_directors"]);
    const [user] = useAuthState(auth);
    const [pricing, setPricing] = useState(null);
    const [userSubscriptionInfo, setUserSubscriptionInfo] = useState<{ userType: "business" | "professional" | null; subscriptionPlan: "freemium" | "business" | "professional" | null } | null>(null);
    const [showDocument, setShowDocument] = useState(false);
    useOnDemandUnlock("statutory_registers_download", () => setShowDocument(true));

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

      const unsubscribe = onPricingUpdate(pricingData => {
        setPricing(pricingData);
      });

      return () => unsubscribe();
    }, []);

    const handleCheckboxChange = (id: string, checked: boolean) => {
        setSelectedRegisters(prev => 
            checked ? [...prev, id] : prev.filter(item => item !== id)
        );
    };

    const handleGenerate = async () => {
        if (selectedRegisters.length === 0) {
            toast({
                variant: "destructive",
                title: "No Selection",
                description: "Please select at least one register to generate."
            });
            return;
        }

        toast({
            title: "Generation Started",
            description: `Generating ${selectedRegisters.length} selected registers in Excel format.`
        });

        try {
            if (selectedRegisters.length === 1) {
                // Single file download
                const selectedRegister = registers.find(r => r.id === selectedRegisters[0]);
                if (selectedRegister) {
                    const ws = XLSX.utils.json_to_sheet([{}], {header: getHeaders(selectedRegister.id)});
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, selectedRegister.label.substring(0, 31));
                    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `${selectedRegister.label}.xlsx`);
                }
            } else {
                // Multiple files download as a zip
                const zip = new JSZip();
                for (const regId of selectedRegisters) {
                    const selectedRegister = registers.find(r => r.id === regId);
                    if (selectedRegister) {
                        const ws = XLSX.utils.json_to_sheet([{}], {header: getHeaders(selectedRegister.id)});
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, selectedRegister.label.substring(0, 31));
                        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                        zip.file(`${selectedRegister.label}.xlsx`, new Blob([wbout], { type: 'application/octet-stream' }));
                    }
                }
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                saveAs(zipBlob, "Statutory-Registers.zip");
            }

            toast({
                title: "Generation Complete",
                description: "Your files have been downloaded."
            });

        } catch (error) {
            console.error("Error generating files:", error);
            toast({
                variant: "destructive",
                title: "Generation Failed",
                description: "An error occurred while generating the files."
            });
        }
    };

    const getHeaders = (registerId: string) => {
        switch (registerId) {
            case "reg_members": // MGT-1
                return ["Sr. No.", "Name of Member", "Address", "Email ID", "PAN/CIN", "UIN", "Folio No.", "Date of Allotment", "No. of Shares", "Distinctive Nos. (From)", "Distinctive Nos. (To)", "Date of Transfer", "Date of Ceasing to be a Member", "Amount of Guarantee", "Instructions, if any"];
            case "reg_debenture":
                return ["Sr. No.", "Name of Debenture Holder", "Address", "Folio No.", "No. of Debentures", "Distinctive Nos.", "Date of Allotment", "Date of Transfer", "Date of Redemption"];
            case "reg_charges": // CHG-7
                return ["Sr. No.", "Date of Creation/Modification of Charge", "Charge ID", "Particulars of the Property Charged", "Amount of Charge (in Rs.)", "Name of the Charge Holder", "Date of Satisfaction of Charge", "Remarks"];
            case "reg_directors":
                return ["Sr. No.", "Name", "DIN", "Father's Name", "Mother's Name", "Spouse's Name", "Address", "Nationality", "Date of Birth", "Occupation", "Date of Appointment", "Date of Cessation", "Details of Securities Held", "Remarks"];
            case "reg_related_party": // MBP-4
                return ["Sr. No.", "Date of Contract/Arrangement", "Name of the Related Party", "Nature of Relationship", "Nature of Contract/Arrangement", "Salient Terms", "Date of Approval by Board", "Date of Approval by Shareholders", "Remarks"];
            case "reg_investments":
                return ["Sr. No.", "Nature of Investment", "Name of the Entity in which Investment is made", "Date of Investment", "Amount (in Rs.)", "No. of Securities", "Distinctive Nos. (From)", "Distinctive Nos. (To)", "Date of Disposal", "Remarks"];
            case "reg_deposits":
                return ["Sr. No.", "Name of Depositor", "Address", "Amount of Deposit", "Date of Deposit", "Date of Maturity", "Rate of Interest", "Date of Repayment", "Remarks"];
            default:
                return [];
        }
    };

    const basePrice = pricing?.company_documents?.find(s => s.id === 'statutory_registers')?.price || 0;
    const effectivePrice = userSubscriptionInfo
      ? getEffectiveServicePrice(
          basePrice,
          userSubscriptionInfo.userType,
          userSubscriptionInfo.subscriptionPlan,
          "company_documents"
        )
      : basePrice;

    if (!showDocument && effectivePrice === 0) {
      setShowDocument(true);
    }

    return (
        <div className="space-y-8 max-w-2xl mx-auto">
            <Link href="/legal-documents" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" />
              Back to Document Selection
            </Link>
            <div className="text-center">
                 <div className="flex items-center justify-center size-16 rounded-full bg-primary/10 mb-4 mx-auto">
                    <FileArchive className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-3xl font-bold">Statutory Registers Generator</h1>
                <p className="text-muted-foreground">Generate templates for mandatory registers as per the Companies Act, 2013.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Select Registers to Generate</CardTitle>
                    <CardDescription>Choose the statutory registers you need. We'll generate them in an Excel format ready for you to fill in.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                        {registers.map(register => (
                            <div key={register.id} className="flex items-center space-x-2">
                                <Checkbox 
                                    id={register.id} 
                                    checked={selectedRegisters.includes(register.id)}
                                    onCheckedChange={(checked) => handleCheckboxChange(register.id, !!checked)}
                                />
                                <Label htmlFor={register.id} className="font-normal">{register.label}</Label>
                            </div>
                        ))}
                    </div>
                </CardContent>
                <CardFooter>
                  {effectivePrice > 0 && !showDocument ? (
                    <CashfreeCheckout
                      amount={effectivePrice}
                      planId="statutory_registers_download"
                      planName="Statutory Registers Download"
                      userId={user?.uid || ''}
                      userEmail={user?.email || ''}
                      userName={user?.displayName || ''}
                      onSuccess={(paymentId) => {
                        setShowDocument(true);
                        toast({
                          title: "Payment Successful",
                          description: "You can now generate the registers."
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
                    <Button onClick={handleGenerate} disabled={!showDocument && effectivePrice > 0}>
                        <FileDown className="mr-2"/>
                        Generate Selected Registers
                    </Button>
                  )}
                </CardFooter>
            </Card>
        </div>
    );
}

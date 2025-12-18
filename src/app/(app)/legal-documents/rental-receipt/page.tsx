
"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IndianRupee, Printer, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getServicePricing, onPricingUpdate, ServicePricing } from "@/lib/pricing-service";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { useReactToPrint } from "react-to-print";
import { CashfreeCheckout } from "@/components/payment/cashfree-checkout";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { ShareButtons } from "@/components/documents/share-buttons";
import { collection, doc, getDocs, limit, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";

export default function RentalReceiptPage() {
    const { toast } = useToast();
    const printRef = useRef<HTMLDivElement>(null);
    const [user] = useAuthState(auth);
    const [tenantName, setTenantName] = useState("");
    const [landlordName, setLandlordName] = useState("");
    const [rentAmount, setRentAmount] = useState(10000);
    const [address, setAddress] = useState("");
    const [rentalMonth, setRentalMonth] = useState(new Date().toISOString().substring(0, 7));
    const [pricing, setPricing] = useState<ServicePricing | null>(null);
    const [showReceipt, setShowReceipt] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [ticketId, setTicketId] = useState<string | null>(null);

    useEffect(() => {
        getServicePricing().then(setPricing);

        // Subscribe to real-time pricing updates
        const unsubscribe = onPricingUpdate(setPricing);
        return () => unsubscribe();
    }, []);

    const rentalReceiptPrice = pricing?.hr_documents.find(d => d.id === 'rental_receipt_hra')?.price || 0;
    const requiresPayment = rentalReceiptPrice > 0;

    // Movie-ticket gate: find an unused ticket for this user
    useEffect(() => {
        if (!user?.uid) return;
        if (!requiresPayment) {
            setShowReceipt(true);
            return;
        }
        (async () => {
            try {
                const snap = await getDocs(
                    query(
                        collection(db, "paymentTransactions"),
                        where("userId", "==", user.uid),
                        where("planId", "==", "rental_receipts_download"),
                        limit(20)
                    )
                );
                const tickets = snap.docs
                    .map(d => ({ id: d.id, data: d.data() as any }))
                    .filter(t => !t.data?.consumedAt);
                setTicketId(tickets[0]?.id || null);
                setShowReceipt(!!tickets[0]);
            } catch (e) {
                console.error("Failed to load rental receipt ticket:", e);
            }
        })();
    }, [user?.uid, requiresPayment]);

    const handleGenerate = () => {
        if (!tenantName || !landlordName || !rentAmount || !address) {
            toast({
                variant: "destructive",
                title: "Missing Information",
                description: "Please fill in all the required fields to generate the receipt."
            });
            return;
        }

        // No payment required - show receipt directly
        setShowReceipt(true);
        toast({
            title: "Receipt Generated",
            description: "Your rental receipt has been generated and is ready for download."
        });
        
        // Scroll to receipt
        setTimeout(() => {
            printRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
    };

    const handlePaymentSuccessCallback = (paymentId: string) => {
        // Cashfree redirects to /payment/success; the ticket will be available after redirect.
        toast({
            title: "Payment Initiated",
            description: "Redirecting to payment success…",
        });
    };
    
    const beforeDownloadOnce = async () => {
        if (!requiresPayment) return;
        if (!user?.uid) throw new Error("Please sign in again.");
        if (!ticketId) throw new Error("Ticket not found. Please pay again.");
        if (!tenantName || !landlordName || !rentAmount || !address) throw new Error("Fill all fields before download.");

        // Save to My Documents (unlimited downloads from there)
        await setDoc(
            doc(db, "userDocuments", `ticket_${ticketId}`),
            {
                userId: user.uid,
                documentType: "rental-receipts",
                documentName: `Rent Receipt - ${rentalMonth}`.trim(),
                status: "Paid",
                formData: { tenantName, landlordName, rentAmount, address, rentalMonth },
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            },
            { merge: true }
        );

        // Consume ticket (1 payment = 1 receipt)
        await updateDoc(doc(db, "paymentTransactions", ticketId), {
            consumedAt: serverTimestamp(),
            consumedBy: user.uid,
            consumedFor: "rental_receipts_download",
            updatedAt: serverTimestamp(),
        });
        setTicketId(null);
    };

    return (
        <div className="space-y-8 max-w-2xl mx-auto print-container">
            <Link href="/legal-documents" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground non-printable">
                <ArrowLeft className="size-4" />
                Back to Document Selection
            </Link>
            <div className="text-xs text-muted-foreground non-printable">
                Rental Receipt build: <span className="font-mono">pay-first-singular@4b4a063</span>
            </div>
            <div className="text-center non-printable">
                 <div className="flex items-center justify-center size-16 rounded-full bg-primary/10 mb-4 mx-auto">
                    <IndianRupee className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-3xl font-bold">Rental Receipt Generator</h1>
                <p className="text-muted-foreground">Easily generate and print a rental receipt for HRA claims.</p>
            </div>

            {/* Pay-first gate: if paid and no ticket, show only payment */}
            {requiresPayment && !ticketId ? (
                <Card className="non-printable">
                    <CardHeader>
                        <CardTitle>Pay & Unlock</CardTitle>
                        <CardDescription>Pay first to unlock 1 receipt (1 payment = 1 receipt).</CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <CashfreeCheckout
                            amount={rentalReceiptPrice || 0}
                            planId="rental_receipts_download"
                            planName="Rental Receipt for HRA"
                            userId={user?.uid || ''}
                            userEmail={user?.email || ''}
                            userName={user?.displayName || ''}
                            onSuccess={handlePaymentSuccessCallback}
                            onFailure={() => {
                                toast({
                                    variant: "destructive",
                                    title: "Payment Failed",
                                    description: "Payment was not completed. Please try again."
                                });
                            }}
                        />
                    </CardFooter>
                </Card>
            ) : (
            <Card className="non-printable">
                <CardHeader>
                    <CardTitle>Enter Receipt Details</CardTitle>
                    <CardDescription>Fill in the details below to create the rental receipt.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="tenantName">Tenant's Name</Label>
                        <Input id="tenantName" value={tenantName} onChange={e => setTenantName(e.target.value)} placeholder="e.g., John Doe" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="landlordName">Landlord's Name</Label>
                        <Input id="landlordName" value={landlordName} onChange={e => setLandlordName(e.target.value)} placeholder="e.g., Jane Smith" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="rentAmount">Monthly Rent Amount (₹)</Label>
                        <Input id="rentAmount" type="number" value={rentAmount} onChange={e => setRentAmount(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="address">Rented Property Address</Label>
                        <Input id="address" value={address} onChange={e => setAddress(e.target.value)} placeholder="e.g., 123 Main St, Anytown" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="rentalMonth">Month & Year of Rent</Label>
                        <Input id="rentalMonth" type="month" value={rentalMonth} onChange={e => setRentalMonth(e.target.value)} />
                    </div>
                </CardContent>
                <CardFooter>
                    {!requiresPayment ? (
                        <Button onClick={handleGenerate} disabled={isGenerating}>
                            {isGenerating ? (
                                <>
                                    <Loader2 className="mr-2 animate-spin"/>
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Printer className="mr-2"/>
                                    Generate & Download
                                </>
                            )}
                        </Button>
                    ) : null}
                </CardFooter>
            </Card>
            )}

            {/* Printable Receipt Area */}
            {showReceipt && (
                <Card>
                    <CardHeader>
                        <CardTitle>Generated Rental Receipt</CardTitle>
                        <CardDescription>Your receipt is ready for download and printing.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div ref={printRef} className="printable-area bg-white p-8 rounded-lg shadow-md border">
                            <h2 className="text-2xl font-bold text-center mb-6">Rent Receipt</h2>
                            <div className="space-y-4">
                                <p>Received a sum of <strong>{formatCurrency(rentAmount)}</strong> from <strong>{tenantName}</strong> towards the rent of the property located at <strong>{address}</strong> for the month of <strong>{new Date(rentalMonth + '-02').toLocaleString('default', { month: 'long', year: 'numeric' })}</strong>.</p>
                                <div className="grid grid-cols-2 gap-8 pt-10">
                                    <div>
                                       <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="border-t-2 border-gray-400 pt-2">Signature of Landlord</p>
                                        <p><strong>({landlordName})</strong></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <ShareButtons 
                            contentRef={printRef}
                            fileName={`Rental_Receipt_${tenantName}_${rentalMonth}`}
                            whatsappMessage={`Hi ${landlordName}, here is the rent receipt for ${new Date(rentalMonth + '-02').toLocaleString('default', { month: 'long', year: 'numeric' })} for your records. Thank you.`}
                            beforeDownload={beforeDownloadOnce}
                        />
                    </CardFooter>
                </Card>
            )}

            <style jsx global>{`
                @media print {
                    .non-printable { display: none !important; }
                    .printable-area { 
                        display: block !important; 
                        box-shadow: none !important;
                        border: none !important;
                        padding: 2rem;
                    }
                    body { margin: 0; }
                }
                @page {
                    size: A5 landscape;
                    margin: 1cm;
                }
            `}</style>
        </div>
    );
}

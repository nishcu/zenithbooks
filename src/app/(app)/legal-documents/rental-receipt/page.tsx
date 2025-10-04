
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IndianRupee, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getServicePricing, ServicePricing } from "@/lib/pricing-service";
import { formatCurrency } from "@/lib/utils";

export default function RentalReceiptPage() {
    const { toast } = useToast();
    const [tenantName, setTenantName] = useState("");
    const [landlordName, setLandlordName] = useState("");
    const [rentAmount, setRentAmount] = useState(10000);
    const [address, setAddress] = useState("");
    const [rentalMonth, setRentalMonth] = useState(new Date().toISOString().substring(0, 7));
    const [pricing, setPricing] = useState<ServicePricing | null>(null);

    useEffect(() => {
        getServicePricing().then(setPricing);
    }, []);

    const handleGenerate = () => {
        if (!tenantName || !landlordName || !rentAmount || !address) {
            toast({
                variant: "destructive",
                title: "Missing Information",
                description: "Please fill in all the required fields to generate the receipt."
            });
            return;
        }
        
        // In a real app, this would call a backend service to generate a PDF
        toast({
            title: "Receipt Generated (Simulation)",
            description: "Your rental receipt has been generated and is ready for printing."
        });
        
        setTimeout(() => window.print(), 500);
    };
    
    const rentalReceiptPrice = pricing?.hr_documents.find(d => d.id === 'rental_receipt_hra')?.price;

    return (
        <div className="space-y-8 max-w-2xl mx-auto print-container">
            <div className="text-center non-printable">
                 <div className="flex items-center justify-center size-16 rounded-full bg-primary/10 mb-4 mx-auto">
                    <IndianRupee className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-3xl font-bold">Rental Receipt Generator</h1>
                <p className="text-muted-foreground">Easily generate and print a rental receipt for HRA claims.</p>
            </div>

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
                    <Button onClick={handleGenerate} disabled={!rentalReceiptPrice}>
                        <Printer className="mr-2"/>
                        Generate & Print {rentalReceiptPrice ? `- ${formatCurrency(rentalReceiptPrice)}` : ''}
                    </Button>
                </CardFooter>
            </Card>

            {/* Printable Receipt Area */}
            <div className="printable-area bg-white p-8 rounded-lg shadow-md border">
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

            <style jsx global>{`
                @media print {
                    .non-printable { display: none; }
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
                .printable-area {
                    display: none;
                }
            `}</style>
        </div>
    );
}

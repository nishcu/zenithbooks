
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Palette } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

const templates = [
    {
        id: "classic",
        name: "Classic Professional",
        imageUrl: "https://placehold.co/400x566/ffffff/000000?text=Your+Logo%5Cn%5CnTAX+INVOICE%5Cn%5Cn--%5Cn%5CnBill+To:%5CnClient+Name%5CnClient+Address%5CnGSTIN:+...%5Cn%5Cn--%5Cn%5Cn%23|Item|HSN|Qty|Rate|Amount%5Cn1|Service|9982|1|5000|5000%5Cn%5Cn--%5Cn%5CnSubtotal:5000%5CnCGST:450%5CnSGST:450%5CnTotal:5900",
        description: "A timeless, clean, and professional design suitable for any business."
    },
    {
        id: "modern",
        name: "Modern Minimalist",
        imageUrl: "https://placehold.co/400x566/1a1a1a/ffffff?text=INVOICE%5Cn%5Cn%7C+Your+Company%5Cn%7C+Your+Address%5Cn%5CnBilled+To:%5CnClient+Name%5Cn%5Cn--%5Cn%5CnService+Description.........5000%5Cn%5CnTax+(18%25).....................900%5Cn--%5CnTotal.........................5900%5Cn%5CnThank+You.",
        description: "A sleek, contemporary design with a focus on typography and whitespace."
    },
    {
        id: "creative",
        name: "Creative Splash",
        imageUrl: "https://placehold.co/400x566/4f46e5/ffffff?font=lato&text=INVOICE%5Cn%5Cn%5Cn%5CnFrom:%5CnYour+Company%5Cn%5CnFor:%5CnClient+Name%5Cn%5Cn--%5Cn%5CnService%5CnRate:5000+Qty:1%5Cn%5CnTotal%5Cn%E2%82%B95900",
        description: "A bold design with a splash of color, perfect for creative businesses."
    },
];

export default function InvoiceTemplatesPage() {
    const [selectedTemplate, setSelectedTemplate] = useState("classic");

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/billing/invoices" passHref>
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                 <div className="flex-1">
                    <h1 className="text-2xl font-bold">Invoice Templates</h1>
                    <p className="text-muted-foreground">Choose a template to use for all your invoices.</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map(template => (
                    <Card 
                        key={template.id} 
                        className={cn(
                            "cursor-pointer hover:shadow-lg transition-all",
                            selectedTemplate === template.id && "ring-2 ring-primary"
                        )}
                        onClick={() => setSelectedTemplate(template.id)}
                    >
                        <CardHeader>
                            <CardTitle>{template.name}</CardTitle>
                            <CardDescription>{template.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="relative aspect-[1/1.414] border rounded-lg overflow-hidden bg-muted">
                                <Image
                                    src={template.imageUrl}
                                    alt={`${template.name} Preview`}
                                    fill
                                    className="object-contain"
                                />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button 
                                variant={selectedTemplate === template.id ? 'default' : 'secondary'} 
                                className="w-full"
                            >
                                {selectedTemplate === template.id && <Check className="mr-2"/>}
                                {selectedTemplate === template.id ? 'Selected' : 'Select Template'}
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Palette/> Brand Color</CardTitle>
                    <CardDescription>Customize the primary color used on your selected invoice template.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary border-2 border-primary-foreground ring-2 ring-ring" />
                    <p className="text-muted-foreground">Your brand color is set in the <Link href="/settings/branding" className="underline text-primary">Company Branding</Link> settings.</p>
                </CardContent>
            </Card>
        </div>
    );
}

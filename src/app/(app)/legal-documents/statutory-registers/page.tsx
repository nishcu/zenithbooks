
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileArchive, FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

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

    const handleCheckboxChange = (id: string, checked: boolean) => {
        setSelectedRegisters(prev => 
            checked ? [...prev, id] : prev.filter(item => item !== id)
        );
    };

    const handleGenerate = () => {
        if (selectedRegisters.length === 0) {
            toast({
                variant: "destructive",
                title: "No Selection",
                description: "Please select at least one register to generate."
            });
            return;
        }
        toast({
            title: "Generation Started (Simulated)",
            description: `Generating ${selectedRegisters.length} selected registers in Excel format.`
        });
        // In a real app, this would trigger an Excel file download.
    };

    return (
        <div className="space-y-8 max-w-2xl mx-auto">
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
                    <Button onClick={handleGenerate}>
                        <FileDown className="mr-2"/>
                        Generate Selected Registers
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

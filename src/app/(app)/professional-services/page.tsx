
"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Briefcase, Star, Users, Award } from "lucide-react";
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { professionals } from '@/lib/professionals';
import Image from 'next/image';

const serviceAreas = [
    { value: "gst_registration", label: "GST Registration" },
    { value: "startup_registration", label: "Start-Up Registration" },
    { value: "pvt_incorporation", label: "PVT Incorporation" },
    { value: "opc_incorporation", label: "OPC Incorporation" },
    { value: "llp_registration", label: "LLP Registration" },
    { value: "partnership_registration", label: "Partnership Registration" },
    { value: "itr_filing", label: "ITR Filing" },
    { value: "society_registration", label: "Society Registration" },
    { value: "gstr_filings", label: "GSTR Filings" },
    { value: "gst_notices", label: "GST Notices" },
    { value: "income_tax_notices", label: "Income Tax Notices" },
    { value: "mca_compliance", label: "MCA Compliance" },
    { value: "mca_monthly_retainership", label: "MCA Monthly Retainership" },
    { value: "virtual_cfo", label: "Virtual CFO" },
    { value: "book_keeping", label: "Book Keeping" },
    { value: "payroll_accounting", label: "Payroll Accounting" },
    { value: "others", label: "Others" },
];

export default function FindProfessionalPage() {
    const router = useRouter();
    const [selectedService, setSelectedService] = useState<string | null>(null);


    const handleBookAppointment = (proName: string, proType: string) => {
        const serviceQuery = selectedService ? `&service=${selectedService}` : '';
        router.push(`/book-appointment?proName=${encodeURIComponent(proName)}&proType=${encodeURIComponent(proType)}${serviceQuery}`);
    }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Find a Professional</h1>
        <p className="mt-2 text-lg text-muted-foreground max-w-2xl mx-auto">
          Search our network of verified professionals to find the right expert for your business needs.
        </p>
      </div>

       <Card>
        <CardHeader>
          <CardTitle>Find an Expert</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Type of Professional</Label>
            <Select>
              <SelectTrigger><SelectValue placeholder="All Professionals" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Professionals</SelectItem>
                <SelectItem value="ca">Chartered Accountant</SelectItem>
                <SelectItem value="accountant">Accountant</SelectItem>
                <SelectItem value="cost_accountant">Cost Accountant</SelectItem>
                <SelectItem value="auditor">Auditor</SelectItem>
                <SelectItem value="gst_practitioner">GST Tax Practitioner</SelectItem>
                <SelectItem value="advocate">Advocate</SelectItem>
                <SelectItem value="cs">Company Secretary</SelectItem>
              </SelectContent>
            </Select>
          </div>
           <div className="space-y-2">
            <Label>City</Label>
            <Select>
              <SelectTrigger><SelectValue placeholder="Mumbai" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mumbai">Mumbai</SelectItem>
                <SelectItem value="delhi">Delhi</SelectItem>
                <SelectItem value="bangalore">Bangalore</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
         <CardContent>
             <h3 className="text-lg font-semibold mb-4 text-center">Or Select a Service to Get Started</h3>
            <div className="flex flex-wrap gap-2 justify-center">
                {serviceAreas.map(service => (
                    <Button 
                        key={service.value}
                        variant={selectedService === service.value ? "default" : "outline"}
                        onClick={() => setSelectedService(service.value)}
                    >
                        {service.label}
                    </Button>
                ))}
            </div>
        </CardContent>
      </Card>

        <p className="text-muted-foreground">{professionals.length} Professionals matching your search</p>

       <div className="grid md:grid-cols-2 gap-6">
        {professionals.map((pro) => (
          <Card key={pro.id} className="overflow-hidden">
             <CardHeader className="flex flex-row items-start bg-muted/50 gap-4">
               <Image src={pro.imageUrl} alt={pro.name} width={80} height={80} className="rounded-full border"/>
               <div className="grid gap-0.5">
                  <CardTitle>{pro.name}</CardTitle>
                  <CardDescription>{pro.firm}</CardDescription>
                  <div className="flex items-center gap-2 mt-2">
                      <Star className="text-yellow-500 fill-yellow-500" size={16}/>
                      <span className="font-semibold">{pro.rating}</span>
                      <span className="text-xs text-muted-foreground">({pro.reviews} reviews)</span>
                  </div>
               </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
                <p className="text-sm text-muted-foreground italic">"{pro.bio}"</p>
                <div className="grid grid-cols-3 text-center">
                    <div className="space-y-1">
                        <p className="text-2xl font-bold">{pro.experience}+</p>
                        <p className="text-xs text-muted-foreground">Years Exp.</p>
                    </div>
                     <div className="space-y-1">
                        <p className="text-2xl font-bold">{pro.staff}</p>
                        <p className="text-xs text-muted-foreground">Total Staff</p>
                    </div>
                     <div className="space-y-1">
                        <p className="text-2xl font-bold">{pro.professionals}</p>
                        <p className="text-xs text-muted-foreground">Professionals</p>
                    </div>
                </div>
                 <div className="flex flex-wrap gap-2">
                    {pro.specialties.map(spec => (
                        <Badge key={spec} variant="secondary">{spec}</Badge>
                    ))}
                </div>
            </CardContent>
            <CardFooter>
                 <Button className="w-full" onClick={() => handleBookAppointment(pro.name, pro.title)}>
                    Book an Appointment
                </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

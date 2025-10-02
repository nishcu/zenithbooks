
"use client";

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreditCard, Save, Search, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import { servicePricing as initialServices } from '@/lib/on-demand-pricing';
import { saveServicePricingAction } from './actions';

type Service = {
    id: string;
    name: string;
    price: number;
}

type ServiceCategories = keyof typeof initialServices;


export default function ServicePricingPage() {
  const { toast } = useToast();
  const [services, setServices] = useState(initialServices);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handlePriceChange = (category: ServiceCategories, id: string, newPrice: number) => {
      setServices(prev => ({
          ...prev,
          [category]: prev[category].map(s => s.id === id ? {...s, price: newPrice} : s)
      }));
  };
  
  const handleSaveChanges = async () => {
      setIsSaving(true);
      const result = await saveServicePricingAction(services);
      setIsSaving(false);
      
      if (result.success) {
        toast({
          title: "Prices Updated",
          description: "The new service prices have been saved successfully. Changes will be live for all users."
        });
      } else {
        toast({
            variant: "destructive",
            title: "Save Failed",
            description: "Could not update the pricing file. Please check server logs."
        });
      }
  }

  const filteredServices = useMemo(() => {
    if (!searchTerm) {
        return services;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    const filtered: typeof initialServices = {
        reports: [],
        ca_certs: [],
        registration_deeds: [],
        founder_startup: [],
        agreements: [],
        hr_documents: [],
        company_documents: [],
        gst_documents: [],
        accounting_documents: [],
        notice_handling: [],
    };

    for (const category in services) {
        const catKey = category as ServiceCategories;
        const matchingServices = services[catKey].filter(service =>
            service.name.toLowerCase().includes(lowercasedFilter)
        );
        if (matchingServices.length > 0) {
            filtered[catKey] = matchingServices;
        }
    }
    return filtered;
  }, [searchTerm, services]);

  const renderServiceCategory = (title: string, category: ServiceCategories) => {
    const serviceList = filteredServices[category];
    if (!serviceList || serviceList.length === 0) {
        return null;
    }
    return (
      <div key={category}>
        <h3 className="text-lg font-semibold my-4">{title}</h3>
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className="w-[70%]">Service / Document Name</TableHead>
                    <TableHead className="text-right">Price (₹)</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {serviceList.map((service) => (
                    <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell className="text-right">
                        <Input 
                        type="number" 
                        value={service.price} 
                        onChange={(e) => handlePriceChange(category, service.id, parseInt(e.target.value) || 0)}
                        className="w-32 ml-auto text-right"
                        />
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CreditCard /> On-Demand Service Pricing
          </h1>
          <p className="text-muted-foreground">
            Set and manage the prices for pay-per-use services and documents.
          </p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Manage On-Demand Service Prices</CardTitle>
          <CardDescription>
            Update the prices that will be shown to users when they access these on-demand features.
          </CardDescription>
          <div className="relative pt-4">
                <Search className="absolute left-2.5 top-6 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by service name..."
                  className="pl-8 w-full md:w-1/2 lg:w-1/3"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </CardHeader>
        <CardContent className="space-y-6">
            {renderServiceCategory("Management Reports", "reports")}
            {renderServiceCategory("CA Certificates", "ca_certs")}
            {renderServiceCategory("Notice Handling &amp; Resolution", "notice_handling")}
            <Separator />
            {renderServiceCategory("Registration Deeds", "registration_deeds")}
            {renderServiceCategory("Founder &amp; Startup Docs", "founder_startup")}
            {renderServiceCategory("General Agreements", "agreements")}
            <Separator />
            {renderServiceCategory("HR Documents", "hr_documents")}
            {renderServiceCategory("Company Secretarial", "company_documents")}
            {renderServiceCategory("GST Compliance", "gst_documents")}
            {renderServiceCategory("Accounting", "accounting_documents")}
        </CardContent>
        <CardFooter className="justify-end">
            <Button onClick={handleSaveChanges} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 animate-spin"/> : <Save className="mr-2"/>}
                Save Changes
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

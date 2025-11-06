
"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Briefcase, Star, Users, Award, MapPin, Filter, CheckCircle2, Clock } from "lucide-react";
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
    const [selectedType, setSelectedType] = useState<string>("all");
    const [selectedCity, setSelectedCity] = useState<string>("all");
    const [searchTerm, setSearchTerm] = useState("");

    // Get unique cities and types
    const cities = useMemo(() => {
        const citySet = new Set(professionals.map(pro => pro.location));
        return Array.from(citySet);
    }, []);

    const types = useMemo(() => {
        const typeSet = new Set(professionals.map(pro => pro.title));
        return Array.from(typeSet);
    }, []);

    // Filter professionals
    const filteredProfessionals = useMemo(() => {
        return professionals.filter(pro => {
            const matchesService = !selectedService || pro.specialties.some(spec => 
                spec.toLowerCase().includes(selectedService.toLowerCase().replace(/_/g, ' '))
            );
            const matchesType = selectedType === "all" || pro.title.toLowerCase().includes(selectedType.toLowerCase());
            const matchesCity = selectedCity === "all" || pro.location.toLowerCase() === selectedCity.toLowerCase();
            const matchesSearch = !searchTerm || 
                pro.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                pro.firm.toLowerCase().includes(searchTerm.toLowerCase()) ||
                pro.bio.toLowerCase().includes(searchTerm.toLowerCase()) ||
                pro.specialties.some(spec => spec.toLowerCase().includes(searchTerm.toLowerCase()));
            
            return matchesService && matchesType && matchesCity && matchesSearch;
        });
    }, [selectedService, selectedType, selectedCity, searchTerm]);

    const handleBookAppointment = (proName: string, proType: string) => {
        const serviceQuery = selectedService ? `&service=${selectedService}` : '';
        router.push(`/book-appointment?proName=${encodeURIComponent(proName)}&proType=${encodeURIComponent(proType)}${serviceQuery}`);
    }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Find a Professional
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Search our network of verified professionals to find the right expert for your business needs.
        </p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name, firm, or specialty..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filters */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Type of Professional
              </Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Professionals" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Professionals</SelectItem>
                  {types.map(type => (
                    <SelectItem key={type} value={type.toLowerCase()}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                City
              </Label>
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger>
                  <SelectValue placeholder="All Cities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {cities.map(city => (
                    <SelectItem key={city} value={city.toLowerCase()}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Quick Filters
              </Label>
              <div className="flex gap-2">
                <Button
                  variant={selectedService === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedService(null)}
                >
                  All Services
                </Button>
              </div>
            </div>
          </div>

          {/* Service Areas */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Select a Service Area
            </Label>
            <div className="flex flex-wrap gap-2">
              {serviceAreas.map(service => (
                <Button
                  key={service.value}
                  variant={selectedService === service.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedService(selectedService === service.value ? null : service.value)}
                  className="text-xs"
                >
                  {service.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">
          <span className="font-semibold text-foreground">{filteredProfessionals.length}</span> Professional{filteredProfessionals.length !== 1 ? 's' : ''} found
        </p>
        {(selectedService || selectedType !== "all" || selectedCity !== "all" || searchTerm) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedService(null);
              setSelectedType("all");
              setSelectedCity("all");
              setSearchTerm("");
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Professionals Grid */}
      {filteredProfessionals.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6">
          {filteredProfessionals.map((pro) => (
            <Card 
              key={pro.id} 
              className="overflow-hidden group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/20"
            >
              <CardHeader className="flex flex-row items-start bg-gradient-to-br from-muted/50 to-muted/30 gap-4 pb-4">
                <div className="relative">
                  <Image 
                    src={pro.imageUrl} 
                    alt={pro.name} 
                    width={80} 
                    height={80} 
                    className="rounded-full border-2 border-background shadow-md"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 border-2 border-background">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="flex-1 grid gap-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">{pro.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Briefcase className="h-3 w-3" />
                        {pro.firm}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="text-xs">{pro.title}</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1">
                      <Star className="text-yellow-500 fill-yellow-500 h-4 w-4"/>
                      <span className="font-semibold text-sm">{pro.rating}</span>
                      <span className="text-xs text-muted-foreground">({pro.reviews})</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {pro.location}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <p className="text-sm text-muted-foreground italic line-clamp-2">"{pro.bio}"</p>
                
                <div className="grid grid-cols-3 gap-4 text-center border-t border-b py-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="h-4 w-4 text-primary" />
                      <p className="text-2xl font-bold">{pro.experience}+</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Years Exp.</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-4 w-4 text-primary" />
                      <p className="text-2xl font-bold">{pro.staff}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Total Staff</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1">
                      <Award className="h-4 w-4 text-primary" />
                      <p className="text-2xl font-bold">{pro.professionals}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Professionals</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Specialties:</Label>
                  <div className="flex flex-wrap gap-2">
                    {pro.specialties.map(spec => (
                      <Badge key={spec} variant="secondary" className="text-xs">{spec}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30">
                <Button 
                  className="w-full group/btn" 
                  onClick={() => handleBookAppointment(pro.name, pro.title)}
                >
                  <Briefcase className="mr-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                  Book an Appointment
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No professionals found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search criteria or filters.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedService(null);
                setSelectedType("all");
                setSelectedCity("all");
                setSearchTerm("");
              }}
            >
              Clear All Filters
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

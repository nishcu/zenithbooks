/**
 * Business Registrations - Main Page
 * Lists all available registration types
 */

"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Building, IndianRupee, ArrowRight, Clock } from "lucide-react";
import Link from "next/link";
import { getAllRegistrations, getRegistrationsByCategory, REGISTRATION_CHARGES_NOTE } from "@/lib/business-registrations/constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function BusinessRegistrationsPage() {
  const allRegistrations = getAllRegistrations();
  const essentialRegistrations = getRegistrationsByCategory('essential');
  const businessStructureRegistrations = getRegistrationsByCategory('business_structure');
  const complianceRegistrations = getRegistrationsByCategory('compliance');

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Building className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Business Registrations</h1>
            <p className="text-muted-foreground mt-1">
              Get your business registered quickly with ZenithBooks Compliance Team
            </p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="bg-muted/50 p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground">
              <strong>ICAI-Compliant Service:</strong> All registration tasks are handled by ZenithBooks Compliance Team 
              in compliance with Indian laws and ICAI regulations. Clients never see or select individual professionals.
            </p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Note:</strong> {REGISTRATION_CHARGES_NOTE}
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Registrations</TabsTrigger>
          <TabsTrigger value="essential">Essential</TabsTrigger>
          <TabsTrigger value="business">Business Structure</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          <RegistrationGrid registrations={allRegistrations} />
        </TabsContent>

        <TabsContent value="essential" className="space-y-6">
          <RegistrationGrid registrations={essentialRegistrations} />
        </TabsContent>

        <TabsContent value="business" className="space-y-6">
          <RegistrationGrid registrations={businessStructureRegistrations} />
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <RegistrationGrid registrations={complianceRegistrations} />
        </TabsContent>
      </Tabs>

      {/* How It Works */}
      <Card className="mt-12">
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
          <CardDescription>Simple 3-step process</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl mx-auto mb-4">
                1
              </div>
              <h3 className="font-semibold mb-2">Submit Documents</h3>
              <p className="text-sm text-muted-foreground">
                Upload required documents through our secure portal
              </p>
            </div>
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl mx-auto mb-4">
                2
              </div>
              <h3 className="font-semibold mb-2">ZenithBooks Compliance Team Handles Filing</h3>
              <p className="text-sm text-muted-foreground">
                Our internal professional team prepares and submits your application
              </p>
            </div>
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl mx-auto mb-4">
                3
              </div>
              <h3 className="font-semibold mb-2">Completion & Status Update</h3>
              <p className="text-sm text-muted-foreground">
                Receive your registration certificate and status updates
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Tracker Info */}
      <Card className="mt-6 bg-muted/50">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-3">Status Tracking</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Pending Client Documents</Badge>
              <span className="text-muted-foreground">- Waiting for your documents</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default">Submitted to ZenithBooks Compliance Team</Badge>
              <span className="text-muted-foreground">- Processing in progress</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-100 text-green-800">Completed</Badge>
              <span className="text-muted-foreground">- Registration completed</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RegistrationGrid({ registrations }: { registrations: ReturnType<typeof getAllRegistrations> }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {registrations.map((registration) => (
        <Card key={registration.id} className="flex flex-col hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between mb-2">
              <CardTitle className="text-lg">{registration.name}</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {registration.category.replace('_', ' ')}
              </Badge>
            </div>
            <CardDescription>{registration.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Price</span>
                <span className="text-lg font-bold flex items-center gap-1">
                  <IndianRupee className="h-4 w-4" />
                  {registration.basePrice.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Estimated Time</span>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {registration.estimatedDays} days
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Features:</p>
              <ul className="space-y-1">
                {registration.features.slice(0, 3).map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs">
                    <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
          <div className="p-4 pt-0 border-t">
            <Button asChild className="w-full" size="lg">
              <Link href={`/business-registrations/apply?type=${registration.id}`}>
                Apply Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}


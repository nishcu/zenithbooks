/**
 * Business Registrations - Main Page
 * Shows user's registration requests first, then catalog to apply for new
 */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Building, IndianRupee, ArrowRight, Clock, Loader2, Upload, CreditCard, FileText, BarChart3 } from "lucide-react";
import Link from "next/link";
import { getAllRegistrations, getRegistrationsByCategory, getRegistrationConfig, REGISTRATION_CHARGES_NOTE } from "@/lib/business-registrations/constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import type { RegistrationStatus } from "@/lib/business-registrations/types";

type MyRegistration = {
  id: string;
  userId: string;
  registrationType: string;
  status: RegistrationStatus;
  feePaid: boolean;
  feeAmount: number;
  documents: { name: string }[];
  createdAt: string;
};

export default function BusinessRegistrationsPage() {
  const [user] = useAuthState(auth);
  const [myRegistrations, setMyRegistrations] = useState<MyRegistration[]>([]);
  const [loadingMy, setLoadingMy] = useState(true);

  const allRegistrations = getAllRegistrations();
  const essentialRegistrations = getRegistrationsByCategory('essential');
  const businessStructureRegistrations = getRegistrationsByCategory('business_structure');
  const complianceRegistrations = getRegistrationsByCategory('compliance');

  useEffect(() => {
    if (!user) {
      setLoadingMy(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/registrations", { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setMyRegistrations(data);
        }
      } catch {
        if (!cancelled) setMyRegistrations([]);
      } finally {
        if (!cancelled) setLoadingMy(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

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

      {/* Your registration requests – resume from here */}
      {user && (
        <Card className="mb-8 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Your registration requests
            </CardTitle>
            <CardDescription>
              Continue from where you left off. Pay, upload documents, or track status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingMy ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : myRegistrations.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">You have no registration requests yet. Apply for a service below.</p>
            ) : (
              <div className="space-y-3">
                {myRegistrations.map((reg) => {
                  const config = getRegistrationConfig(reg.registrationType as any);
                  const statusLabel = reg.status === "completed" ? "Completed" : reg.status === "rejected" ? "Rejected" : reg.feePaid ? "Upload documents" : "Pending payment";
                  return (
                    <div
                      key={reg.id}
                      className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-semibold">{config?.name ?? reg.registrationType}</p>
                          <p className="text-sm text-muted-foreground">
                            ₹{reg.feeAmount?.toLocaleString("en-IN") ?? "—"} · {reg.documents?.length ?? 0} documents uploaded
                            {reg.feePaid && " · Payment received"}
                          </p>
                        </div>
                        <Badge variant={reg.feePaid ? "default" : "secondary"}>{statusLabel}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {!reg.feePaid && (
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/business-registrations/${reg.id}/pay`}>
                              <CreditCard className="mr-1 h-4 w-4" />
                              Pay now
                            </Link>
                          </Button>
                        )}
                        <Button asChild size="sm">
                          <Link href={`/business-registrations/${reg.id}`}>
                            {reg.feePaid ? (
                              <>
                                <Upload className="mr-1 h-4 w-4" />
                                Upload documents / View status
                              </>
                            ) : (
                              "View details"
                            )}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Virtual CFO – Featured */}
      <Card className="mb-8 border-2 border-sky-200 dark:border-sky-800 bg-gradient-to-br from-sky-50/80 to-blue-50/80 dark:from-sky-950/30 dark:to-blue-950/30">
        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Virtual CFO</h3>
              <p className="text-sm text-muted-foreground">₹2,999/month – CFO support & advisory. Financial planning, compliance & reporting.</p>
            </div>
          </div>
          <Button asChild size="lg" className="shrink-0">
            <Link href="/virtual-cfo">
              Explore Virtual CFO
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <h2 className="text-xl font-semibold mb-4">Apply for a new registration</h2>
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
          <CardDescription>Apply → Pay → Upload documents (optional) → We handle the rest</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl mx-auto mb-4">
                1
              </div>
              <h3 className="font-semibold mb-2">Apply & Pay</h3>
              <p className="text-sm text-muted-foreground">
                Submit details and complete payment. Return anytime to see &quot;Your registration requests&quot; above.
              </p>
            </div>
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl mx-auto mb-4">
                2
              </div>
              <h3 className="font-semibold mb-2">Upload Documents (optional)</h3>
              <p className="text-sm text-muted-foreground">
                Upload required documents at your convenience. You can do this in multiple visits.
              </p>
            </div>
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl mx-auto mb-4">
                3
              </div>
              <h3 className="font-semibold mb-2">ZenithBooks Team Handles Filing</h3>
              <p className="text-sm text-muted-foreground">
                Our compliance team prepares and submits your application
              </p>
            </div>
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl mx-auto mb-4">
                4
              </div>
              <h3 className="font-semibold mb-2">Completion & Certificate</h3>
              <p className="text-sm text-muted-foreground">
                Track status and receive your registration certificate
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


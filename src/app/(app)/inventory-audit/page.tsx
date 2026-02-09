/**
 * Inventory Audit – Physical stock verification
 * Service fees: 1 day ₹1,999 | 2 days ₹3,499 | 3 days ₹4,999
 * Travelling, TA & DA are separate from the fees.
 * Period of audit depends on complexity and stock involved.
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  ArrowRight,
  CheckCircle2,
  IndianRupee,
  Loader2,
  MapPin,
  Calendar,
  Package,
} from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { getServicePricing } from "@/lib/pricing-service";

const DEFAULT_PRICING = [
  { id: "inventory_audit_1day", days: 1, name: "1 day", price: 1999 },
  { id: "inventory_audit_2days", days: 2, name: "2 days", price: 3499 },
  { id: "inventory_audit_3days", days: 3, name: "3 days", price: 4999 },
];

export default function InventoryAuditPage() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [pricing, setPricing] = useState<{ id: string; days: number; name: string; price: number }[]>(DEFAULT_PRICING);

  useEffect(() => {
    getServicePricing().then((p) => {
      const audit = p.audit_services || [];
      if (audit.length >= 3) {
        setPricing([
          { id: audit[0].id, days: 1, name: "1 day", price: audit[0].price },
          { id: audit[1].id, days: 2, name: "2 days", price: audit[1].price },
          { id: audit[2].id, days: 3, name: "3 days", price: audit[2].price },
        ]);
      }
    }).catch(() => {});
  }, []);

  const handleRequest = (option: typeof pricing[0]) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Sign in required",
        description: "Please sign in to request an Inventory Audit.",
      });
      router.push("/login");
      return;
    }
    setLoading(true);
    router.push(
      `/payment?type=inventory_audit&amount=${option.price}&planId=${encodeURIComponent(option.id)}&planName=${encodeURIComponent(`Inventory Audit (${option.name})`)}`
    );
    setLoading(false);
  };

  const features = [
    "Physical verification of stock at your premises",
    "Audit report as per accepted practices",
    "ICAI-compliant, platform-managed delivery",
  ];

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        ← Back to Dashboard
      </Link>

      <div className="flex flex-col gap-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <ClipboardList className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Inventory Audit</h1>
            <p className="text-muted-foreground">Physical stock verification</p>
          </div>
        </div>
        <p className="text-muted-foreground">
          Get your inventory physically verified by our team. Service fees are based on the duration of the audit. The period of audit depends on the complexity and stock involved.
        </p>
        <ul className="space-y-2">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Service pricing */}
      <Card className="mb-6 border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5" />
            Service fees
          </CardTitle>
          <CardDescription>Select duration. Travelling, TA & DA are separate from the fees.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {pricing.map((option) => (
              <Card key={option.id} className="relative overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-medium">{option.name}</span>
                  </div>
                  <CardTitle className="text-2xl flex items-center gap-1">
                    <IndianRupee className="h-6 w-6" />
                    {option.price.toLocaleString("en-IN")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => handleRequest(option)}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Request audit"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Travelling, TA & DA – separate */}
      <Card className="mb-6 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <MapPin className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900 dark:text-amber-100">Travelling, TA & DA</h3>
              <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                Travelling, conveyance, and TA & DA (Travel Allowance & Daily Allowance) are <strong>separate from the service fees</strong> above and will be quoted or charged as per actuals / agreed terms.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Note: period depends on complexity and stock */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Package className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold">Note</h3>
              <p className="text-sm text-muted-foreground mt-1">
                The period of audit (1 / 2 / 3 days or more) depends on the <strong>complexity</strong> and <strong>stock involved</strong>. Our team will confirm the duration and quote accordingly after reviewing your requirements.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

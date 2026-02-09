/**
 * Virtual CFO – ₹2,999/month
 * CFO support & advisory under Compliance & HR
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Headphones,
  FileSpreadsheet,
  Shield,
  IndianRupee,
  Loader2,
} from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

const VIRTUAL_CFO_PRICE = 2999;

export default function VirtualCFOPage() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Sign in required",
        description: "Please sign in to subscribe to Virtual CFO.",
      });
      router.push("/login");
      return;
    }
    setLoading(true);
    router.push(
      `/payment?type=virtual_cfo&amount=${VIRTUAL_CFO_PRICE}&planName=${encodeURIComponent("Virtual CFO (Monthly)")}`
    );
    setLoading(false);
  };

  const features = [
    "Dedicated CFO-style support for your business",
    "Financial planning & cash flow advisory",
    "Compliance & reporting guidance",
    "Monthly review calls (as per plan)",
    "ICAI-compliant platform-managed delivery",
  ];

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        ← Back to Dashboard
      </Link>

      <div className="flex flex-col md:flex-row md:items-start gap-6 mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Virtual CFO</h1>
              <p className="text-muted-foreground">CFO support & advisory</p>
            </div>
          </div>
          <p className="text-muted-foreground mb-6">
            Get ongoing CFO-level support without hiring full-time. Our team helps with financial
            planning, compliance, and reporting so you can focus on running your business.
          </p>
          <ul className="space-y-3 mb-6">
            {features.map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <Card className="md:w-80 flex-shrink-0 border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5" />
              ₹2,999 <span className="text-sm font-normal text-muted-foreground">/ month</span>
            </CardTitle>
            <CardDescription>Billed monthly. Cancel anytime.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="w-full"
              size="lg"
              onClick={handleSubscribe}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Subscribe now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Secure payment via Card, UPI, Net Banking
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <FileSpreadsheet className="h-8 w-8 text-sky-600 mb-2" />
            <CardTitle className="text-base">Reports & Planning</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Cash flow, P&L and balance sheet review, and strategic financial planning support.
            </CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <Shield className="h-8 w-8 text-sky-600 mb-2" />
            <CardTitle className="text-base">Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Guidance on GST, TDS, company law, and other statutory compliance requirements.
            </CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <Headphones className="h-8 w-8 text-sky-600 mb-2" />
            <CardTitle className="text-base">Advisory</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Access to our team for questions and monthly review as per your plan.
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong>ICAI-Compliant:</strong> Virtual CFO services are delivered by ZenithBooks in
            compliance with applicable professional standards. For detailed terms and scope, please
            refer to the engagement letter provided after subscription.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

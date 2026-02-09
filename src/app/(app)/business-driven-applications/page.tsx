/**
 * ZenithBooks – Business Driven Applications (BDA)
 * One app made ONLY for your business. Not generic software.
 * Beyond Books.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  ArrowRight,
  CheckCircle2,
  IndianRupee,
  Loader2,
  Building2,
  Shirt,
  Stethoscope,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

const PRICE = 14999;

const programSteps = [
  "Understand your business flow — sales, stock, cash, credit — the way you actually run it",
  "Design the system logic as per your business reality, not a template",
  "Build a simple, focused application with only what you need",
  "Integrate accounting, stock, receivables and cash flow in one place",
  "Deliver an application you control and use every day with confidence",
];

const useCases = [
  {
    title: "Hotel or Restaurant",
    icon: Building2,
    points: [
      "Tables, orders, kitchen — in the language your staff uses",
      "Daily sales, home delivery, party bookings in one view",
      "Stock for kitchen and bar; no extra modules you never open",
    ],
  },
  {
    title: "Cloth or Garment Showroom",
    icon: Shirt,
    points: [
      "Pieces, designs, sizes — tracked the way you think",
      "Customer ledger and outstanding by customer, not by invoice number",
      "Cash and credit sales; closing and opening stock that matches your godown",
    ],
  },
  {
    title: "Medical Hall or Pharmacy",
    icon: Stethoscope,
    points: [
      "Medicines and batches the way you buy and sell",
      "Expiry and reorder at a glance; no complex menus",
      "Doctor-wise or patient-wise if that’s how you work",
    ],
  },
];

const differentiators = [
  "One application per business — built for you, not for everyone",
  "Uses the words you use — no jargon, no English-heavy screens",
  "Tracks only what matters to your business",
  "Designed so the owner can use it daily — no learning curve",
  "One-time development — you own it; no subscription trap",
];

export default function BusinessDrivenApplicationsPage() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleGetStarted = () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Sign in required",
        description: "Please sign in to get started with Business Driven Applications.",
      });
      router.push("/login");
      return;
    }
    setLoading(true);
    router.push(
      `/payment?type=business_driven_applications&amount=${PRICE}&planName=${encodeURIComponent("Business Driven Applications")}`
    );
    setLoading(false);
  };

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        ← Back to Dashboard
      </Link>

      {/* Hero + Hook */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <LayoutDashboard className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Business Driven Applications</h1>
            <p className="text-muted-foreground">ZenithBooks – One app for your business</p>
          </div>
        </div>
        <p className="text-xl font-semibold text-foreground">
          This is not an app everyone uses. This is an app made <span className="text-amber-600 dark:text-amber-400">only for your business</span>.
        </p>
        <p className="text-lg text-muted-foreground">
          We don’t sell generic software. We design and build a custom application that matches your business flow and the language you speak. One business, one application — no unnecessary features, no learning curve.
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-primary" />
            <strong>₹{PRICE.toLocaleString("en-IN")} one-time</strong>
          </span>
          <span className="text-muted-foreground">One business = One application</span>
        </div>
      </div>

      {/* What are Business Driven Applications */}
      <Card className="mb-8 border-2 border-amber-200 dark:border-amber-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-amber-600" />
            What are Business Driven Applications?
          </CardTitle>
          <CardDescription>Software that thinks the way you do.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Most software is built for accountants and then sold to business owners. You get hundreds of screens, English-heavy menus, and features you never use. You struggle, your staff struggles — and the system stays unused.
          </p>
          <p className="text-muted-foreground">
            <strong className="text-foreground">Business Driven Applications are different.</strong> We first understand how your business runs — your sales, stock, cash and credit — and then we build one application that matches that flow. It uses the terms you use. It tracks only what matters. So you actually use it every day.
          </p>
          <ul className="space-y-2">
            {differentiators.map((d, i) => (
              <li key={i} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-amber-600 shrink-0" />
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* How it works */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>How we build your application</CardTitle>
          <CardDescription>From your business reality to a simple app you control.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 list-decimal list-inside">
            {programSteps.map((step, i) => (
              <li key={i} className="text-muted-foreground pl-1">
                {step}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Use cases */}
      <Card className="mb-8 bg-muted/30">
        <CardHeader>
          <CardTitle>Built for businesses like yours</CardTitle>
          <CardDescription>Hotels, showrooms, medical stores, kirana, services — we build for your industry and your language.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {useCases.map((uc) => {
            const Icon = uc.icon;
            return (
              <div key={uc.title} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-primary">
                  <Icon className="h-4 w-4" />
                  {uc.title}
                </div>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {uc.points.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Differentiation */}
      <Card className="mb-8 border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-600" />
            Why this is different
          </CardTitle>
          <CardDescription>No generic product. No feature bloat. No “for everyone” software.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Generic software tries to serve every business. So you get complexity, jargon, and screens you ignore. We don’t do that. We design one application for one business — yours. It matches your thinking, your language, and what you need to track. So you get simplicity, control, and something you’ll actually use daily.
          </p>
          <p className="font-medium">
            One business = One application. ₹14,999 one-time. No subscription. You own it.
          </p>
        </CardContent>
      </Card>

      {/* Promise + CTA */}
      <Card className="mb-8 border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20">
        <CardContent className="pt-6">
          <div className="flex gap-3 mb-6">
            <Sparkles className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-lg">ZenithBooks — Beyond Books</h3>
              <p className="text-muted-foreground italic mt-1">
                &ldquo;We don’t just keep your books. We build the application your business deserves — so you run it with confidence.&rdquo;
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t">
            <div>
              <p className="text-2xl font-bold flex items-center gap-1">
                <IndianRupee className="h-7 w-7" />
                {PRICE.toLocaleString("en-IN")}
                <span className="text-base font-normal text-muted-foreground"> one-time</span>
              </p>
              <p className="text-sm text-muted-foreground">One business = One application. No subscription.</p>
            </div>
            <Button size="lg" className="shrink-0 bg-amber-600 hover:bg-amber-700" onClick={handleGetStarted} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Get my application"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

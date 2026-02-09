/**
 * Once-in-a-Lifetime Business Control Program
 * 7-day system reset for Indian MSMEs: Stock, Receivables, Payables, Cash.
 * No SOPs, no theory — only practical control. Beyond Books.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Shield,
  ArrowRight,
  CheckCircle2,
  IndianRupee,
  Loader2,
  Calendar,
  Package,
  Users,
  Wallet,
  TrendingUp,
  Lock,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

const PRICE = 4999;
const DURATION = "7 Days";

const dayBlocks = [
  {
    day: "Day 1–2",
    title: "Stock audit from scratch",
    icon: Package,
    points: [
      "Physical or logical stock audit as applicable to your business",
      "Identification of stock leakages, dead stock, and valuation issues",
      "Clear picture of what you actually have vs what your books say",
    ],
    outcome: "Stock under control; leakages and dead stock identified",
  },
  {
    day: "Day 3",
    title: "Receivables rebuild from zero",
    icon: Users,
    points: [
      "Customer-wise outstanding mapping from scratch",
      "Aging, recovery priorities, and risk identification",
      "No more guessing who owes you what",
    ],
    outcome: "Full visibility on receivables; recovery plan in place",
  },
  {
    day: "Day 4",
    title: "Payables review",
    icon: Wallet,
    points: [
      "Vendor-wise dues and credit terms",
      "Identification of mismatches and overdue payables",
      "Clear view of what you owe and when",
    ],
    outcome: "Payables under control; no surprises",
  },
  {
    day: "Day 5",
    title: "Cash flow mapping",
    icon: TrendingUp,
    points: [
      "Inflows vs outflows — real picture",
      "Identification of stress points and cash traps",
      "Where money comes from and where it goes",
    ],
    outcome: "Cash flow visibility; stress points known",
  },
  {
    day: "Day 6",
    title: "Implement control systems in ZenithBooks",
    icon: Lock,
    points: [
      "Control systems built inside ZenithBooks",
      "Books of accounts aligned with actual business reality",
      "Leakages locked; discipline brought in",
    ],
    outcome: "Systems running; books match reality",
  },
  {
    day: "Day 7",
    title: "Final review and handover",
    icon: LayoutDashboard,
    points: [
      "Final review and handover to you",
      "Owner dashboard with clear visibility on stock, receivables, payables, cash",
      "Business becomes system-ready",
    ],
    outcome: "You run the business with full confidence",
  },
];

const valueProps = [
  "Full control over Stock, Receivables, Payables, and Cash",
  "Books of accounts aligned with reality",
  "Compliance-ready, system-driven business",
  "No SOPs, no theory — only practical control systems",
  "Run your business proudly after 7 days with full confidence",
];

const whoIsFor = [
  "MSMEs and traditional businesses running unorganized",
  "Businesses with no proper stock control or receivables tracking",
  "Owners with no visibility on payables or real cash flow",
  "Those who survive on positive cash flow but want control and clarity",
  "Anyone ready for a once-in-a-lifetime system reset",
];

export default function BusinessControlProgramPage() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleGetStarted = () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Sign in required",
        description: "Please sign in to get started with the Business Control Program.",
      });
      router.push("/login");
      return;
    }
    setLoading(true);
    router.push(
      `/payment?type=business_control_program&amount=${PRICE}&planName=${encodeURIComponent("Once-in-a-Lifetime Business Control Program")}`
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

      {/* Hero */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Once-in-a-Lifetime Business Control Program</h1>
            <p className="text-muted-foreground">7 days. Full control. No fluff.</p>
          </div>
        </div>
        <p className="text-lg text-muted-foreground">
          The system reset Indian businesses need. After 7 days you have full control over stock, receivables, payables, and cash — and your books match reality. No SOPs, no theory. Only practical control and confidence.
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <strong>{DURATION}</strong>
          </span>
          <span className="flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-primary" />
            <strong>₹{PRICE.toLocaleString("en-IN")}</strong>
            <span className="text-muted-foreground">+ Stock Audit charges as applicable</span>
          </span>
        </div>
      </div>

      {/* Value proposition */}
      <Card className="mb-8 border-2 border-emerald-200 dark:border-emerald-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            What you get after 7 days
          </CardTitle>
          <CardDescription>Control, visibility, and systems — not paperwork.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {valueProps.map((p, i) => (
              <li key={i} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* 7-day program */}
      <Card className="mb-8 border-2 border-primary/20">
        <CardHeader>
          <CardTitle>7-day program — day by day</CardTitle>
          <CardDescription>Every day has a clear outcome. No overlap, no jargon.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {dayBlocks.map((block) => {
            const Icon = block.icon;
            return (
              <div key={block.day} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-primary">
                  <Icon className="h-4 w-4" />
                  {block.day}: {block.title}
                </div>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {block.points.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
                <p className="text-sm font-medium pt-1">
                  → Outcome: {block.outcome}
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Who should take this */}
      <Card className="mb-8 bg-muted/30">
        <CardHeader>
          <CardTitle>Who should take this program?</CardTitle>
          <CardDescription>Built for real Indian businesses that run on cash flow and want control.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {whoIsFor.map((w, i) => (
              <li key={i} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Promise + CTA */}
      <Card className="mb-8 border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20">
        <CardContent className="pt-6">
          <div className="flex gap-3 mb-6">
            <Sparkles className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-lg">ZenithBooks — Beyond Books</h3>
              <p className="text-muted-foreground italic mt-1">
                &ldquo;We don&apos;t just keep your books. We give you control so you can run your business with confidence.&rdquo;
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t">
            <div>
              <p className="text-2xl font-bold flex items-center gap-1">
                <IndianRupee className="h-7 w-7" />
                {PRICE.toLocaleString("en-IN")}
                <span className="text-base font-normal text-muted-foreground">+ Stock Audit as applicable</span>
              </p>
              <p className="text-sm text-muted-foreground">{DURATION} · Control, visibility, systems</p>
            </div>
            <Button size="lg" className="shrink-0 bg-emerald-600 hover:bg-emerald-700" onClick={handleGetStarted} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Get started"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

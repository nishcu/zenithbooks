/**
 * Founder Control Week – One-Week Startup Operating System
 * One stop solution for early-stage startups. ₹9,999 | 7 days | Dedicated team.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Rocket,
  ArrowRight,
  CheckCircle2,
  IndianRupee,
  Loader2,
  Calendar,
  FileText,
  Settings,
  Layers,
  Monitor,
  GraduationCap,
  Target,
  Sparkles,
} from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

const PRICE = 9999;
const DURATION = "7 Days (1 Full Week)";

const dayBlocks = [
  {
    day: "Day 1",
    title: "Business Understanding",
    icon: Target,
    points: [
      "Understand your business model, revenue flow & cost structure",
      "Identify operational gaps & compliance risks",
      "Review current processes (even if they are informal / messy)",
    ],
    outcome: "Clear business flow diagram",
  },
  {
    day: "Day 2–3",
    title: "SOP Design (Tailored, Not Template)",
    icon: FileText,
    points: [
      "Sales & Invoicing",
      "Purchases & Payments",
      "Accounting & GST Flow",
      "Compliance Calendar",
      "Cash Flow & Controls",
      "Roles & Responsibilities (Founder / Team)",
    ],
    outcome: "Custom SOPs that your own team can follow",
  },
  {
    day: "Day 4–5",
    title: "SOP Implementation",
    icon: Settings,
    points: [
      "Implement SOPs practically using ZenithBooks",
      "Configure accounting, GST, documents & controls",
      "Set up workflows so you don't need daily CA dependency",
    ],
    outcome: "Systems running, not just documented",
  },
  {
    day: "Day 6",
    title: "IT & System Review",
    icon: Monitor,
    points: [
      "Review existing tools (Excel, Tally, Apps, Billing software)",
      "Remove redundancies",
      "Integrate everything into one unified system",
    ],
    outcome: "Clean, optimized tech stack",
  },
  {
    day: "Day 7",
    title: "Review, Training & Handover",
    icon: GraduationCap,
    points: [
      "Final review of SOP effectiveness",
      "Train founder / core team",
      "Hand over SOPs + access + checklists",
    ],
    outcome: "Startup becomes self-operational",
  },
];

const outcomes = [
  "End-to-end SOPs",
  "Fully implemented systems",
  "Compliance-ready structure",
  "Founder-controlled operations",
  "Reduced dependency on external vendors",
  "Peace of mind 😄",
];

const whoIsFor = [
  "Early-stage startups",
  "Bootstrapped founders",
  "First-time entrepreneurs",
  "Startups running on Excel + WhatsApp",
  "Founders who want control, clarity & confidence",
];

export default function FounderControlWeekPage() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleGetStarted = () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Sign in required",
        description: "Please sign in to get started with Founder Control Week.",
      });
      router.push("/login");
      return;
    }
    setLoading(true);
    router.push(
      `/payment?type=founder_control_week&amount=${PRICE}&planName=${encodeURIComponent("Founder Control Week")}`
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
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Rocket className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Founder Control Week</h1>
            <p className="text-muted-foreground">One-Week Startup Operating System</p>
          </div>
        </div>
        <p className="text-lg text-muted-foreground">
          One stop solution for early-stage startups. Run your business yourself — with systems, not stress.
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <strong>{DURATION}</strong>
          </span>
          <span className="flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-primary" />
            <strong>₹{PRICE.toLocaleString("en-IN")} only</strong>
          </span>
          <span className="text-muted-foreground">Dedicated ZenithBooks Team – Full-time for 1 Week</span>
        </div>
      </div>

      {/* What We Do – Day by Day */}
      <Card className="mb-8 border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            What We Do (End-to-End in 7 Days)
          </CardTitle>
          <CardDescription>Tailored to your business, not template-based.</CardDescription>
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

      {/* What You Get */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>What You Get at the End of 1 Week</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2">
            {outcomes.map((o, i) => (
              <li key={i} className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Who Is This For */}
      <Card className="mb-8 bg-muted/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Who Is This Perfect For?
          </CardTitle>
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
      <Card className="mb-8 border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50/50 to-purple-50/50 dark:from-violet-950/20 dark:to-purple-950/20">
        <CardContent className="pt-6">
          <div className="flex gap-3 mb-6">
            <Sparkles className="h-6 w-6 text-violet-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-lg">ZenithBooks Promise</h3>
              <p className="text-muted-foreground italic mt-1">
                &ldquo;We don&apos;t run your business. We build systems so you can run it.&rdquo;
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t">
            <div>
              <p className="text-2xl font-bold flex items-center gap-1">
                <IndianRupee className="h-7 w-7" />
                {PRICE.toLocaleString("en-IN")}
                <span className="text-base font-normal text-muted-foreground">/ one-time</span>
              </p>
              <p className="text-sm text-muted-foreground">{DURATION} · Full-time dedicated team</p>
            </div>
            <Button size="lg" className="shrink-0" onClick={handleGetStarted} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Get started"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

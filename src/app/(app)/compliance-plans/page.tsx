/**
 * Monthly Compliance Services - Plan Selection Page
 * ICAI-Compliant: Platform-managed professional resources
 */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Shield, TrendingUp, Award, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";
import { getAllCompliancePlans, type CompliancePlan } from "@/lib/compliance-plans/constants";
import { getComplianceSubscriptionByUserId } from "@/lib/compliance-plans/firestore";

export default function CompliancePlansPage() {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const router = useRouter();
  const [plans] = useState<CompliancePlan[]>(getAllCompliancePlans());
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState<"monthly" | "annual">("annual");
  const [loading, setLoading] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadCurrentSubscription();
    }
  }, [user]);

  const loadCurrentSubscription = async () => {
    if (!user) return;
    try {
      const subscription = await getComplianceSubscriptionByUserId(user.uid);
      setCurrentSubscription(subscription);
    } catch (error) {
      console.error("Error loading subscription:", error);
    }
  };

  const handleSubscribe = async (plan: CompliancePlan) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please sign in to subscribe to compliance plans",
      });
      router.push("/login");
      return;
    }

    setLoading(true);
    try {
      const token = await user.getIdToken();
      const price = selectedBillingPeriod === "annual" ? plan.annualPrice : plan.monthlyPrice;

      // Integrate with payment gateway
      // For now, we'll create subscription and redirect to payment
      const response = await fetch("/api/compliance/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          planTier: plan.id,
          billingPeriod: selectedBillingPeriod,
          autoRenew: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to subscribe");
      }

      // Redirect to payment page
      // TODO: Integrate with existing payment gateway
      toast({
        title: "Subscription Created",
        description: `You will be redirected to complete payment for ${plan.name}`,
      });

      // After payment, subscription will be activated
      router.push(`/payment?type=compliance_plan&plan=${plan.id}&amount=${price}&billingPeriod=${selectedBillingPeriod}`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Subscription Failed",
        description: error.message || "Failed to create subscription. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const planIcons = {
    core: Shield,
    statutory: TrendingUp,
    complete: Award,
  };

  const planColors = {
    core: "from-blue-500 to-cyan-600",
    statutory: "from-purple-500 to-pink-600",
    complete: "from-emerald-500 to-teal-600",
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Monthly Compliance Services</h1>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          Platform-managed compliance services delivered by ZenithBooks' internal professional team. 
          All work is executed by internally engaged or contracted professionals.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Professional services are delivered in accordance with applicable Indian laws and professional regulations.
        </p>
      </div>

      {/* Billing Period Toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-lg border p-1 bg-muted">
          <Button
            variant={selectedBillingPeriod === "monthly" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSelectedBillingPeriod("monthly")}
          >
            Monthly
          </Button>
          <Button
            variant={selectedBillingPeriod === "annual" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSelectedBillingPeriod("annual")}
          >
            Annual
            <Badge className="ml-2 bg-green-600">Save ~16%</Badge>
          </Button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {plans.map((plan) => {
          const Icon = planIcons[plan.id];
          const price = selectedBillingPeriod === "annual" ? plan.annualPrice : plan.monthlyPrice;
          const monthlyEquivalent = selectedBillingPeriod === "annual" ? Math.round(plan.annualPrice / 12) : plan.monthlyPrice;
          const isCurrentPlan = currentSubscription?.planTier === plan.id && currentSubscription?.status === "active";

          return (
            <Card
              key={plan.id}
              className={`relative ${
                plan.id === "complete"
                  ? "border-primary shadow-lg scale-105"
                  : "border-border"
              }`}
            >
              {plan.id === "complete" && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary">Most Popular</Badge>
                </div>
              )}
              {isCurrentPlan && (
                <div className="absolute -top-3 right-4">
                  <Badge variant="secondary">Current Plan</Badge>
                </div>
              )}

              <CardHeader>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${planColors[plan.id]} flex items-center justify-center mb-4`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-base mt-2">{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Pricing */}
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">₹{price.toLocaleString("en-IN")}</span>
                    <span className="text-muted-foreground">
                      /{selectedBillingPeriod === "annual" ? "year" : "month"}
                    </span>
                  </div>
                  {selectedBillingPeriod === "annual" && (
                    <p className="text-sm text-muted-foreground mt-1">
                      ₹{monthlyEquivalent.toLocaleString("en-IN")}/month billed annually
                    </p>
                  )}
                </div>

                {/* Target Audience */}
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm font-medium mb-1">Best For:</p>
                  <p className="text-sm text-muted-foreground">{plan.targetAudience}</p>
                </div>

                {/* Includes */}
                <div className="space-y-2">
                  <p className="font-semibold text-sm">Includes:</p>
                  <ul className="space-y-2">
                    {plan.includes.map((item, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Excludes */}
                {plan.excludes && plan.excludes.length > 0 && (
                  <div className="space-y-2 pt-4 border-t">
                    <p className="font-semibold text-sm text-muted-foreground">Excludes:</p>
                    <ul className="space-y-1">
                      {plan.excludes.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-destructive">×</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Features */}
                <div className="rounded-lg bg-blue-50 p-3 border border-blue-200">
                  <p className="text-xs font-semibold text-blue-900 mb-1">
                    Platform-Managed Delivery
                  </p>
                  <ul className="space-y-1">
                    {plan.features.slice(0, 3).map((feature, index) => (
                      <li key={index} className="text-xs text-blue-800">
                        • {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.id === "complete" ? "default" : "outline"}
                  onClick={() => handleSubscribe(plan)}
                  disabled={loading || isCurrentPlan}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : isCurrentPlan ? (
                    "Current Plan"
                  ) : (
                    `Subscribe to ${plan.name}`
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Compliance Notice */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="text-sm space-y-2">
            <p className="font-semibold">Important:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>
                All compliance work is executed by ZenithBooks' internally engaged or contracted professional resources.
              </li>
              <li>
                No CA marketplace, referrals, or professional selection by clients.
              </li>
              <li>
                Professionals are never exposed to clients directly.
              </li>
              <li>
                Tasks are auto-generated monthly based on your selected plan.
              </li>
              <li>
                All filings are logged with audit trails.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


/**
 * Monthly Compliance Services - Product Showcase Page
 * ICAI-Compliant: Platform-managed professional resources
 */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Shield, TrendingUp, Award, Building2, FileText, Clock, CheckCircle2, Zap, Users, BarChart3, CreditCard, ArrowRight } from "lucide-react";
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

  const handleGetStarted = async (plan: CompliancePlan) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please sign in to get started with compliance services",
      });
      router.push("/login");
      return;
    }

    setLoading(true);
    try {
      const price = selectedBillingPeriod === "annual" ? plan.annualPrice : plan.monthlyPrice;
      
      // Store compliance plan details for payment success page
      localStorage.setItem('pending_compliance_subscription', JSON.stringify({
        planTier: plan.id,
        planName: plan.name,
        billingPeriod: selectedBillingPeriod,
        amount: price,
      }));

      // Redirect to payment page with Cashfree integration
      router.push(`/payment?type=compliance_plan&planTier=${plan.id}&planName=${encodeURIComponent(plan.name)}&amount=${price}&billingPeriod=${selectedBillingPeriod}`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to proceed. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const planConfigs = {
    core: {
      icon: Shield,
      gradient: "from-blue-500 via-blue-600 to-cyan-600",
      bgGradient: "from-blue-50 to-cyan-50",
      borderColor: "border-blue-200/50",
      iconBg: "bg-blue-100",
      iconText: "text-blue-600",
      badge: "Essential",
      tagline: "Perfect for small businesses starting their compliance journey",
    },
    statutory: {
      icon: TrendingUp,
      gradient: "from-purple-500 via-purple-600 to-pink-600",
      bgGradient: "from-purple-50 to-pink-50",
      borderColor: "border-purple-200/50",
      iconBg: "bg-purple-100",
      iconText: "text-purple-600",
      badge: "Popular",
      tagline: "Comprehensive compliance for growing businesses",
    },
    complete: {
      icon: Award,
      gradient: "from-emerald-500 via-emerald-600 to-teal-600",
      bgGradient: "from-emerald-50 to-teal-50",
      borderColor: "border-emerald-200/50",
      iconBg: "bg-emerald-100",
      iconText: "text-emerald-600",
      badge: "Complete",
      tagline: "End-to-end compliance for established companies",
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b">
        <div className="container mx-auto px-6 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Shield className="h-4 w-4" />
              <span>Managed by ZenithBooks Compliance Team</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              Monthly Compliance Services
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Automated GST, Income Tax, Payroll & MCA compliance handled by our professional team. 
              Focus on your business while we handle the paperwork.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span>Auto-generated tasks</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span>Expert team handling</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span>Timely filing guaranteed</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Billing Toggle - Compact */}
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center gap-4 mb-4">
          <Button
            variant={selectedBillingPeriod === "monthly" ? "default" : "outline"}
            size="lg"
            onClick={() => setSelectedBillingPeriod("monthly")}
            className="min-w-[120px]"
          >
            Monthly
          </Button>
          <Button
            variant={selectedBillingPeriod === "annual" ? "default" : "outline"}
            size="lg"
            onClick={() => setSelectedBillingPeriod("annual")}
            className="min-w-[120px] relative"
          >
            Annual
            <Badge className="ml-2 bg-green-600 hover:bg-green-700">Save ~16%</Badge>
          </Button>
        </div>
      </div>

      {/* Products Grid */}
      <div className="container mx-auto px-6 pb-16">
        <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan) => {
            const config = planConfigs[plan.id];
            const Icon = config.icon;
            const price = selectedBillingPeriod === "annual" ? plan.annualPrice : plan.monthlyPrice;
            const monthlyEquivalent = selectedBillingPeriod === "annual" ? Math.round(plan.annualPrice / 12) : plan.monthlyPrice;
            const isCurrentPlan = currentSubscription?.planTier === plan.id && currentSubscription?.status === "active";

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col overflow-hidden transition-all duration-300 hover:shadow-2xl ${
                  plan.id === "statutory"
                    ? "border-2 border-primary shadow-xl scale-105 lg:scale-110"
                    : "border hover:border-primary/50"
                }`}
              >
                {plan.id === "statutory" && (
                  <div className="absolute top-4 right-4 z-10">
                    <Badge className="bg-primary text-primary-foreground shadow-lg">
                      Most Popular
                    </Badge>
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute top-4 left-4 z-10">
                    <Badge variant="secondary" className="shadow-lg">
                      Active Plan
                    </Badge>
                  </div>
                )}

                {/* Product Header with Gradient */}
                <div className={`relative bg-gradient-to-br ${config.gradient} p-8 text-white`}>
                  <div className="absolute inset-0 bg-black/10"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-xl bg-white/20 backdrop-blur-sm`}>
                        <Icon className="h-8 w-8" />
                      </div>
                      <Badge variant="secondary" className="bg-white/20 backdrop-blur-sm text-white border-white/30">
                        {config.badge}
                      </Badge>
                    </div>
                    <h2 className="text-3xl font-bold mb-2">{plan.name}</h2>
                    <p className="text-white/90 text-sm">{config.tagline}</p>
                  </div>
                </div>

                <CardHeader className="pb-4">
                  {/* Pricing */}
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">₹{price.toLocaleString("en-IN")}</span>
                      <span className="text-muted-foreground text-lg">
                        /{selectedBillingPeriod === "annual" ? "year" : "month"}
                      </span>
                    </div>
                    {selectedBillingPeriod === "annual" && (
                      <p className="text-sm text-muted-foreground">
                        Just ₹{monthlyEquivalent.toLocaleString("en-IN")}/month billed annually
                      </p>
                    )}
                  </div>

                  {/* Target Audience */}
                  <div className={`mt-4 p-4 rounded-lg bg-gradient-to-br ${config.bgGradient} border ${config.borderColor}`}>
                    <div className="flex items-start gap-3">
                      <Users className={`h-5 w-5 ${config.iconText} mt-0.5`} />
                      <div>
                        <p className="font-semibold text-sm mb-1">Best For:</p>
                        <p className="text-sm text-muted-foreground">{plan.targetAudience}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 space-y-6">
                  {/* Key Features */}
                  <div>
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      What's Included
                    </h3>
                    <div className="space-y-3">
                      {plan.includes.slice(0, 6).map((item, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className={`mt-1 h-5 w-5 rounded-full ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
                            <Check className={`h-3 w-3 ${config.iconText}`} />
                          </div>
                          <span className="text-sm text-muted-foreground leading-relaxed">{item}</span>
                        </div>
                      ))}
                      {plan.includes.length > 6 && (
                        <p className="text-xs text-muted-foreground pl-8">
                          + {plan.includes.length - 6} more features
                        </p>
                      )}
                    </div>
                  </div>

                  {/* What's Not Included */}
                  {plan.excludes && plan.excludes.length > 0 && (
                    <div className="pt-4 border-t">
                      <h3 className="font-semibold text-sm mb-3 text-muted-foreground">Not Included:</h3>
                      <ul className="space-y-2">
                        {plan.excludes.map((item, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="text-destructive mt-1">×</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Platform Benefits */}
                  <div className={`p-4 rounded-lg bg-gradient-to-br ${config.bgGradient} border ${config.borderColor}`}>
                    <div className="flex items-start gap-3 mb-2">
                      <Shield className={`h-5 w-5 ${config.iconText} mt-0.5`} />
                      <div>
                        <p className="font-semibold text-sm mb-1">Platform-Managed Delivery</p>
                        <p className="text-xs text-muted-foreground">
                          Tasks auto-generate monthly and are handled by ZenithBooks Compliance Team
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>

                {/* CTA Footer */}
                <div className="p-6 pt-0 border-t">
                  <Button
                    className={`w-full h-12 text-base font-semibold ${
                      plan.id === "statutory"
                        ? "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
                        : ""
                    }`}
                    variant={plan.id === "statutory" ? "default" : "outline"}
                    size="lg"
                    onClick={() => handleGetStarted(plan)}
                    disabled={loading || isCurrentPlan}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : isCurrentPlan ? (
                      <>
                        <CheckCircle2 className="mr-2 h-5 w-5" />
                        Currently Active
                      </>
                    ) : (
                      <>
                        Get Started Now
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                  {isCurrentPlan && (
                    <Button
                      variant="ghost"
                      className="w-full mt-2"
                      onClick={() => router.push("/compliance-plans/my-subscription")}
                    >
                      Manage Subscription
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* How It Works Section */}
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground">
              Simple, automated, and hassle-free compliance management
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                icon: CreditCard,
                title: "Choose Your Plan",
                description: "Select the compliance package that fits your business needs",
              },
              {
                icon: Zap,
                title: "Auto Task Generation",
                description: "Tasks are automatically created based on your plan each month",
              },
              {
                icon: FileText,
                title: "Expert Handling",
                description: "Our compliance team handles all filings and submissions",
              },
              {
                icon: CheckCircle2,
                title: "Stay Compliant",
                description: "Receive updates on task status and filing confirmations",
              },
            ].map((step, index) => (
              <Card key={index} className="text-center border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10 w-fit">
                    <step.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="mx-auto mb-2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <CardTitle className="text-lg">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Trust & Compliance Notice */}
      <div className="container mx-auto px-6 pb-16">
        <Card className="max-w-4xl mx-auto border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Platform-Managed Service
            </CardTitle>
            <CardDescription>
              All compliance work is executed by ZenithBooks' internal professional team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold mb-1">Internally Managed</p>
                  <p className="text-muted-foreground text-xs">
                    All compliance work is executed by ZenithBooks' internally engaged or contracted professional resources
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold mb-1">No Marketplace</p>
                  <p className="text-muted-foreground text-xs">
                    No CA marketplace, referrals, or professional selection by clients
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold mb-1">Automated Tasks</p>
                  <p className="text-muted-foreground text-xs">
                    Tasks are auto-generated monthly based on your selected plan
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold mb-1">Full Audit Trail</p>
                  <p className="text-muted-foreground text-xs">
                    All filings are logged with complete audit trails for compliance
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

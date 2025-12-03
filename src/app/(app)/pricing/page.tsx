
"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, X, Edit, Save, IndianRupee, Sparkles } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useRoleSimulator } from "@/context/role-simulator-context";
import { Badge } from "@/components/ui/badge";
import { CashfreeCheckout } from "@/components/payment/cashfree-checkout";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

const initialTiers = [
  {
    id: "freemium",
    name: "Freemium",
    priceMonthly: 0,
    priceAnnual: 0,
    description: "For individuals and small businesses just getting started with billing.",
    features: [
      { text: "Unlimited Invoices & Purchases", included: true },
      { text: "Unlimited Items & Parties Management", included: true },
      { text: "Voice to Invoice", included: true },
      { text: "Rapid Invoice Entry", included: true },
      { text: "Customer & Vendor Management", included: true },
      { text: "Basic Billing Reports", included: true },
      { text: "Bulk Invoice Upload", included: false },
      { text: "Financial Statements (P&L, Balance Sheet)", included: false },
      { text: "GST & TDS Compliance Tools", included: false },
      { text: "Accounting Suite (Ledgers, Journals, Trial Balance)", included: false },
      { text: "CA Certificates & Legal Documents", included: false },
      { text: "Admin Panel / Client Management", included: false },
    ],
    cta: "Start for Free",
  },
  {
    id: "business",
    name: "Business",
    priceMonthly: 199,
    priceAnnual: 1999,
    description: "For businesses needing comprehensive accounting, financial reporting, and tax compliance.",
    features: [
      { text: "Unlimited Invoices & Purchases", included: true },
      { text: "Unlimited Items & Parties Management", included: true },
      { text: "Voice to Invoice & Rapid Entry", included: true },
      { text: "Bulk Invoice Upload", included: true },
      { text: "Full Accounting Suite (Ledgers, Journals, Trial Balance)", included: true },
      { text: "Financial Statements (P&L, Balance Sheet)", included: true },
      { text: "GST Filing & Compliance Tools", included: true },
      { text: "TDS/TCS Reports & Form 16", included: true },
      { text: "CMA Report Generator (Pay-per-use)", included: true },
      { text: "CA Certificates & Legal Documents (Pay-per-use)", included: true },
      { text: "Notice Handling Services (Pay-per-use)", included: true },
      { text: "Admin Panel / Client Management", included: false },
    ],
    cta: "Choose Business Plan",
    isPopular: true,
  },
  {
    id: "professional",
    name: "Professional",
    priceMonthly: 499,
    priceAnnual: 4999,
    description: "For CAs, tax consultants, and firms managing multiple clients.",
    features: [
      { text: "All Business Plan Features", included: true },
      { text: "Full GST Filing & Reconciliation Suite", included: true },
      { text: "Admin Panel with Client Management", included: true },
      { text: "Manage Multiple Client Businesses", included: true },
      { text: "CA Certificates: FREE (All Types)", included: true },
      { text: "Legal Documents: FREE (All Types)", included: true },
      { text: "CMA Reports: FREE", included: true },
      { text: "Notice Handling: FREE", included: true },
      { text: "Priority Support", included: true },
    ],
    cta: "Choose Professional Plan",
  },
];

type TierWithDiscount = typeof initialTiers[0] & { annualDiscount: number };

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annually">("monthly");
  const [tiers, setTiers] = useState<TierWithDiscount[]>(() => 
    initialTiers.map(tier => ({
      ...tier,
      annualDiscount: tier.priceMonthly > 0 ? Math.round(100 - (tier.priceAnnual / (tier.priceMonthly * 12)) * 100) : 0,
    }))
  );
  const [editingTier, setEditingTier] = useState<string | null>(null);
  const { toast } = useToast();
  const { simulatedRole } = useRoleSimulator();
  const isSuperAdmin = simulatedRole === 'super_admin';
  const [user] = useAuthState(auth);
  const [userType, setUserType] = useState<string | null>(null);

  // Fetch user type from Firestore
  useEffect(() => {
    const fetchUserType = async () => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setUserType(userDoc.data().userType || 'business');
          }
        } catch (error) {
          console.error("Error fetching user type:", error);
        }
      }
    };
    fetchUserType();
  }, [user]);

  // Filter tiers based on user type
  const availableTiers = useMemo(() => {
    if (isSuperAdmin) {
      // Super admin sees all tiers for editing
      return tiers;
    }
    if (userType === 'professional') {
      // Professionals can ONLY subscribe to Professional Plan
      return tiers.filter(tier => tier.id === 'professional');
    }
    // Business users can see all plans
    return tiers;
  }, [tiers, userType, isSuperAdmin]);

  const handleEdit = (tierId: string) => {
    setEditingTier(tierId);
  };
  
  const handleSave = (tierId: string) => {
    setEditingTier(null);
    toast({ title: "Pricing Updated", description: `Prices for the ${tiers.find(t=>t.id === tierId)?.name} plan have been saved.`});
  };
  
  const handlePriceChange = (tierId: string, cycle: 'monthly' | 'annually', value: number) => {
      setTiers(prev => prev.map(tier => {
          if (tier.id === tierId) {
            const updatedTier = { ...tier, [cycle === 'monthly' ? 'priceMonthly' : 'priceAnnual']: value };
            // Recalculate discount if a price changes
            const discount = updatedTier.priceMonthly > 0 ? Math.round(100 - (updatedTier.priceAnnual / (updatedTier.priceMonthly * 12)) * 100) : 0;
            return { ...updatedTier, annualDiscount: discount };
          }
          return tier;
      }))
  }
  
  const handleDiscountChange = (tierId: string, discount: number) => {
     setTiers(prev => prev.map(tier => {
          if (tier.id === tierId) {
              const fullAnnualPrice = tier.priceMonthly * 12;
              const newAnnualPrice = Math.round(fullAnnualPrice * (1 - (discount / 100)));
              return { ...tier, priceAnnual: newAnnualPrice, annualDiscount: discount };
          }
          return tier;
      }));
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold">{isSuperAdmin ? 'Manage Subscription Plans' : 'Pricing Plans'}</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          {isSuperAdmin ? 'Edit the pricing and features for each subscription tier.' : 'Choose the plan that\'s right for you. From simple billing to comprehensive professional tools.'}
        </p>
        {userType === 'professional' && !isSuperAdmin && (
          <Alert className="max-w-2xl mx-auto mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              As a professional user, you can only subscribe to the <strong>Professional Plan</strong>. This plan includes Client Management features required to manage multiple business clients. <strong>Plus, all premium services (CA Certificates, Legal Documents, CMA Reports, Notice Handling) are FREE for Professional users.</strong>
            </AlertDescription>
          </Alert>
        )}
        {userType !== 'professional' && !isSuperAdmin && (
          <Alert className="max-w-2xl mx-auto mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Premium Services:</strong> CA Certificates, Legal Documents, CMA Reports, and Notice Handling are available with on-demand pricing. Professional users with Professional Plan get these services <strong>FREE</strong>.
            </AlertDescription>
          </Alert>
        )}
         <div className="flex items-center justify-center space-x-2 mt-6">
          <Label htmlFor="billing-cycle">Monthly</Label>
          <Switch
            id="billing-cycle"
            checked={billingCycle === "annually"}
            onCheckedChange={(checked) =>
              setBillingCycle(checked ? "annually" : "monthly")
            }
          />
          <Label htmlFor="billing-cycle">Annually</Label>
          <Badge variant="secondary" className="ml-2">Save with annual plans!</Badge>
        </div>
      </div>

      <div className={cn("grid gap-8 items-stretch", availableTiers.length === 1 ? "max-w-md mx-auto" : availableTiers.length === 2 ? "md:grid-cols-2 max-w-4xl mx-auto" : "md:grid-cols-2 lg:grid-cols-3")}>
        {availableTiers.map((tier) => {
          const isEditing = editingTier === tier.id;
          const price = billingCycle === 'monthly' ? tier.priceMonthly : tier.priceAnnual;
          const priceSuffix = tier.priceMonthly > 0 ? `/${billingCycle === 'monthly' ? 'month' : 'year'}` : '';
          const annualDiscount = tier.annualDiscount;

          return (
          <Card
            key={tier.id}
            className={cn("flex flex-col transition-all", isEditing && "ring-2 ring-primary")}
          >
            <CardHeader className="relative">
              {tier.isPopular && !isEditing && (
                <div className="absolute top-0 right-4 -mt-3">
                  <div className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                </div>
              )}
              <CardTitle>{tier.name}</CardTitle>
                <div className="flex items-baseline h-10">
                    {isEditing && tier.id !== 'freemium' ? (
                        <div className="flex items-center gap-1">
                            <IndianRupee className="size-5" />
                             <Input 
                                type="number" 
                                value={price} 
                                onChange={(e) => handlePriceChange(tier.id, billingCycle, Number(e.target.value))}
                                className="text-4xl font-bold w-48 border-2"
                            />
                        </div>
                    ) : (
                        <>
                            <span className="text-4xl font-bold">
                                {price > 0 ? `₹${price.toLocaleString('en-IN')}` : "Free"}
                            </span>
                            {price > 0 && <span className="text-muted-foreground ml-1">{priceSuffix}</span>}
                        </>
                    )}
                </div>
                 {billingCycle === 'annually' && annualDiscount > 0 && !isEditing && (
                    <Badge variant="destructive">Save {annualDiscount}%</Badge>
                )}
              <CardDescription className="pt-2">{tier.description}</CardDescription>
            </CardHeader>
            <CardContent className={cn("flex-1", isEditing && "space-y-4")}>
              {isEditing && tier.id !== 'freemium' && (
                 <div className="space-y-2 p-4 border rounded-md">
                    <Label>Annual Discount (%)</Label>
                     <Input 
                        type="number"
                        value={annualDiscount}
                        onChange={(e) => handleDiscountChange(tier.id, Number(e.target.value))}
                        className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">Adjust discount to auto-calculate annual price.</p>
                </div>
              )}
              <ul className="space-y-4">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    {feature.included ? (
                      <Check className="size-5 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <X className="size-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    )}
                    <span className={cn(feature.text.includes("FREE") && "font-semibold text-green-600 dark:text-green-400")}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
              {tier.id === 'professional' && !isEditing && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    <strong>Special Benefit:</strong> Professional users with Professional Plan get all premium services (CA Certificates, Legal Documents, CMA Reports, Notice Handling) completely FREE - no additional charges!
                  </p>
                </div>
              )}
              {tier.id === 'business' && !isEditing && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Premium Services:</strong> CA Certificates (₹1,499-₹3,999), Legal Documents (₹499-₹19,999), CMA Reports (₹4,999), and Notice Handling (₹2,999-₹3,999) are available with pay-per-use pricing.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              {isSuperAdmin ? (
                isEditing ? (
                  <Button variant="secondary" className="w-full" onClick={() => handleSave(tier.id)}>
                    <Save className="mr-2"/> Save Changes
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full" onClick={() => handleEdit(tier.id)}>
                    <Edit className="mr-2"/> Edit Plan
                  </Button>
                )
              ) : (
                <div className="w-full">
                  {tier.priceMonthly === 0 ? (
                    // Free plan
                    userType === 'professional' ? (
                      <Button className="w-full" disabled>
                        Not Available for Professionals
                      </Button>
                    ) : (
                      <Button className="w-full">{tier.cta}</Button>
                    )
                  ) : (
                    // Paid plans
                    user ? (
                      userType === 'professional' && tier.id === 'business' ? (
                        <Button className="w-full" disabled>
                          Professional Plan Required
                        </Button>
                      ) : (
                        <CashfreeCheckout
                          amount={billingCycle === 'monthly' ? tier.priceMonthly : tier.priceAnnual}
                          planId={tier.id}
                          planName={tier.name}
                          userId={user.uid}
                          userEmail={user.email || ''}
                          userName={user.displayName || user.email || ''}
                          onSuccess={(paymentId) => {
                            toast({
                              title: 'Subscription Activated!',
                              description: `Welcome to ${tier.name} plan. Your subscription is now active.`,
                            });
                            // You might want to redirect to dashboard or show success page
                          }}
                          onFailure={() => {
                            toast({
                              variant: 'default',
                              title: 'Payment Couldn\'t Be Processed',
                              description: 'We couldn\'t complete your payment. Please check your payment details and try again.',
                            });
                          }}
                        />
                      )
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => {
                          toast({
                            title: 'Login Required',
                            description: 'Please login or sign up to purchase a subscription.',
                          });
                        }}
                      >
                        Login to Subscribe
                      </Button>
                    )
                  )}
                </div>
              )}
            </CardFooter>
          </Card>
        )})}
      </div>

      {/* Premium Services Information Section */}
      {!isSuperAdmin && (
        <div className="mt-12 max-w-4xl mx-auto">
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Premium Services Pricing Information
              </CardTitle>
              <CardDescription>
                Understanding on-demand pricing for premium services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Premium Services Available:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                    <li>CA Certificates (₹1,499 - ₹3,999 per certificate)</li>
                    <li>Legal Documents (₹499 - ₹19,999 per document)</li>
                    <li>CMA Reports (₹4,999 per report)</li>
                    <li>Notice Handling (₹2,999 - ₹3,999 per notice)</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-green-600 dark:text-green-400">
                    Special Benefit for Professionals:
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    If you are a <strong>Professional user</strong> (CA, Tax Consultant, etc.) with a <strong>Professional Plan</strong> subscription, 
                    all premium services listed above are <strong className="text-green-600 dark:text-green-400">completely FREE</strong> - 
                    no additional payment required!
                  </p>
                </div>
              </div>
              <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Note:</strong> Premium services require Business Plan or higher for access. 
                  Freemium users can access these services after upgrading their subscription plan.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

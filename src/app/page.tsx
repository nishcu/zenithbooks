"use client";

import * as React from "react";
import { ZenithBooksLogo, Receipt, TrendingUp, Shield, Zap, CheckCircle, FileSpreadsheet, BarChart3, FileText, Users, Calculator } from "@/components/icons";
import { Sparkles, Mic } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { ClientOnly } from "@/components/client-only";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { SignupForm } from "@/components/auth/signup-form";
import { DashboardPreview } from "@/components/landing/dashboard-preview";
import { FeaturePreview } from "@/components/landing/feature-preview";
import { SmartAutomationPreview, InvoicingPreview, TaxFinancePreview, CompliancePreview, HRPreview } from "@/components/landing/feature-previews";

export default function LandingPage() {
  const [activeTab, setActiveTab] = React.useState("login");

  // Feature categories for showcase
  const featureCategories = [
    {
      title: "Smart Automation",
      description: "AI-powered tools that automate your accounting workflows",
      icon: Sparkles,
      color: "from-purple-500 to-pink-600",
      features: [
        {
          title: "Smart Journal Entry",
          description: "Create journal entries in plain English with AI assistance",
          icon: Zap,
        },
        {
          title: "Bulk Journal Upload",
          description: "Upload multiple journals via CSV/Excel in one click",
          icon: FileSpreadsheet,
        },
        {
          title: "Bank Reconciliation",
          description: "Auto-create entries from bank statements",
          icon: Calculator,
        },
      ],
    },
    {
      title: "Invoicing",
      description: "Create professional GST invoices in seconds",
      icon: Receipt,
      color: "from-blue-500 to-cyan-600",
      features: [
        {
          title: "Rapid Invoice",
          description: "Fast invoice creation with pre-filled data",
          icon: Zap,
        },
        {
          title: "Bulk Invoice",
          description: "Upload and generate multiple invoices from CSV/Excel",
          icon: FileSpreadsheet,
        },
        {
          title: "Voice to Invoice",
          description: "Create invoices by speaking naturally",
          icon: Mic,
        },
      ],
    },
    {
      title: "Tax & Finance",
      description: "Comprehensive tax calculators and financial tools",
      icon: TrendingUp,
      color: "from-emerald-500 to-teal-600",
      features: [
        {
          title: "Asset Tax Calculator",
          description: "Calculate capital gains for 11 different asset types",
          icon: Calculator,
        },
        {
          title: "Loan Calculator",
          description: "EMI calculations with tax benefit analysis",
          icon: TrendingUp,
        },
        {
          title: "SIP Calculator",
          description: "Post-tax wealth projection for systematic investments",
          icon: BarChart3,
        },
      ],
    },
    {
      title: "Compliance",
      description: "Stay compliant with automated filings and returns",
      icon: Shield,
      color: "from-orange-500 to-red-600",
      features: [
        {
          title: "TDS Returns",
          description: "File TDS and TCS returns seamlessly",
          icon: Shield,
        },
        {
          title: "GST Filings",
          description: "GST returns and compliance",
          icon: FileText,
        },
      ],
    },
    {
      title: "HR",
      description: "Payroll and employee compliance",
      icon: Users,
      color: "from-indigo-500 to-purple-600",
      features: [
        {
          title: "Bulk Form 16",
          description: "Generate Form 16 for multiple employees at once",
          icon: FileText,
        },
        {
          title: "Payroll",
          description: "Complete payroll management with PF, ESI & compliance",
          icon: Users,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section - Full Width */}
      <section className="relative bg-gradient-to-br from-primary/5 via-background to-primary/5 py-16 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <ClientOnly>
            <motion.div
              className="max-w-4xl mx-auto text-center space-y-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* Logo and Brand */}
              <motion.div
                className="flex items-center justify-center gap-4 mb-6"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <ZenithBooksLogo className="h-12 w-12 sm:h-16 sm:w-16 text-primary" />
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
                  ZenithBooks
                </h1>
              </motion.div>

              {/* Main Headline */}
              <motion.h2
                className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                One Cloud Platform For Business Owners & Accounting Professionals
              </motion.h2>

              {/* Subheadline */}
              <motion.p
                className="text-lg sm:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                Create GST Invoices, Maintain Books, Share Data With CAs & Bankers – All On A Secure Cloud Platform.
              </motion.p>

              {/* CTAs */}
              <motion.div
                className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
              >
                <Button
                  asChild
                  size="lg"
                  className="text-lg px-8 py-6 h-auto min-w-[200px]"
                  onClick={() => {
                    const dashboardSection = document.getElementById("dashboard-preview");
                    dashboardSection?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <a href="#dashboard-preview">View Dashboard Preview</a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="text-lg px-8 py-6 h-auto min-w-[200px]"
                  onClick={() => {
                    const authSection = document.getElementById("auth-panel");
                    authSection?.scrollIntoView({ behavior: "smooth" });
                    setActiveTab("signup");
                  }}
                >
                  <a href="#auth-panel">Sign Up Free</a>
                </Button>
              </motion.div>
            </motion.div>
          </ClientOnly>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section id="dashboard-preview" className="py-12 lg:py-16 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <ClientOnly>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <DashboardPreview />
            </motion.div>
          </ClientOnly>
        </div>
      </section>

      {/* Feature Showcase Sections */}
      <section className="py-12 lg:py-16 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <ClientOnly>
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                Everything You Need in One Platform
              </h2>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
                Powerful features designed for Indian businesses and accounting professionals
              </p>
            </motion.div>

            <div className="space-y-16 lg:space-y-24">
              {featureCategories.map((category, categoryIdx) => (
                <motion.div
                  key={categoryIdx}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: categoryIdx * 0.1 }}
                  className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center"
                >
                  {/* Content Side */}
                  <div className={categoryIdx % 2 === 0 ? "order-1" : "order-2"}>
                    <div className="flex items-center gap-4 mb-6">
                      <div className={`p-3 rounded-lg bg-gradient-to-br ${category.color} text-white`}>
                        <category.icon className="h-8 w-8" />
                      </div>
                      <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
                        {category.title}
                      </h3>
                    </div>
                    <p className="text-lg text-muted-foreground mb-8">
                      {category.description}
                    </p>
                    <div className="space-y-4">
                      {category.features.map((feature, featureIdx) => (
                        <motion.div
                          key={featureIdx}
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: categoryIdx * 0.1 + featureIdx * 0.1 }}
                          className="flex items-start gap-4"
                        >
                          <div className={`p-2 rounded-lg bg-gradient-to-br ${category.color} text-white mt-1`}>
                            <feature.icon className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold mb-1">{feature.title}</h4>
                            <p className="text-muted-foreground">{feature.description}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Interactive Preview Side */}
                  <div className={categoryIdx % 2 === 0 ? "order-2" : "order-1"}>
                    <FeaturePreview
                      title={category.title}
                      description={category.description}
                      color={category.color}
                      previewContent={
                        categoryIdx === 0 ? <SmartAutomationPreview /> :
                        categoryIdx === 1 ? <InvoicingPreview /> :
                        categoryIdx === 2 ? <TaxFinancePreview /> :
                        categoryIdx === 3 ? <CompliancePreview /> :
                        <HRPreview />
                      }
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </ClientOnly>
        </div>
      </section>

      {/* Trust Indicators Section */}
      <section className="py-12 lg:py-16 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <ClientOnly>
            <motion.div
              className="text-center space-y-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-2xl sm:text-3xl font-bold">Trusted by Businesses Across India</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
                <Card className="border-2">
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold text-primary mb-2">100,000+</div>
                    <p className="text-muted-foreground">Active Users</p>
                  </CardContent>
                </Card>
                <Card className="border-2">
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold text-primary mb-2">GST Ready</div>
                    <p className="text-muted-foreground">Compliance Certified</p>
                  </CardContent>
                </Card>
                <Card className="border-2">
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold text-primary mb-2">Secure</div>
                    <p className="text-muted-foreground">Hosted in India</p>
                  </CardContent>
                </Card>
              </div>
              <p className="text-sm text-muted-foreground">
                Hosted in India • GST & Compliance Ready • Designed by Finance Professionals
              </p>
            </motion.div>
          </ClientOnly>
        </div>
      </section>

      {/* Zenith Corporate Mitra & Professional Network Section */}
      <section className="py-12 lg:py-16 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <ClientOnly>
            <motion.div
              className="max-w-5xl mx-auto space-y-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                  Professional Services & Support
                </h2>
                <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
                  Connect with experts and get comprehensive compliance support
                </p>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                {/* Zenith Corporate Mitra */}
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                >
                  <Card className="border-2 h-full hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                          <Users className="h-8 w-8" />
                        </div>
                        <div>
                          <CardTitle className="text-2xl">Zenith Corporate Mitra</CardTitle>
                          <CardDescription className="text-base">
                            Join ZenithBooks Team - Earn While You Learn
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium">Perfect for Young CAs, Accountants & Students</p>
                            <p className="text-sm text-muted-foreground">
                              Join our team and gain hands-on experience while earning. Work on real compliance cases and build your expertise.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium">Earn Competitive Compensation</p>
                            <p className="text-sm text-muted-foreground">
                              Get paid for handling GST, Income Tax, Payroll & MCA compliance for ZenithBooks clients. Flexible work hours.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium">Build Your Professional Profile</p>
                            <p className="text-sm text-muted-foreground">
                              Enhance your skills, work with experienced professionals, and grow your career in accounting and compliance.
                            </p>
                          </div>
                        </div>
                      </div>
                      <Button asChild className="w-full mt-6">
                        <Link href="/compliance-associate">Join as Zenith Corporate Mitra</Link>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* CA Networking & Knowledge Sharing */}
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                >
                  <Card className="border-2 h-full hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
                          <Users className="h-8 w-8" />
                        </div>
                        <div>
                          <CardTitle className="text-2xl">CA Networking & Knowledge Sharing</CardTitle>
                          <CardDescription className="text-base">
                            Connect with professionals and share expertise
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium">Professional Network</p>
                            <p className="text-sm text-muted-foreground">
                              Find and connect with CAs, CS, CMA, and tax practitioners across India
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium">Knowledge Sharing Platform</p>
                            <p className="text-sm text-muted-foreground">
                              Share insights, best practices, and stay updated with industry trends
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium">Client-Professional Matching</p>
                            <p className="text-sm text-muted-foreground">
                              Business owners can discover and connect with qualified professionals for their needs
                            </p>
                          </div>
                        </div>
                      </div>
                      <Button asChild variant="outline" className="w-full mt-6">
                        <Link href="/professional-services">Explore Professional Network</Link>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </motion.div>
          </ClientOnly>
        </div>
      </section>

      {/* Auth Panel Section - Sticky on Desktop, Regular on Mobile */}
      <section
        id="auth-panel"
        className="bg-background border-t"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="max-w-md mx-auto lg:max-w-lg space-y-6">
            <motion.div
              className="text-center space-y-2"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <ZenithBooksLogo className="h-12 w-12 text-primary mx-auto" />
              <h2 className="text-2xl sm:text-3xl font-bold">Get Started Today</h2>
              <p className="text-muted-foreground">Sign in to your account or create a new one</p>
            </motion.div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" className="text-base">Login</TabsTrigger>
                <TabsTrigger value="signup" className="text-base">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-6">
                <LoginForm />
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <SignupForm />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>
    </div>
  );
}

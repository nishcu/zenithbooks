
"use client";

import * as React from "react";
import { ZenithBooksLogo, Receipt, TrendingUp, Shield, Zap, CheckCircle } from "@/components/icons";
import { AnimatePresence, motion } from "framer-motion";
import { ClientOnly } from "@/components/client-only";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { SignupForm } from "@/components/auth/signup-form";

export default function LandingPage() {
  const [activeTab, setActiveTab] = React.useState("login");

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Left Side - Marketing (60%) */}
      <div className="flex-1 lg:w-3/5 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-6 lg:p-12 flex flex-col justify-between order-2 lg:order-1">
        <div className="space-y-12">
          {/* Brand Block */}
          <ClientOnly>
      <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
            <div className="flex items-center gap-3">
              <ZenithBooksLogo className="h-10 w-10 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">ZenithBooks</h1>
            </div>
            <p className="text-xl text-muted-foreground">Beyond Books. Smart Accounting for India.</p>
        </motion.div>
          </ClientOnly>

          {/* Hero Section */}
          <ClientOnly>
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
            <div className="space-y-4">
                <h2 className="text-4xl lg:text-5xl font-bold leading-tight">
                One Platform For GST Billing, Books & Compliance
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl">
                Built For Business Owners And Accounting Professionals – Create GST Invoices, Maintain Books, Share Data With CAs & Bankers, All On A Secure Cloud Platform.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 max-w-md">
              <Button asChild size="lg" className="text-lg px-8">
                <Link href="#signup">Create Free Account</Link>
              </Button>
              <Button asChild variant="link" size="lg" className="text-lg">
                <Link href="#login">Or Login To Your Account</Link>
              </Button>
            </div>
        </motion.div>
          </ClientOnly>

          {/* Key USPs - 2x2 Grid */}
          <ClientOnly>
                <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
            {/* For Business Users */}
            <Card className="border-2">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Receipt className="h-8 w-8 text-primary" />
                  <h3 className="text-xl font-semibold">For Business Users</h3>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Create GST invoices in seconds by Voice & Rapid
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Generate Bulk Invoices, Bulk Journals & Booking Keeping on a click
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Select your professional (CA/CS/CWA/Auditor/Accountant/etc)
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* For Professionals */}
            <Card className="border-2">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-8 w-8 text-primary" />
                  <h3 className="text-xl font-semibold">For Professionals</h3>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Manage Multiple Clients From One Dashboard
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Review Uploaded Books & Documents
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Speed Up Audits, Filings & Reconciliations
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* AI & Automation */}
            <Card className="border-2">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Zap className="h-8 w-8 text-primary" />
                  <h3 className="text-xl font-semibold">AI & Automation</h3>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    AI-Assisted HSN/SAC Suggestions
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Bulk Invoice & Journal Uploads
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    One-Click Ledger And Trial Balance Views
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Secure Digital Vault */}
            <Card className="border-2">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Shield className="h-8 w-8 text-primary" />
                  <h3 className="text-xl font-semibold">Secure Digital Vault</h3>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Store IT, GST, MCA, Bank & Loan Documents
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Share With Lenders Via Secret Codes
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Auto-Expire Access Without Follow-Up
                  </li>
                </ul>
              </CardContent>
            </Card>
                </motion.div>
          </ClientOnly>

          {/* Two-User Persona Strip */}
          <ClientOnly>
            <motion.div
              className="bg-primary/10 rounded-lg p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
            <h3 className="text-lg font-semibold mb-4">Who is ZenithBooks for?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <strong>Business Owners</strong> – SMEs, startups, traders, service providers
                </div>
                <p className="text-muted-foreground ml-6">
                  You Focus On Business & Advisory. ZenithBooks Handles The Books & Documents.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <strong>Professionals</strong> – CA, CS, CMA, tax practitioners, auditors
                </div>
                <p className="text-muted-foreground ml-6">
                  Manage Multiple Clients, Review Books, And Streamline Audits From One Dashboard.
                </p>
              </div>
            </div>
        </motion.div>
          </ClientOnly>
        </div>

        {/* Trust Line - Footer */}
        <ClientOnly>
          <motion.div
            className="text-center text-sm text-muted-foreground border-t pt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
          <p>Hosted in India • GST & Compliance Ready • Designed by Finance Professionals</p>
        </motion.div>
        </ClientOnly>
      </div>

      {/* Right Side - Auth Panel (40%) */}
      <div className="w-full lg:w-2/5 bg-background border-l lg:border-l lg:border-t-0 border-t flex items-center justify-center p-6 lg:p-12 order-1 lg:order-2 min-h-[500px] lg:min-h-screen">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <ZenithBooksLogo className="h-12 w-12 text-primary mx-auto" />
            <h2 className="text-2xl font-bold">Welcome to ZenithBooks</h2>
            <p className="text-muted-foreground">Sign in to your account or create a new one</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
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
    </div>
  );
}

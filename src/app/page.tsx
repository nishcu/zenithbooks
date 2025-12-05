
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
            <motion.div
              className="flex items-center gap-3"
              animate={{
                y: [0, -5, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <motion.div
                animate={{
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.05, 1]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <ZenithBooksLogo className="h-10 w-10 text-primary" />
              </motion.div>
              <h1 className="text-3xl font-bold tracking-tight">ZenithBooks</h1>
            </motion.div>
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
                <motion.h2
                className="text-4xl lg:text-5xl font-bold leading-tight"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                One Cloud Platform For Business Owners & Accounting Professionals
              </motion.h2>
              <p className="text-xl text-muted-foreground max-w-2xl">
                Create GST Invoices, Maintain Books, Share Data With CAs & Bankers – All On A Secure Cloud Platform.
              </p>
            </div>

            <motion.div
              className="flex flex-col sm:flex-row gap-4 max-w-md"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button asChild size="lg" className="text-lg px-8">
                  <Link href="#signup">Create Free Account</Link>
                </Button>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button asChild variant="link" size="lg" className="text-lg">
                  <Link href="#login">Or Login To Your Account</Link>
                </Button>
              </motion.div>
            </motion.div>
        </motion.div>
          </ClientOnly>

          {/* Key USPs - 2x2 Grid */}
          <ClientOnly>
                <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
                    initial="hidden"
                    animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.2,
                    delayChildren: 0.6
                  }
                }
              }}
            >
            {/* For Business Users */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 30, scale: 0.95 },
                visible: {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: {
                    duration: 0.6,
                    ease: "easeOut"
                  }
                }
              }}
              whileHover={{
                scale: 1.02,
                transition: { duration: 0.2 }
              }}
            >
              <Card className="border-2 hover:shadow-lg transition-shadow duration-300">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{
                        rotate: [0, 5, -5, 0],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <Receipt className="h-8 w-8 text-primary" />
                    </motion.div>
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
            </motion.div>

            {/* For Professionals */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 30, scale: 0.95 },
                visible: {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: {
                    duration: 0.6,
                    ease: "easeOut"
                  }
                }
              }}
              whileHover={{
                scale: 1.02,
                transition: { duration: 0.2 }
              }}
            >
              <Card className="border-2 hover:shadow-lg transition-shadow duration-300">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{
                        y: [0, -3, 0],
                        rotate: [0, 2, -2, 0]
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <TrendingUp className="h-8 w-8 text-primary" />
                    </motion.div>
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
            </motion.div>

            {/* AI & Automation */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 30, scale: 0.95 },
                visible: {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: {
                    duration: 0.6,
                    ease: "easeOut"
                  }
                }
              }}
              whileHover={{
                scale: 1.02,
                transition: { duration: 0.2 }
              }}
            >
              <Card className="border-2 hover:shadow-lg transition-shadow duration-300">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{
                        scale: [1, 1.2, 1],
                        rotate: [0, 180, 360]
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <Zap className="h-8 w-8 text-primary" />
                    </motion.div>
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
            </motion.div>

            {/* Secure Digital Vault */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 30, scale: 0.95 },
                visible: {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: {
                    duration: 0.6,
                    ease: "easeOut"
                  }
                }
              }}
              whileHover={{
                scale: 1.02,
                transition: { duration: 0.2 }
              }}
            >
              <Card className="border-2 hover:shadow-lg transition-shadow duration-300">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.8, 1, 0.8]
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <Shield className="h-8 w-8 text-primary" />
                    </motion.div>
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

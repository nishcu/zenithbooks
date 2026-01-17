"use client";

import { LoginForm } from "@/components/auth/login-form";
import { ZenithBooksLogo } from "@/components/icons";
import { motion } from "framer-motion";
import { ClientOnly } from "@/components/client-only";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding & Visual (Hidden on mobile, shown on larger screens) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/95 to-primary/90 relative overflow-hidden">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 text-white">
          <ClientOnly>
            <motion.div
              className="space-y-8"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* Logo & Brand */}
              <motion.div
                className="flex items-center gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/20">
                  <ZenithBooksLogo className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">ZenithBooks</h1>
                  <p className="text-white/80 text-sm">AI-Driven. CA-Approved.</p>
                </div>
              </motion.div>

              {/* Hero Text */}
              <motion.div
                className="space-y-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                <h2 className="text-4xl xl:text-5xl font-bold leading-tight">
                  Welcome Back
                </h2>
                <p className="text-xl text-white/90 leading-relaxed max-w-lg">
                  Sign in to continue managing your business finances and accounting with ease.
                </p>
              </motion.div>

              {/* Features List */}
              <motion.ul
                className="space-y-4 mt-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                {[
                  "Secure cloud-based accounting",
                  "GST invoicing & compliance",
                  "Real-time financial insights",
                ].map((feature, index) => (
                  <motion.li
                    key={feature}
                    className="flex items-center gap-3 text-white/90"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1, duration: 0.4 }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
                    <span>{feature}</span>
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>
          </ClientOnly>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          {/* Login Form Card */}
          <motion.div
            className="bg-card rounded-xl lg:rounded-2xl shadow-lg border border-border/50 p-6 sm:p-8 lg:p-10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Mobile: Compact Header */}
            <div className="space-y-1 mb-6 lg:mb-8">
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground">Sign In</h2>
              <p className="text-sm lg:text-base text-muted-foreground hidden lg:block">
                Enter your credentials to access your account
              </p>
            </div>

            <LoginForm />
          </motion.div>

          {/* Desktop Footer Only */}
          <motion.div
            className="hidden lg:block text-center text-sm text-muted-foreground mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <p>&copy; {new Date().getFullYear()} ZenithBooks. All rights reserved.</p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

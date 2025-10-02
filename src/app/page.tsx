

"use client";

import * as React from "react";
import { useEffect } from "react";
import { ZenithBooksLogo } from "@/components/icons";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";

const features = [
  "A Complete GST & CA SaaS Platform.",
  "Beyond Just Books.",
  "Quick Invoices & Purchases",
  "Automated Accounting",
  "Financial Reports",
  "GST Compliance",
  "CA Certificates & Legal Docs",
  "And much more...",
];

export default function SplashScreen() {
  const [index, setIndex] = React.useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % features.length);
    }, 2000); // Change feature every 2 seconds

    return () => {
        clearInterval(interval);
    };
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-primary text-primary-foreground p-4 overflow-hidden">
      <motion.div
        className="flex flex-col items-center gap-4 text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <ZenithBooksLogo className="h-24 w-24 text-primary-foreground" />
        </motion.div>
        
        <motion.div variants={itemVariants} className="text-center">
            <h1 className="text-4xl font-bold tracking-tight">ZenithBooks</h1>
            <p className="text-lg text-primary-foreground/80">Beyond Books</p>
        </motion.div>

        <motion.div variants={itemVariants} className="mt-8 h-8 text-xl font-medium text-primary-foreground/90">
            <AnimatePresence mode="wait">
                <motion.div
                    key={features[index]}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                >
                    {features[index]}
                </motion.div>
            </AnimatePresence>
        </motion.div>

         <motion.div variants={itemVariants} className="mt-12 flex flex-col sm:flex-row gap-4 w-full max-w-xs">
            <Button asChild size="lg" className="w-full" variant="secondary">
                <Link href="/login">Login</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full bg-primary/20 border-primary-foreground/50 text-primary-foreground hover:bg-primary-foreground/10">
                <Link href="/signup">Sign Up</Link>
            </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}

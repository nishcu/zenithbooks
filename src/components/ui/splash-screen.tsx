"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ZenithBooksLogo } from "@/components/icons";
import { cn } from "@/lib/utils";

export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Only show splash on initial page load
    if (typeof window === 'undefined') return;
    
    setMounted(true);
    
    // Use requestAnimationFrame to ensure DOM is ready and avoid hydration issues
    requestAnimationFrame(() => {
      // Ensure classes are set (backup in case head script didn't run)
      if (document.body) {
        document.body.classList.add('splash-active');
      }
      if (document.documentElement) {
        document.documentElement.classList.add('splash-active');
      }
    });
    
    // Hide splash after 2 seconds (increased from 1.5s for better readability)
    const timer = setTimeout(() => {
      setIsVisible(false);
      
      // Remove classes after fade animation completes
      setTimeout(() => {
        if (document.body) {
          document.body.classList.remove('splash-active');
        }
        if (document.documentElement) {
          document.documentElement.classList.remove('splash-active');
        }
      }, 500);
    }, 2000);

    return () => {
      clearTimeout(timer);
      // Cleanup on unmount
      if (document.body) {
        document.body.classList.remove('splash-active');
      }
      if (document.documentElement) {
        document.documentElement.classList.remove('splash-active');
      }
    };
  }, []);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="splash-screen"
          className={cn(
            "fixed inset-0 z-[9999] flex items-center justify-center",
            "bg-gradient-to-br from-primary via-primary/95 to-primary/90"
          )}
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            transition: { duration: 0.5, ease: "easeOut" }
          }}
          style={{ pointerEvents: isVisible ? 'auto' : 'none' }}
        >
          {/* Main Content - Centered with generous spacing */}
          <motion.div
            className="relative z-10 flex flex-col items-center justify-center space-y-8 sm:space-y-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.6,
              ease: "easeOut",
            }}
          >
            {/* Large Logo */}
            <motion.div
              className="relative"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <ZenithBooksLogo className="h-24 w-24 sm:h-32 sm:w-32 md:h-40 md:w-40 text-white" />
            </motion.div>

            {/* Brand Name - Much Larger */}
            <motion.div
              className="flex flex-col items-center space-y-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <h1
                className="text-5xl sm:text-6xl md:text-7xl font-bold text-white tracking-tight"
                style={{
                  fontFamily: "var(--font-inter), sans-serif",
                  textShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
                }}
              >
                ZenithBooks
              </h1>
              <p className="text-xl sm:text-2xl md:text-3xl text-white/95 font-light">
                AI-Driven. Professional-Grade.
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


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
    
    // Hide splash after 1.5 seconds
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
      }, 450);
    }, 1500);

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
            "bg-gradient-to-br from-primary via-primary/98 to-primary"
          )}
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            transition: { duration: 0.4, ease: "easeOut" }
          }}
          style={{ pointerEvents: isVisible ? 'auto' : 'none' }}
        >
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              className="absolute inset-0 opacity-10"
              animate={{
                backgroundPosition: ["0% 0%", "100% 100%"],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "linear",
              }}
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                backgroundSize: "40px 40px",
              }}
            />
          </div>

          {/* Main Content */}
          <motion.div
            className="relative z-10 flex flex-col items-center justify-center space-y-6"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.5,
              ease: "easeOut",
            }}
          >
            {/* Logo Container */}
            <motion.div
              className="relative"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {/* Logo */}
              <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-xl border border-white/20">
                <ZenithBooksLogo className="h-16 w-16 sm:h-20 sm:w-20 text-white" />
              </div>
            </motion.div>

            {/* Brand Name */}
            <motion.div
              className="flex flex-col items-center space-y-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <h1
                className="text-4xl sm:text-5xl font-bold text-white tracking-tight"
                style={{
                  fontFamily: "var(--font-inter), sans-serif",
                  textShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
                }}
              >
                ZenithBooks
              </h1>
              <p className="text-lg sm:text-xl text-white/90 font-light">
                AI-Driven. Professional-Grade.
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Maximize2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeaturePreviewProps {
  title: string;
  description: string;
  previewContent: React.ReactNode;
  color: string;
}

export function FeaturePreview({ title, description, previewContent, color }: FeaturePreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <Card className="border-2 overflow-hidden cursor-pointer group hover:shadow-lg transition-all duration-300" onClick={() => setIsExpanded(true)}>
        <CardContent className="p-6 bg-gradient-to-br from-muted/50 to-muted/30 min-h-[300px] flex flex-col items-center justify-center relative">
          {/* Preview Content */}
          <div className="w-full h-full flex items-center justify-center">
            {previewContent}
          </div>
          
          {/* Overlay on Hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="flex items-center gap-2 text-primary font-medium">
              <span>Click to view preview</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expanded Modal */}
      <AnimatePresence>
        {isExpanded && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setIsExpanded(false)}
            />
            
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-4 sm:inset-8 md:inset-12 lg:inset-16 z-50 bg-background rounded-lg shadow-2xl border-2 overflow-hidden"
            >
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className={cn("px-6 py-4 border-b bg-gradient-to-r", color)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white">{title}</h3>
                      <p className="text-sm text-white/90">{description}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsExpanded(false)}
                      className="text-white hover:bg-white/20"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
                  {previewContent}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

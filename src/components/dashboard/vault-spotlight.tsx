"use client";

import Link from "next/link";
import { Lock, Shield, Clock, FileCheck, ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function VaultSpotlight() {
  return (
    <Card className="relative overflow-hidden border-2 border-primary/20 shadow-2xl bg-gradient-to-br from-primary/5 via-background to-primary/5">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 via-blue-500/5 to-pink-500/5 pointer-events-none" />
      
      <CardHeader className="relative pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
                <Sparkles className="h-3 w-3 mr-1" />
                Featured Product
              </Badge>
            </div>
            <CardTitle className="text-3xl lg:text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Digital Document Vault
            </CardTitle>
            <CardDescription className="text-lg text-muted-foreground max-w-2xl">
              Secure document storage & sharing for GST, Tax and Banking.
            </CardDescription>
          </div>
          
          {/* Icon */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
              <Lock className="h-10 w-10 text-white" />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-6">
        {/* Features Grid - Minimized */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔐</span>
            <span className="text-muted-foreground">Secret-code access</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">⏱</span>
            <span className="text-muted-foreground">Auto-lock after 5 days</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">🚫</span>
            <span className="text-muted-foreground">No WhatsApp or email</span>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-4 pt-4 border-t border-primary/10">
          <Button asChild size="lg" className="shadow-lg">
            <Link href="/vault" className="group">
              Open Document Vault
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


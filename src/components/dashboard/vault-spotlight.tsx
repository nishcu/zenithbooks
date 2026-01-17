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
              Secure, intelligent document management for Indian businesses. Store GST, Income Tax, MCA, and Banking documents with enterprise-grade security.
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
        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-background/50 border border-primary/10 hover:border-primary/30 transition-colors">
            <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-1">Secret Code Sharing</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Share documents securely without email or WhatsApp. Recipients access with a secret code.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl bg-background/50 border border-primary/10 hover:border-primary/30 transition-colors">
            <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-1">Auto-Lock After 5 Days</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Documents automatically lock after sharing period ends. Zero manual intervention needed.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl bg-background/50 border border-primary/10 hover:border-primary/30 transition-colors">
            <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
              <FileCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-1">Zero WhatsApp/Email</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Eliminate document sharing via insecure channels. All access happens through secure platform.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-primary/10">
          <div>
            <p className="text-sm font-medium text-foreground mb-1">
              Trusted by 10,000+ Indian businesses & CAs
            </p>
            <p className="text-xs text-muted-foreground">
              Enterprise-grade security • GDPR compliant • Professional workflow
            </p>
          </div>
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


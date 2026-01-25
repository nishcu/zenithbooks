"use client";

import Link from "next/link";
import { Lock, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function VaultCard() {
  return (
    <div className="bg-gradient-to-br from-pink-500 to-blue-500 rounded-2xl p-5 shadow-lg">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-white/20 rounded-lg">
            <Lock className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Digital Document Vault</h3>
            <p className="text-sm text-white/90">
              Secure document storage & sharing for GST, Tax and Banking.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-white/90 text-sm">
          <div className="flex items-center gap-1.5">
            <span>🔐</span>
            <span>Secret-code access</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>⏱</span>
            <span>Auto-lock after 5 days</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>🚫</span>
            <span>No WhatsApp or email</span>
          </div>
        </div>

        <Button 
          asChild 
          className="w-full bg-white text-pink-600 hover:bg-white/90 font-semibold mt-4"
        >
          <Link href="/vault">Open Vault</Link>
        </Button>
      </div>
    </div>
  );
}


"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface UpgradeRequiredAlertProps {
  featureName: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}

export function UpgradeRequiredAlert({
  featureName,
  description,
  backHref = "/dashboard",
  backLabel = "Back to Dashboard",
}: UpgradeRequiredAlertProps) {
  const router = useRouter();

  return (
    <Alert className="border-primary bg-primary/5">
      <AlertCircle className="h-4 w-4 text-primary" />
      <AlertTitle className="text-lg font-semibold">Upgrade Required</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-4">
          <strong>{featureName}</strong> is a premium feature available for <strong>Business</strong> and <strong>Professional</strong> plans.
        </p>
        {description && (
          <p className="mb-4">
            {description}
          </p>
        )}
        <div className="flex gap-2 mt-4">
          <Button onClick={() => router.push('/pricing')} className="bg-primary hover:bg-primary/90">
            View Pricing Plans
          </Button>
          <Button variant="outline" onClick={() => router.push(backHref)}>
            {backLabel}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}


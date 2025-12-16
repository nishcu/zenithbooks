"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function IncomeTaxIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/income-tax/tds-returns");
  }, [router]);

  return null;
}


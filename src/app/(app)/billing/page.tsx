import { redirect } from "next/navigation";

export default function BillingIndexRedirectPage() {
  redirect("/billing/invoices");
}



import { redirect } from "next/navigation";

/**
 * /corporate-mitra – redirect to dashboard so this URL does not 404.
 */
export default function CorporateMitraPage() {
  redirect("/corporate-mitra/dashboard");
}

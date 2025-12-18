import { redirect } from "next/navigation";

export default function FinancialStatementsIndexRedirectPage() {
  redirect("/accounting/financial-statements/profit-and-loss");
}



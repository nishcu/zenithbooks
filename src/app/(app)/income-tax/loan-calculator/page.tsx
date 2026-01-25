"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import {
  Calculator,
  CreditCard,
  Info,
  ChevronRight,
  ChevronLeft,
  Download,
  AlertCircle,
  TrendingUp,
  Scale,
  PieChart,
  FileText,
} from "lucide-react";
import {
  calculateLoan,
  LOAN_TYPE_LABELS,
  BORROWER_TYPE_LABELS,
  TAX_REGIME_LABELS,
  type LoanInput,
  type LoanType,
  type BorrowerType,
  type TaxRegime,
  type TenureUnit,
  type LoanCalculatorResult,
} from "@/lib/loan-calculator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STEPS = [
  { id: 1, title: "Loan details", description: "Type, amount, rate, tenure" },
  { id: 2, title: "Tax & borrower", description: "Regime, borrower type, specifics" },
  { id: 3, title: "Results & schedule", description: "EMI, tax benefits, amortization" },
];

const defaultForm: Partial<LoanInput> = {
  loanType: "housing_loan",
  loanAmount: 5000000,
  interestRate: 8.5,
  tenure: 20,
  tenureUnit: "years",
  loanStartDate: new Date().toISOString().split("T")[0],
  borrowerType: "salaried_individual",
  taxRegime: "old_regime",
  propertyType: "self_occupied",
};

export default function LoanCalculatorPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Partial<LoanInput>>(defaultForm);
  const [result, setResult] = useState<LoanCalculatorResult | null>(null);

  const canProceedStep1 = () => {
    return (
      form.loanType &&
      form.loanAmount != null &&
      form.loanAmount > 0 &&
      form.interestRate != null &&
      form.interestRate > 0 &&
      form.tenure != null &&
      form.tenure > 0 &&
      form.loanStartDate
    );
  };

  const canProceedStep2 = () => {
    return canProceedStep1() && form.borrowerType && form.taxRegime;
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleCalculate();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleCalculate = () => {
    if (!canProceedStep2()) return;

    try {
      const input: LoanInput = {
        loanType: form.loanType!,
        loanAmount: form.loanAmount!,
        interestRate: form.interestRate!,
        tenure: form.tenure!,
        tenureUnit: form.tenureUnit || "years",
        loanStartDate: form.loanStartDate!,
        borrowerType: form.borrowerType!,
        taxRegime: form.taxRegime!,
        propertyType: form.propertyType,
        jointLoan: form.jointLoan,
        coBorrowerShare: form.coBorrowerShare,
        prepaymentAmount: form.prepaymentAmount,
        prepaymentDate: form.prepaymentDate,
        educationLoanStartYear: form.educationLoanStartYear,
        averageUtilisation: form.averageUtilisation,
        vehicleUsage: form.vehicleUsage,
        vehicleCost: form.vehicleCost,
        marginalTaxSlab: form.marginalTaxSlab,
      };

      const calculationResult = calculateLoan(input);
      setResult(calculationResult);
      setStep(3);
    } catch (error) {
      console.error("Calculation error:", error);
      alert("Error calculating loan. Please check your inputs.");
    }
  };

  const downloadSchedule = () => {
    if (!result) return;

    const lines: string[] = [
      "ZenithBooks - Loan Calculator - Amortization Schedule",
      "=".repeat(60),
      "",
      `Loan Type: ${LOAN_TYPE_LABELS[result.loanInput.loanType]}`,
      `Loan Amount: ₹${result.loanInput.loanAmount.toLocaleString()}`,
      `Interest Rate: ${result.loanInput.interestRate}% p.a.`,
      `Tenure: ${result.loanInput.tenure} ${result.loanInput.tenureUnit}`,
      `EMI: ₹${result.emiResult.emi.toLocaleString()}`,
      `Total Interest: ₹${result.emiResult.totalInterest.toLocaleString()}`,
      `Total Payment: ₹${result.emiResult.totalPayment.toLocaleString()}`,
      `Tax Saved: ₹${result.postTaxMetrics.totalTaxSaved.toLocaleString()}`,
      `Effective Interest Rate: ${result.postTaxMetrics.effectiveInterestRate.toFixed(2)}%`,
      "",
      "Monthly Amortization Schedule",
      "-".repeat(60),
      "Month | Date | Opening | Principal | Interest | EMI | Closing",
      "-".repeat(60),
    ];

    result.monthlySchedule.forEach((month) => {
      lines.push(
        `${month.month.toString().padStart(5)} | ${month.date} | ${month.openingBalance.toFixed(2).padStart(10)} | ${month.principal.toFixed(2).padStart(10)} | ${month.interest.toFixed(2).padStart(10)} | ${month.emi.toFixed(2).padStart(10)} | ${month.closingBalance.toFixed(2).padStart(10)}`
      );
    });

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `loan-schedule-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const getTaxBadge = () => {
    if (!result) return null;

    const tax = result.taxComputation;
    if (tax.taxSaved && tax.taxSaved > 0) {
      return <Badge className="bg-green-100 text-green-800">Tax Deductible</Badge>;
    } else if (result.loanInput.loanType === "personal_loan") {
      return <Badge variant="outline">No Tax Benefit</Badge>;
    } else {
      return <Badge className="bg-yellow-100 text-yellow-800">Partially Deductible</Badge>;
    }
  };

  return (
    <div className="space-y-8 p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <CreditCard className="h-8 w-8" />
          Unified Loan Calculator
        </h1>
        <p className="text-muted-foreground mt-1">
          Calculate EMI, amortization schedule, and income tax implications for all loan types.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STEPS.map((s) => (
          <Badge
            key={s.id}
            variant={step === s.id ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setStep(s.id)}
          >
            {s.id}. {s.title}
          </Badge>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Loan details</CardTitle>
            <CardDescription>Basic loan information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Loan type</Label>
              <Select
                value={form.loanType}
                onValueChange={(v) => setForm((f) => ({ ...f, loanType: v as LoanType }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LOAN_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Loan amount (₹)</Label>
              <Input
                type="number"
                min={0}
                step={10000}
                value={form.loanAmount ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, loanAmount: e.target.value ? Number(e.target.value) : 0 }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Interest rate (% p.a.)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={form.interestRate ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, interestRate: e.target.value ? Number(e.target.value) : 0 }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Tenure</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={form.tenure ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, tenure: e.target.value ? Number(e.target.value) : 0 }))}
                    className="flex-1"
                  />
                  <Select
                    value={form.tenureUnit || "years"}
                    onValueChange={(v) => setForm((f) => ({ ...f, tenureUnit: v as TenureUnit }))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="years">Years</SelectItem>
                      <SelectItem value="months">Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Loan start date</Label>
              <Input
                type="date"
                value={form.loanStartDate || ""}
                onChange={(e) => setForm((f) => ({ ...f, loanStartDate: e.target.value }))}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleNext} disabled={!canProceedStep1()}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Tax & borrower details</CardTitle>
            <CardDescription>Tax regime and borrower-specific information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Borrower type</Label>
                <Select
                  value={form.borrowerType}
                  onValueChange={(v) => setForm((f) => ({ ...f, borrowerType: v as BorrowerType }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(BORROWER_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Tax regime</Label>
                <Select
                  value={form.taxRegime}
                  onValueChange={(v) => setForm((f) => ({ ...f, taxRegime: v as TaxRegime }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TAX_REGIME_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Housing loan specific */}
            {form.loanType === "housing_loan" && (
              <>
                <div className="grid gap-2">
                  <Label>Property type</Label>
                  <Select
                    value={form.propertyType || "self_occupied"}
                    onValueChange={(v) => setForm((f) => ({ ...f, propertyType: v as "self_occupied" | "let_out" }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="self_occupied">Self Occupied</SelectItem>
                      <SelectItem value="let_out">Let Out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.jointLoan || false}
                    onChange={(e) => setForm((f) => ({ ...f, jointLoan: e.target.checked }))}
                    className="rounded"
                  />
                  <Label>Joint loan</Label>
                </div>
                {form.jointLoan && (
                  <div className="grid gap-2">
                    <Label>Co-borrower share (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={form.coBorrowerShare ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, coBorrowerShare: e.target.value ? Number(e.target.value) : 0 }))}
                    />
                  </div>
                )}
              </>
            )}

            {/* Education loan specific */}
            {form.loanType === "education_loan" && (
              <div className="grid gap-2">
                <Label>Education loan start year</Label>
                <Input
                  type="number"
                  min={2000}
                  max={2100}
                  value={form.educationLoanStartYear ?? new Date().getFullYear()}
                  onChange={(e) => setForm((f) => ({ ...f, educationLoanStartYear: e.target.value ? Number(e.target.value) : undefined }))}
                />
                <p className="text-xs text-muted-foreground">Section 80E allows deduction for 8 consecutive years</p>
              </div>
            )}

            {/* Business loan specific */}
            {form.loanType === "business_loan" && (
              <div className="grid gap-2">
                <Label>Marginal tax slab (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.marginalTaxSlab ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, marginalTaxSlab: e.target.value ? Number(e.target.value) : undefined }))}
                />
                <p className="text-xs text-muted-foreground">Your marginal tax rate for accurate calculations</p>
              </div>
            )}

            {/* OD/CC specific */}
            {form.loanType === "overdraft_loan" && (
              <div className="grid gap-2">
                <Label>Average utilisation (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.averageUtilisation ?? 100}
                  onChange={(e) => setForm((f) => ({ ...f, averageUtilisation: e.target.value ? Number(e.target.value) : 100 }))}
                />
                <p className="text-xs text-muted-foreground">Average percentage of credit limit utilised</p>
              </div>
            )}

            {/* Vehicle loan specific */}
            {form.loanType === "vehicle_loan" && (
              <>
                <div className="grid gap-2">
                  <Label>Vehicle usage</Label>
                  <Select
                    value={form.vehicleUsage || "personal"}
                    onValueChange={(v) => setForm((f) => ({ ...f, vehicleUsage: v as "personal" | "business" }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.vehicleUsage === "business" && (
                  <div className="grid gap-2">
                    <Label>Vehicle cost (₹)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.vehicleCost ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, vehicleCost: e.target.value ? Number(e.target.value) : undefined }))}
                    />
                    <p className="text-xs text-muted-foreground">For depreciation calculation</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button variant="outline" onClick={handleBack}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button onClick={handleCalculate}>
              Calculate <Calculator className="h-4 w-4 ml-1" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 3 && result && (
        <div className="space-y-6">
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Loan summary
                {getTaxBadge()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">EMI</p>
                  <p className="font-medium text-lg">{formatCurrency(result.emiResult.emi)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total interest</p>
                  <p className="font-medium text-lg">{formatCurrency(result.emiResult.totalInterest)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tax saved</p>
                  <p className="font-medium text-lg text-green-600">
                    {formatCurrency(result.postTaxMetrics.totalTaxSaved)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Effective rate</p>
                  <p className="font-medium text-lg">
                    {result.postTaxMetrics.effectiveInterestRate.toFixed(2)}%
                  </p>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total payment</p>
                  <p className="font-medium">{formatCurrency(result.emiResult.totalPayment)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Lifetime cost (post-tax)</p>
                  <p className="font-medium">{formatCurrency(result.postTaxMetrics.lifetimeCost)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Savings</p>
                  <p className="font-medium text-green-600">
                    {formatCurrency(result.postTaxMetrics.preTaxLifetimeCost - result.postTaxMetrics.lifetimeCost)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tax Details */}
          {result.taxComputation.taxSaved && result.taxComputation.taxSaved > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  Tax benefits
                </CardTitle>
                <CardDescription>
                  {result.taxComputation.taxDeductionSection && (
                    <>Section: {result.taxComputation.taxDeductionSection}</>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  {result.taxComputation.deductibleInterest != null && (
                    <div>
                      <p className="text-muted-foreground">Deductible interest</p>
                      <p className="font-medium">{formatCurrency(result.taxComputation.deductibleInterest)}</p>
                    </div>
                  )}
                  {result.taxComputation.deductiblePrincipal != null && (
                    <div>
                      <p className="text-muted-foreground">Deductible principal</p>
                      <p className="font-medium">{formatCurrency(result.taxComputation.deductiblePrincipal)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Total tax saved</p>
                    <p className="font-medium text-green-600">
                      {formatCurrency(result.taxComputation.taxSaved || 0)}
                    </p>
                  </div>
                </div>
                {result.taxComputation.notes && result.taxComputation.notes.length > 0 && (
                  <div className="space-y-2">
                    {result.taxComputation.notes.map((note, i) => (
                      <Alert key={i}>
                        <Info className="h-4 w-4" />
                        <AlertDescription>{note}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  Important warnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.warnings.map((warning, i) => (
                    <Alert key={i} variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{warning}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Insights */}
          {result.insights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.insights.map((insight, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Info className="h-4 w-4 mt-0.5 text-blue-600" />
                      <span className="text-sm">{insight}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Yearly Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Yearly amortization schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>FY</TableHead>
                      <TableHead>Principal</TableHead>
                      <TableHead>Interest</TableHead>
                      <TableHead>Total EMI</TableHead>
                      <TableHead>Closing Balance</TableHead>
                      {result.yearlySchedule.some((y) => y.taxSaved) && (
                        <TableHead>Tax Saved</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.yearlySchedule.map((year) => (
                      <TableRow key={year.financialYear}>
                        <TableCell className="font-medium">{year.financialYear}</TableCell>
                        <TableCell>{formatCurrency(year.totalPrincipal)}</TableCell>
                        <TableCell>{formatCurrency(year.totalInterest)}</TableCell>
                        <TableCell>{formatCurrency(year.totalEMI)}</TableCell>
                        <TableCell>{formatCurrency(year.closingBalance)}</TableCell>
                        {year.taxSaved && (
                          <TableCell className="text-green-600">
                            {formatCurrency(year.taxSaved)}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={downloadSchedule} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download schedule
              </Button>
            </CardFooter>
          </Card>

          {/* Regime Comparison */}
          {result.regimeComparison && (
            <Card>
              <CardHeader>
                <CardTitle>Old vs New regime comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Old Regime</h4>
                    <div className="space-y-1 text-sm">
                      <p>Tax saved: {formatCurrency(result.regimeComparison.oldRegime.taxSaved)}</p>
                      <p>Effective rate: {result.regimeComparison.oldRegime.effectiveRate.toFixed(2)}%</p>
                      <p>Post-tax EMI: {formatCurrency(result.regimeComparison.oldRegime.postTaxEMI)}</p>
                    </div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">New Regime</h4>
                    <div className="space-y-1 text-sm">
                      <p>Tax saved: {formatCurrency(result.regimeComparison.newRegime.taxSaved)}</p>
                      <p>Effective rate: {result.regimeComparison.newRegime.effectiveRate.toFixed(2)}%</p>
                      <p>Post-tax EMI: {formatCurrency(result.regimeComparison.newRegime.postTaxEMI)}</p>
                    </div>
                  </div>
                </div>
                {result.regimeComparison.recommendation && (
                  <Alert className="mt-4">
                    <Info className="h-4 w-4" />
                    <AlertDescription>{result.regimeComparison.recommendation}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back to inputs
            </Button>
            <Button onClick={() => { setResult(null); setStep(1); }}>
              New calculation
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

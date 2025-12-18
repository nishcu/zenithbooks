
"use client";

import { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  PlusCircle,
  Trash2,
  FileDown,
  Download,
  Upload,
  BrainCircuit,
  Loader2,
  FileSpreadsheet,
  AlertTriangle,
  FileSignature,
  ArrowLeft,
  Printer,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getCmaObservationsAction } from "./actions";

// Import CMA components
import { OperatingStatement } from "@/components/cma/operating-statement";
import { BalanceSheetAnalysis } from "@/components/cma/balance-sheet-analysis";
import { CashFlowStatement } from "@/components/cma/cash-flow-statement";
import { RatioAnalysis } from "@/components/cma/ratio-analysis";
import { FundFlowStatement } from "@/components/cma/fund-flow-statement";
import { MpbfAssessment } from "@/components/cma/mpbf-assessment";
import { LoanRepaymentSchedule } from "@/components/cma/loan-repayment-schedule";

// Import calculation logic and mock data
import {
  getInitialFinancials,
  generateCma,
  type FinancialData,
  type LoanAssumptions,
  type FixedAsset,
} from "@/lib/cma-logic";

// Import export helpers
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { ShareButtons } from "@/components/documents/share-buttons";
import * as XLSX from 'xlsx';
import { format } from "date-fns";
import { getServicePricing, ServicePricing } from "@/lib/pricing-service";
import { applyExcelFormatting } from "@/lib/export-utils";
import { CashfreeCheckout } from "@/components/payment/cashfree-checkout";
import { useCertificationRequest } from "@/hooks/use-certification-request";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { getUserSubscriptionInfo, getEffectiveServicePrice } from "@/lib/service-pricing-utils";

const initialAssets: FixedAsset[] = [
  { id: 1, name: "Plant & Machinery", cost: 1000000, depreciationRate: 15, additionYear: 0 },
  { id: 2, name: "Office Equipment", cost: 250000, depreciationRate: 20, additionYear: 0 },
];

export default function CmaReportGeneratorPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("inputs");
  const [numProjectedYears, setNumProjectedYears] = useState(5);
  const [revenueGrowth, setRevenueGrowth] = useState<number[]>([15, 18, 20, 22, 25]);
  const [expenseChange, setExpenseChange] = useState<number[]>([10, 12, 14, 15, 18]);
  const [pricing, setPricing] = useState<ServicePricing | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [auditedFinancials, setAuditedFinancials] = useState<FinancialData | null>(null);
  const [auditedFileName, setAuditedFileName] = useState<string | null>(null);

  const [loanAssumptions, setLoanAssumptions] = useState<LoanAssumptions>({
    type: "term-loan",
    amount: 5000000,
    interestRate: 11,
    repaymentYears: 5,
  });

  const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>(initialAssets);
  const [generatedReport, setGeneratedReport] = useState<any | null>(null);
  const [aiObservations, setAiObservations] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [user] = useAuthState(auth);
  const [userSubscriptionInfo, setUserSubscriptionInfo] = useState<{ userType: "business" | "professional" | null; subscriptionPlan: "freemium" | "business" | "professional" | null } | null>(null);

  const { handlePaymentSuccess } = useCertificationRequest({
    pricing,
    serviceId: 'cma_report'
  });

  // Fetch user subscription info
  useEffect(() => {
    if (user) {
      getUserSubscriptionInfo(user.uid).then(setUserSubscriptionInfo);
    }
  }, [user]);

  const reportPrintRef = useRef(null);

  useEffect(() => {
    getServicePricing().then(setPricing);
  }, []);

  // Resume paid flow after Cashfree redirect:
  // /payment/success will set `on_demand_unlock` with type=cma_report
  useEffect(() => {
    try {
      const raw = localStorage.getItem("on_demand_unlock");
      if (!raw) return;
      const unlock = JSON.parse(raw);
      if (unlock?.type !== "cma_report") return;

      const p = unlock?.payload || {};
      // Restore inputs (best-effort)
      if (typeof p.numProjectedYears === "number") setNumProjectedYears(p.numProjectedYears);
      if (Array.isArray(p.revenueGrowth)) setRevenueGrowth(p.revenueGrowth);
      if (Array.isArray(p.expenseChange)) setExpenseChange(p.expenseChange);
      if (p.loanAssumptions) setLoanAssumptions(p.loanAssumptions);
      if (Array.isArray(p.fixedAssets)) setFixedAssets(p.fixedAssets);
      if (p.auditedFinancials) setAuditedFinancials(p.auditedFinancials);
      if (typeof p.auditedFileName === "string") setAuditedFileName(p.auditedFileName);

      // Auto-generate and show report
      setTimeout(() => {
        handleGenerateReport();
      }, 50);

      localStorage.removeItem("on_demand_unlock");
    } catch (e) {
      console.error("Failed to resume CMA post-payment flow:", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const handleGenerateReport = () => {
    setIsGenerating(true);
    const initialData = auditedFinancials || getInitialFinancials();
    const assumptions = {
      revenueGrowth,
      expenseChange,
    };
    const cmaData = generateCma(
      initialData,
      numProjectedYears,
      assumptions,
      loanAssumptions,
      fixedAssets
    );
    setGeneratedReport(cmaData);
    setActiveTab("report");
    setIsGenerating(false);
    toast({
        title: "CMA Report Generated",
        description: "Review the generated statements in the 'Generated CMA Report' tab."
    });
  };

  const CMA_TEMPLATE_MAP: Record<string, keyof FinancialData> = {
    // P&L
    "revenue from operations": "netSales",
    "net sales": "netSales",
    "other operating income": "otherOpIncome",
    "raw materials": "rawMaterials",
    "raw materials consumed": "rawMaterials",
    "direct wages": "directWages",
    "power & fuel": "powerFuel",
    "power and fuel": "powerFuel",
    "depreciation": "depreciation",
    "administrative salary": "adminSalary",
    "admin salary": "adminSalary",
    "rent": "rent",
    "selling expenses": "sellingExpenses",
    "other expenses": "otherExpenses",
    "interest": "interest",
    "tax": "tax",
    // Balance sheet
    "share capital": "shareCapital",
    "reserves & surplus": "reservesSurplus",
    "reserves and surplus": "reservesSurplus",
    "term loan": "termLoan",
    "unsecured loan": "unsecuredLoan",
    "sundry creditors": "sundryCreditors",
    "other liabilities": "otherLiabilities",
    "gross fixed assets": "grossFixedAssets",
    "accumulated depreciation": "accDepreciation",
    "acc depreciation": "accDepreciation",
    "investments": "investments",
    "inventory": "inventory",
    "sundry debtors": "sundryDebtors",
    "cash & bank": "cashBank",
    "cash and bank": "cashBank",
    "other current assets": "otherCurrentAssets",
  };

  const parseAuditedFinancialsFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    const reader = new FileReader();
    const data: ArrayBuffer | string = await new Promise((resolve, reject) => {
      reader.onerror = () => reject(new Error("Could not read file."));
      reader.onload = () => resolve(reader.result as any);
      if (ext === "csv") reader.readAsText(file);
      else reader.readAsArrayBuffer(file);
    });

    const workbook =
      ext === "csv"
        ? XLSX.read(data as string, { type: "string", raw: true })
        : XLSX.read(data as ArrayBuffer, { type: "array", raw: true });

    const sheet =
      workbook.Sheets["Audited Financials"] ||
      workbook.Sheets[workbook.SheetNames[0]];

    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

    // Expect columns: Particulars, Year 1, Year 2 (at minimum)
    const parsed: FinancialData = {};

    const toNumber = (v: any) => {
      if (v === null || v === undefined || v === "") return 0;
      if (typeof v === "number") return Number.isFinite(v) ? v : 0;
      const cleaned = String(v).replace(/[,₹]/g, "").trim();
      const n = Number(cleaned);
      return Number.isFinite(n) ? n : 0;
    };

    for (const row of rows) {
      const pRaw = row["Particulars"] ?? row["particulars"] ?? row["PARTICULARS"];
      const key = CMA_TEMPLATE_MAP[String(pRaw || "").toLowerCase().trim()];
      if (!key) continue;

      // Template convention: Year 1 = most recent audited year, Year 2 = previous year
      // Our engine expects [FY-2, FY-1] for historical years, so map to [Year2, Year1]
      const y1 = toNumber(row["Year 1"] ?? row["year 1"] ?? row["YEAR 1"]);
      const y2 = toNumber(row["Year 2"] ?? row["year 2"] ?? row["YEAR 2"]);

      parsed[key] = [y2, y1];
    }

    // Ensure all required keys exist (default 0 arrays)
    const requiredKeys: Array<keyof FinancialData> = [
      "netSales","otherOpIncome","rawMaterials","directWages","powerFuel","depreciation","adminSalary","rent","sellingExpenses","otherExpenses","interest","tax",
      "shareCapital","reservesSurplus","termLoan","unsecuredLoan","sundryCreditors","otherLiabilities","grossFixedAssets","accDepreciation","investments","inventory","sundryDebtors","cashBank","otherCurrentAssets"
    ];
    for (const k of requiredKeys) {
      if (!parsed[k]) parsed[k] = [0, 0];
    }

    setAuditedFinancials(parsed);
    setAuditedFileName(file.name);
    toast({
      title: "Audited financials loaded",
      description: `Parsed "${file.name}". You can now generate the CMA report using your uploaded data.`,
    });
  };

  const handleGetAiObservations = async () => {
      if (!generatedReport) {
          toast({ variant: 'destructive', title: 'Error', description: 'Please generate the report first.'});
          return;
      }
      setIsAiLoading(true);

      // Prepare a simplified summary for the AI
      const simplifiedReport = {
          operatingStatement: generatedReport.operatingStatement.body.map((row: any[]) => ({ particular: row[0], values: row.slice(1) })),
          ratios: generatedReport.ratioAnalysis.body.map((row: any[]) => ({ ratio: row[0], values: row.slice(1) })),
          headers: generatedReport.operatingStatement.headers,
          loanAmount: loanAssumptions.amount,
          loanType: loanAssumptions.type
      };

      try {
          const result = await getCmaObservationsAction({ reportSummary: JSON.stringify(simplifiedReport) });
          if(result?.observations) {
              setAiObservations(result.observations);
              setActiveTab('ai-observations');
          } else {
              toast({ variant: 'destructive', title: 'AI Analysis Failed', description: 'Could not retrieve AI observations.'});
          }
      } catch (error: any) {
          console.error("CMA Observations Error:", error);
          const errorMessage = error?.message || 'An error occurred while fetching AI observations.';
          toast({ variant: 'destructive', title: 'Error', description: errorMessage});
      } finally {
          setIsAiLoading(false);
      }
  };

  const handleAssetChange = (id: number, field: keyof FixedAsset, value: any) => {
    setFixedAssets(
      fixedAssets.map((asset) =>
        asset.id === id ? { ...asset, [field]: value } : asset
      )
    );
  };
  const handleAddAsset = () => {
    const newId = (fixedAssets.at(-1)?.id || 0) + 1;
    setFixedAssets([
      ...fixedAssets,
      { id: newId, name: "", cost: 0, depreciationRate: 15, additionYear: 1 },
    ]);
  };
  const handleRemoveAsset = (id: number) => {
    setFixedAssets(fixedAssets.filter((asset) => asset.id !== id));
  };
  
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "Particulars": "Revenue from Operations",
        "Year 1": 10000000,
        "Year 2": 12000000,
        "Year 3": 14000000
      },
      {
        "Particulars": "Cost of Goods Sold",
        "Year 1": 6000000,
        "Year 2": 7200000,
        "Year 3": 8400000
      },
      {
        "Particulars": "Gross Profit",
        "Year 1": 4000000,
        "Year 2": 4800000,
        "Year 3": 5600000
      },
      {
        "Particulars": "Operating Expenses",
        "Year 1": 2000000,
        "Year 2": 2400000,
        "Year 3": 2800000
      },
      {
        "Particulars": "EBITDA",
        "Year 1": 2000000,
        "Year 2": 2400000,
        "Year 3": 2800000
      },
      {
        "Particulars": "Depreciation",
        "Year 1": 500000,
        "Year 2": 600000,
        "Year 3": 700000
      },
      {
        "Particulars": "EBIT",
        "Year 1": 1500000,
        "Year 2": 1800000,
        "Year 3": 2100000
      },
      {
        "Particulars": "Interest",
        "Year 1": 300000,
        "Year 2": 350000,
        "Year 3": 400000
      },
      {
        "Particulars": "Profit Before Tax",
        "Year 1": 1200000,
        "Year 2": 1450000,
        "Year 3": 1700000
      },
      {
        "Particulars": "Tax",
        "Year 1": 360000,
        "Year 2": 435000,
        "Year 3": 510000
      },
      {
        "Particulars": "Net Profit",
        "Year 1": 840000,
        "Year 2": 1015000,
        "Year 3": 1190000
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // Apply formatting
    const headers = Object.keys(templateData[0] || {});
    const rows = templateData.map(row => headers.map(h => row[h as keyof typeof row]));
    applyExcelFormatting(ws, headers, rows);
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Audited Financials");
    
    // Add instructions sheet
    const instructions = [
      { Column: "Particulars", Description: "Financial statement line items (Revenue, Expenses, etc.)" },
      { Column: "Year 1", Description: "Financial data for Year 1 (most recent audited year)" },
      { Column: "Year 2", Description: "Financial data for Year 2 (previous year)" },
      { Column: "Year 3", Description: "Financial data for Year 3 (year before that)" },
      { Note: "", Description: "Replace sample data with your actual audited financial figures" }
    ];
    const wsInstructions = XLSX.utils.json_to_sheet(instructions);
    XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");
    
    XLSX.writeFile(wb, `CMA_Audited_Financials_Template_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast({ 
      title: "Template Downloaded", 
      description: "Audited financials template has been downloaded. Fill in your actual data and upload."
    });
  }

  const handleCertificationRequest = () => {
      toast({
          title: "Certification Request Sent",
          description: "A request has been sent to the Admin for certification. You can track its status in the Admin panel."
      });
  }

  const handleExportToExcel = () => {
    if (!generatedReport) return;
    const wb = XLSX.utils.book_new();
    const processSheet = (data: any[], sheetName: string) => {
        const ws = XLSX.utils.aoa_to_sheet(data);
        // Apply formatting for print-ready output
        if (data.length > 0) {
            const headers = data[0];
            const rows = data.slice(1);
            applyExcelFormatting(ws, headers, rows);
        }
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }
    
    processSheet([generatedReport.operatingStatement.headers, ...generatedReport.operatingStatement.body], "Operating Statement");
    processSheet([generatedReport.balanceSheet.headers, ...generatedReport.balanceSheet.body], "Balance Sheet");
    processSheet([generatedReport.cashFlow.headers, ...generatedReport.cashFlow.body], "Cash Flow");
    processSheet([generatedReport.ratioAnalysis.headers, ...generatedReport.ratioAnalysis.body], "Ratio Analysis");
    processSheet([generatedReport.fundFlow.headers, ...generatedReport.fundFlow.body], "Fund Flow");
    processSheet([generatedReport.mpbf.headers, ...generatedReport.mpbf.body], "MPBF");
    if(generatedReport.repaymentSchedule.body.length > 0) {
        processSheet([generatedReport.repaymentSchedule.headers, ...generatedReport.repaymentSchedule.body], "Repayment Schedule");
    }

    XLSX.writeFile(wb, `CMA_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  }

  const baseCmaReportPrice = pricing?.reports.find(r => r.id === 'cma_report')?.price || 0;
  const cmaReportPrice = userSubscriptionInfo
    ? getEffectiveServicePrice(
        baseCmaReportPrice,
        userSubscriptionInfo.userType,
        userSubscriptionInfo.subscriptionPlan,
        "reports"
      )
    : baseCmaReportPrice;

  return (
    <div className="space-y-8">
      <Link href="/reports" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Reports
      </Link>
      <div className="text-center">
        <h1 className="text-3xl font-bold">CMA Report Generator</h1>
        <p className="mt-2 max-w-4xl mx-auto text-muted-foreground">
          Create a detailed Credit Monitoring Arrangement (CMA) report for
          business loan applications. Provide historical data and future
          assumptions to generate projected financial statements.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-3xl mx-auto">
          <TabsTrigger value="inputs">1. Inputs & Assumptions</TabsTrigger>
          <TabsTrigger value="report" disabled={!generatedReport}>
            2. Generated CMA Report
          </TabsTrigger>
          <TabsTrigger value="ai-observations" disabled={!generatedReport}>
            3. AI Observations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inputs" className="mt-6">
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Historical & Projected Years</CardTitle>
                <CardDescription>
                  Select the number of past and future years to include in the
                  report.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div className="space-y-2">
                    <Label>Number of Past Audited Years: 2 (fixed)</Label>
                    <p className="text-sm text-muted-foreground">
                      Using 2 years of mock historical data as the base for
                      projections.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Number of Projected Years: {numProjectedYears}
                    </Label>
                    <Slider
                      min={1}
                      max={7}
                      step={1}
                      value={[numProjectedYears]}
                      onValueChange={(val) => setNumProjectedYears(val[0])}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Inputs</CardTitle>
                <CardDescription>
                  Provide financials for the historical years.
                </CardDescription>
              </CardHeader>
              <CardContent>
                 <Alert variant="default" className="mb-4">
                     <FileSpreadsheet className="h-4 w-4" />
                     <AlertTitle>{auditedFinancials ? "Using Uploaded Data" : "No Audited File Uploaded Yet"}</AlertTitle>
                     <AlertDescription>
                       {auditedFinancials
                         ? `Using your uploaded file: ${auditedFileName || "Audited Financials"} (2 historical years).`
                         : "Upload audited financials (Excel/CSV) using the template. If you skip upload, the report will use sample data."}
                     </AlertDescription>
                 </Alert>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" disabled>
                    Use Existing Data (from App)
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        await parseAuditedFinancialsFile(file);
                      } catch (err: any) {
                        console.error(err);
                        toast({
                          variant: "destructive",
                          title: "Upload failed",
                          description: err?.message || "Could not parse the uploaded file.",
                        });
                      } finally {
                        e.currentTarget.value = "";
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-2" /> Upload Audited Financials
                  </Button>
                  <Button variant="outline" onClick={handleDownloadTemplate}>
                    <Download className="mr-2" /> Download Template
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Assumptions for Projections</CardTitle>
                    <CardDescription>Define growth drivers for the projected years.</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Assumption</TableHead>
                                {Array.from({ length: numProjectedYears }).map((_, i) => (
                                    <TableHead key={i} className="text-right">Year {i+1}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-medium">Revenue Growth (%)</TableCell>
                                {Array.from({ length: numProjectedYears }).map((_, i) => (
                                    <TableCell key={i}>
                                        <Input type="number" className="text-right" value={revenueGrowth[i] || ""} onChange={(e) => { const newGrowth = [...revenueGrowth]; newGrowth[i] = parseFloat(e.target.value); setRevenueGrowth(newGrowth); }} />
                                    </TableCell>
                                ))}
                            </TableRow>
                             <TableRow>
                                <TableCell className="font-medium">Expense Change (%)</TableCell>
                                {Array.from({ length: numProjectedYears }).map((_, i) => (
                                    <TableCell key={i}>
                                        <Input type="number" className="text-right" value={expenseChange[i] || ""} onChange={(e) => { const newChange = [...expenseChange]; newChange[i] = parseFloat(e.target.value); setExpenseChange(newChange); }} />
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            
            <Card>
                 <CardHeader>
                    <CardTitle>Loan & Financing Assumptions</CardTitle>
                    <CardDescription>Define the parameters of the loan you are seeking.</CardDescription>
                </CardHeader>
                 <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                        <Label>Loan Type</Label>
                        <Select value={loanAssumptions.type} onValueChange={type => setLoanAssumptions(prev => ({...prev, type: type as 'term-loan' | 'od'}))}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="term-loan">Term Loan</SelectItem>
                                <SelectItem value="od">Overdraft (OD)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label>Loan Requirement (₹)</Label>
                        <Input type="number" value={loanAssumptions.amount} onChange={e => setLoanAssumptions(prev => ({...prev, amount: parseFloat(e.target.value)}))} />
                    </div>
                     <div className="space-y-2">
                        <Label>Rate of Interest (% p.a.)</Label>
                        <Input type="number" value={loanAssumptions.interestRate} onChange={e => setLoanAssumptions(prev => ({...prev, interestRate: parseFloat(e.target.value)}))} />
                    </div>
                    {loanAssumptions.type === 'term-loan' && (
                         <div className="space-y-2">
                            <Label>Repayment Period (Years)</Label>
                            <Input type="number" value={loanAssumptions.repaymentYears} onChange={e => setLoanAssumptions(prev => ({...prev, repaymentYears: parseInt(e.target.value)}))} />
                        </div>
                    )}
                 </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Fixed Assets & Depreciation</CardTitle>
                    <CardDescription>Manage fixed assets and their depreciation schedule.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                         <TableHeader>
                            <TableRow>
                                <TableHead className="w-1/3">Asset Name</TableHead>
                                <TableHead className="text-right">Cost (₹)</TableHead>
                                <TableHead className="text-right">Depreciation Rate (%)</TableHead>
                                <TableHead>Addition in Year</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fixedAssets.map(asset => (
                                <TableRow key={asset.id}>
                                    <TableCell><Input value={asset.name} onChange={e => handleAssetChange(asset.id, 'name', e.target.value)}/></TableCell>
                                    <TableCell><Input type="number" className="text-right" value={asset.cost} onChange={e => handleAssetChange(asset.id, 'cost', parseFloat(e.target.value))}/></TableCell>
                                    <TableCell><Input type="number" className="text-right" value={asset.depreciationRate} onChange={e => handleAssetChange(asset.id, 'depreciationRate', parseFloat(e.target.value))}/></TableCell>
                                    <TableCell>
                                        <Select value={String(asset.additionYear)} onValueChange={v => handleAssetChange(asset.id, 'additionYear', parseInt(v))}>
                                            <SelectTrigger><SelectValue/></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="0">Existing</SelectItem>
                                                {Array.from({length: numProjectedYears}).map((_, i) => <SelectItem key={i+1} value={String(i+1)}>Year {i+1}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => handleRemoveAsset(asset.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                     <Button variant="outline" size="sm" className="mt-4" onClick={handleAddAsset}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Add Asset
                    </Button>
                </CardContent>
                 <CardFooter className="flex justify-center">
                    {cmaReportPrice && cmaReportPrice > 0 ? (
                        <CashfreeCheckout
                            amount={cmaReportPrice}
                            planId="cma_report_generation"
                            planName="CMA Report Generation"
                            userId={user?.uid || ''}
                            userEmail={user?.email || ''}
                            userName={user?.displayName || ''}
                            postPaymentContext={{
                              key: "pending_on_demand_action",
                              payload: {
                                type: "cma_report",
                                returnTo: "/reports/cma-report",
                                payload: {
                                  numProjectedYears,
                                  revenueGrowth,
                                  expenseChange,
                                  loanAssumptions,
                                  fixedAssets,
                                  auditedFinancials,
                                  auditedFileName,
                                },
                              },
                            }}
                            onSuccess={(paymentId) => {
                                handlePaymentSuccess(paymentId, {
                                    reportType: "CMA Report",
                                    clientName: "CMA Report Generation",
                                    formData: {
                                        numProjectedYears,
                                        revenueGrowth,
                                        expenseChange,
                                        loanAssumptions,
                                        fixedAssets
                                    },
                                });
                                // After successful payment, generate the report
                                handleGenerateReport();
                            }}
                            onFailure={() => {
                                toast({
                                    variant: "destructive",
                                    title: "Payment Failed",
                                    description: "Payment was not completed. Please try again."
                                });
                            }}
                        />
                    ) : (
                        <Button size="lg" onClick={handleGenerateReport} disabled={isGenerating}>
                            {isGenerating ? <Loader2 className="mr-2 animate-spin" /> : null}
                            Generate Report
                        </Button>
                    )}
                </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="report" className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Generated CMA Report</CardTitle>
                    <CardDescription>Review the projected financial statements. You can export the full report below.</CardDescription>
                </CardHeader>
                <CardContent ref={reportPrintRef}>
                    {generatedReport && (
                        <Accordion type="multiple" defaultValue={["operating-statement", "balance-sheet-analysis"]} className="w-full">
                           <AccordionItem value="operating-statement">
                               <AccordionTrigger>Operating Statement</AccordionTrigger>
                               <AccordionContent>
                                   <OperatingStatement report={generatedReport}/>
                               </AccordionContent>
                           </AccordionItem>
                           <AccordionItem value="balance-sheet-analysis">
                               <AccordionTrigger>Analysis of Balance Sheet</AccordionTrigger>
                               <AccordionContent>
                                   <BalanceSheetAnalysis report={generatedReport}/>
                               </AccordionContent>
                           </AccordionItem>
                           <AccordionItem value="cash-flow-statement">
                               <AccordionTrigger>Cash Flow Statement</AccordionTrigger>
                               <AccordionContent>
                                   <CashFlowStatement report={generatedReport}/>
                               </AccordionContent>
                           </AccordionItem>
                           <AccordionItem value="ratio-analysis">
                               <AccordionTrigger>Ratio Analysis</AccordionTrigger>
                               <AccordionContent>
                                   <RatioAnalysis report={generatedReport}/>
                               </AccordionContent>
                           </AccordionItem>
                           <AccordionItem value="fund-flow-statement">
                               <AccordionTrigger>Fund Flow Statement</AccordionTrigger>
                               <AccordionContent>
                                   <FundFlowStatement report={generatedReport}/>
                               </AccordionContent>
                           </AccordionItem>
                           <AccordionItem value="mpbf-assessment">
                               <AccordionTrigger>MPBF Assessment</AccordionTrigger>
                               <AccordionContent>
                                   <MpbfAssessment report={generatedReport}/>
                               </AccordionContent>
                           </AccordionItem>
                           <AccordionItem value="repayment-schedule">
                               <AccordionTrigger>Loan Repayment Schedule</AccordionTrigger>
                               <AccordionContent>
                                   <LoanRepaymentSchedule report={generatedReport}/>
                               </AccordionContent>
                           </AccordionItem>
                        </Accordion>
                    )}
                </CardContent>
                 <CardFooter className="flex justify-between flex-wrap gap-4">
                    <Button variant="secondary" onClick={() => setActiveTab('inputs')}>Back to Inputs</Button>
                    <div className="flex gap-2 flex-wrap justify-end">
                        <Button variant="default" onClick={handleGetAiObservations} disabled={isAiLoading}>
                           {isAiLoading ? <Loader2 className="mr-2 animate-spin"/> : <BrainCircuit className="mr-2" />}
                           Get AI Observations
                        </Button>
                        <Button variant="outline" onClick={handleExportToExcel}><FileSpreadsheet className="mr-2"/> Export to Excel</Button>
                        <ShareButtons 
                            contentRef={reportPrintRef}
                            fileName="CMA_Report"
                        />
                    </div>
                </CardFooter>
            </Card>
            
            {generatedReport && (
                 <Card className="mt-8">
                    <CardHeader>
                        <CardTitle>Professional Certification</CardTitle>
                        <CardDescription>As a professional (e.g., a CA), you can request certification for this report.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            This action will send a request to the Admin for digital signature. The admin can then sign the document offline and upload the certified copy.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleCertificationRequest}>
                            <FileSignature className="mr-2"/>
                            Request Certification
                        </Button>
                    </CardFooter>
                </Card>
            )}
        </TabsContent>

         <TabsContent value="ai-observations" className="mt-6">
            <Card>
                 <CardHeader>
                    <CardTitle>AI Generated Observations</CardTitle>
                    <CardDescription>Qualitative commentary on the financial projections, as a banker would see it. You can edit this text before including it in your final report.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Textarea 
                        value={aiObservations || "Click 'Get AI Observations' to generate commentary..."}
                        onChange={(e) => setAiObservations(e.target.value)}
                        className="min-h-[400px] font-mono text-sm"
                        disabled={isAiLoading}
                    />
                </CardContent>
                 <CardFooter className="flex justify-between">
                    <Button variant="secondary" onClick={() => setActiveTab('report')}>Back to Report</Button>
                     <div className="flex gap-2">
                        <Button variant="outline" onClick={handleExportToExcel}><FileSpreadsheet className="mr-2"/> Export to Excel</Button>
                         <ShareButtons 
                            contentRef={reportPrintRef}
                            fileName="CMA_Report"
                        />
                    </div>
                </CardFooter>
            </Card>
         </TabsContent>
      </Tabs>
    </div>
  );
}

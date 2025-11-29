
"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileDown, Library } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { tdsSections } from "@/lib/tds-rates";
import { ShareButtons } from "@/components/documents/share-buttons";
import { useRef } from "react";
import { useAccountingContext } from "@/context/accounting-context";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc } from "firebase/firestore";
import { useDocumentData } from "react-firebase-hooks/firestore";
import { UpgradeRequiredAlert } from "@/components/upgrade-required-alert";

type ReportRow = {
    deductee: string;
    pan: string;
    invoiceId: string;
    invoiceDate: string;
    invoiceAmount: number;
    tdsSection: string;
    tdsRate: number;
    tdsAmount: number;
};

// Generates a list of financial years, e.g., "2024-2025"
const getFinancialYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 5; i++) {
        const startYear = currentYear - i;
        years.push(`${startYear}-${startYear + 1}`);
    }
    return years;
};

const months = [
    { value: "04", label: "April" }, { value: "05", label: "May" }, { value: "06", label: "June" },
    { value: "07", label: "July" }, { value: "08", label: "August" }, { value: "09", label: "September" },
    { value: "10", label: "October" }, { value: "11", label: "November" }, { value: "12", label: "December" },
    { value: "01", label: "January" }, { value: "02", label: "February" }, { value: "03", label: "March" }
];

export default function TdsReturns() {
  const { toast } = useToast();
  const [user] = useAuthState(auth);
  const userDocRef = user ? doc(db, 'users', user.uid) : null;
  const [userData] = useDocumentData(userDocRef);
  const subscriptionPlan = userData?.subscriptionPlan || 'freemium';
  const isFreemium = subscriptionPlan === 'freemium';
  const reportRef = useRef<HTMLDivElement>(null);

  // Show upgrade alert for freemium users
  if (user && isFreemium) {
    return (
      <div className="space-y-8 p-8">
        <h1 className="text-3xl font-bold">TDS & TCS Returns</h1>
        <UpgradeRequiredAlert
          featureName="Income Tax Tools"
          description="File TDS/TCS returns, generate Form 16, and access advance tax calculations with a Business or Professional plan."
          backHref="/dashboard"
          backLabel="Back to Dashboard"
        />
      </div>
    );
  }
  const [reportType, setReportType] = useState("tds");
  const [period, setPeriod] = useState("monthly");
  const [financialYear, setFinancialYear] = useState(getFinancialYears()[0]);
  const [month, setMonth] = useState("04");
  const [quarter, setQuarter] = useState("q1");
  const [reportData, setReportData] = useState<ReportRow[]>([]);
  const [reportTitle, setReportTitle] = useState("");
  const [user] = useAuthState(auth);
  const { journalVouchers } = useAccountingContext();

  const financialYears = getFinancialYears();

  const generateReport = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in to generate reports."
      });
      return;
    }

    setReportData([]); // Clear previous data
    toast({
        title: "Generating Report...",
        description: "Analyzing journal entries for the selected period."
    });

    try {
      // Determine the date range for the report
      const startYear = parseInt(financialYear.split('-')[0]);
      const endYear = parseInt(financialYear.split('-')[1]);

      let startDate: Date;
      let endDate: Date;

      if (period === 'monthly') {
        const monthNum = parseInt(month);
        startDate = new Date(startYear, monthNum - 1, 1);
        endDate = new Date(startYear, monthNum, 0); // Last day of the month
      } else {
        // Quarterly
        const quarterNum = parseInt(quarter.replace('q', ''));
        const startMonth = (quarterNum - 1) * 3;
        startDate = new Date(startYear, startMonth, 1);
        endDate = new Date(startYear, startMonth + 3, 0); // Last day of the quarter
      }

      console.log('Date range:', startDate.toISOString(), 'to', endDate.toISOString());

      // Filter journal vouchers by date range
      const relevantVouchers = journalVouchers.filter(voucher => {
        const voucherDate = new Date(voucher.date);
        return voucherDate >= startDate && voucherDate <= endDate;
      });

      console.log('Relevant vouchers:', relevantVouchers.length);

      const generatedData: ReportRow[] = [];

      // Process each voucher for TDS/TCS transactions
      for (const voucher of relevantVouchers) {
        // Find TDS/TCS related lines
        const tdsLines = voucher.lines.filter(line =>
          reportType === "tds" ? line.account === "1460" && parseFloat(line.debit) > 0 :
          reportType === "tcs" ? line.account === "2423" && parseFloat(line.credit) > 0 : false
        );

        for (const tdsLine of tdsLines) {
          // Find the related expense/revenue line to get the transaction amount
          const relatedLines = voucher.lines.filter(line =>
            line.account !== tdsLine.account && (parseFloat(line.debit) > 0 || parseFloat(line.credit) > 0)
          );

          if (relatedLines.length > 0) {
            const relatedLine = relatedLines[0]; // Take the first related line
            const transactionAmount = reportType === "tds" ?
              parseFloat(relatedLine.debit || '0') :
              parseFloat(relatedLine.credit || '0');

            if (transactionAmount > 0) {
              // Get vendor/customer information if available
              let deducteeName = "Unknown";
              let deducteePAN = "PANNOTAVBL";

              if (voucher.vendorId) {
                // Query vendor information
                const vendorQuery = query(collection(db, "vendors"), where("__name__", "==", voucher.vendorId));
                const vendorSnapshot = await getDocs(vendorQuery);
                if (!vendorSnapshot.empty) {
                  const vendorData = vendorSnapshot.docs[0].data();
                  deducteeName = vendorData.name || "Unknown Vendor";
                  deducteePAN = vendorData.pan || "PANNOTAVBL";
                }
              } else if (voucher.customerId) {
                // Query customer information for TCS
                const customerQuery = query(collection(db, "parties"), where("__name__", "==", voucher.customerId));
                const customerSnapshot = await getDocs(customerQuery);
                if (!customerSnapshot.empty) {
                  const customerData = customerSnapshot.docs[0].data();
                  deducteeName = customerData.name || "Unknown Customer";
                  deducteePAN = customerData.pan || "PANNOTAVBL";
                }
              }

              // Determine TDS/TCS section based on transaction amount and type
              let tdsSection = reportType === "tds" ? "194J" : "206C"; // Default sections
              let tdsRate = reportType === "tds" ? 10.0 : 0.1; // Default rates

              // Calculate TDS/TCS amount
              const tdsAmount = parseFloat(tdsLine.debit || tdsLine.credit || '0');

              generatedData.push({
                deductee: deducteeName,
                pan: deducteePAN,
                invoiceId: `JV-${voucher.id}`,
                invoiceDate: voucher.date,
                invoiceAmount: transactionAmount,
                tdsSection: tdsSection,
                tdsRate: tdsRate,
                tdsAmount: tdsAmount,
              });
            }
          }
        }
      }

      let periodLabel = "";
      if (period === 'monthly') {
          const monthLabel = months.find(m => m.value === month)?.label;
          periodLabel = `${monthLabel} ${financialYear.split('-')[0]}`;
      } else {
          periodLabel = `${quarter.toUpperCase()}, ${financialYear}`;
      }

      setReportData(generatedData);
      setReportTitle(`${reportType.toUpperCase()} Report for ${periodLabel}`);

      console.log("Report generated with real data:", generatedData);

      toast({
          title: "Report Generated",
          description: `Found ${generatedData.length} ${reportType.toUpperCase()} transactions for ${periodLabel}.`
      });

    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        variant: "destructive",
        title: "Report Generation Failed",
        description: "An error occurred while generating the report. Please try again."
      });
    }
  };

  const monthLabel = months.find(m => m.value === month)?.label;
  const periodLabel = period === 'monthly' 
    ? `${monthLabel} ${financialYear.split('-')[0]}`
    : `${quarter.toUpperCase()}, ${financialYear}`;
  const reportFileName = `${reportType.toUpperCase()}-${periodLabel.replace(/\s+/g, '-')}`;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">TDS &amp; TCS Returns</h1>
          <p className="text-muted-foreground">
            Generate reports for TDS deducted on payments and TCS collected on sales.
          </p>
        </div>
        {reportData.length > 0 && (
          <ShareButtons
            contentRef={reportRef}
            fileName={reportFileName}
            whatsappMessage={`Check out my ${reportType.toUpperCase()} report from ZenithBooks`}
            emailSubject={`${reportType.toUpperCase()} Report`}
            emailBody={`Please find attached the ${reportType.toUpperCase()} report for ${periodLabel}.`}
            shareTitle={`${reportType.toUpperCase()} Report`}
          />
        )}
      </div>

      <div ref={reportRef}>
      <Card>
        <CardHeader>
          <CardTitle>Report Generation</CardTitle>
          <CardDescription>Select the report parameters to generate your report.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Financial Year</label>
            <Select value={financialYear} onValueChange={setFinancialYear}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {financialYears.map(fy => <SelectItem key={fy} value={fy}>{fy}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Report Type</label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tds">TDS Report</SelectItem>
                <SelectItem value="tcs">TCS Report</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Period</label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {period === 'monthly' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Month</label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                    {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {period === 'quarterly' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Quarter</label>
              <Select value={quarter} onValueChange={setQuarter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="q1">Q1 (Apr-Jun)</SelectItem>
                  <SelectItem value="q2">Q2 (Jul-Sep)</SelectItem>
                  <SelectItem value="q3">Q3 (Oct-Dec)</SelectItem>
                  <SelectItem value="q4">Q4 (Jan-Mar)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={generateReport}>Generate Report</Button>
        </CardFooter>
      </Card>
      
       <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{reportTitle || "Generated Report"}</CardTitle>
            <CardDescription>A summary of tax deducted/collected for the selected period will appear here.</CardDescription>
          </div>
          <Button variant="outline" disabled={reportData.length === 0}>
            <FileDown className="mr-2" />
            Export Report
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deductee/Collectee</TableHead>
                <TableHead>PAN</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Invoice Date</TableHead>
                <TableHead className="text-right">Invoice Amount</TableHead>
                <TableHead>TDS/TCS Section</TableHead>
                <TableHead className="text-right">Rate (%)</TableHead>
                <TableHead className="text-right">Tax Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {reportData.length > 0 ? (
                    reportData.map((row, index) => (
                        <TableRow key={index}>
                        <TableCell className="font-medium">{row.deductee}</TableCell>
                        <TableCell>{row.pan}</TableCell>
                        <TableCell>{row.invoiceId}</TableCell>
                        <TableCell>{row.invoiceDate}</TableCell>
                        <TableCell className="text-right">₹{row.invoiceAmount.toFixed(2)}</TableCell>
                        <TableCell>{row.tdsSection}</TableCell>
                        <TableCell className="text-right">{row.tdsRate}%</TableCell>
                        <TableCell className="text-right">₹{row.tdsAmount.toFixed(2)}</TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                            No report data. Please generate a report to see the results.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Library /> TDS/TCS Rate Chart</CardTitle>
          <CardDescription>A quick reference for common TDS and TCS sections and their rates.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Section</TableHead>
                        <TableHead>Nature of Payment/Collection</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Rate (%)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {tdsSections.map(section => (
                        <TableRow key={section.section + section.description}>
                            <TableCell className="font-mono">{section.section}</TableCell>
                            <TableCell>{section.description}</TableCell>
                            <TableCell>
                                <span className={`font-semibold ${section.isTCS ? 'text-blue-600' : 'text-orange-600'}`}>
                                    {section.isTCS ? 'TCS' : 'TDS'}
                                </span>
                            </TableCell>
                            <TableCell className="text-right font-mono">{section.rate > 0 ? `${section.rate}%` : "Slab Rates"}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
        <CardFooter>
            <p className="text-xs text-muted-foreground">Disclaimer: This chart is for informational purposes only. Please consult the Income Tax Act for the latest rates, thresholds, and conditions.</p>
        </CardFooter>
      </Card>
      </div>

    </div>
  );
}

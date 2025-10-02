
"use client";

import { useState, useMemo, useContext } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AccountingContext } from "@/context/accounting-context";
import { allAccounts } from "@/lib/accounts";
import * as XLSX from 'xlsx';
import { format } from "date-fns";


// Generates a list of financial years, e.g., "2024-2025"
const getFinancialYears = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    // If we are in Jan-Mar, the current FY started last year.
    const startYear = currentMonth < 3 ? currentYear - 1 : currentYear;
    const years = [];
    for (let i = 0; i < 5; i++) {
        years.push(`${startYear - i}-${(startYear - i + 1).toString().slice(-2)}`);
    }
    return years;
};

type BudgetEntry = {
    accountCode: string;
    accountName: string;
    budgetAmount: number;
};

export default function BudgetsPage() {
    const { toast } = useToast();
    const [financialYear, setFinancialYear] = useState(getFinancialYears()[0]);
    const { loading } = useContext(AccountingContext)!;

    const budgetableAccounts = useMemo(() => {
        return allAccounts.filter(acc => acc.type === "Revenue" || acc.type === "Expense");
    }, []);
    
    const [budgetData, setBudgetData] = useState<BudgetEntry[]>(() => 
        budgetableAccounts.map(acc => ({
            accountCode: acc.code,
            accountName: acc.name,
            budgetAmount: 0,
        }))
    );

    const handleBudgetChange = (accountCode: string, value: string) => {
        const amount = parseFloat(value) || 0;
        setBudgetData(prevData =>
            prevData.map(entry =>
                entry.accountCode === accountCode ? { ...entry, budgetAmount: amount } : entry
            )
        );
    };

    const handleSaveBudget = () => {
        console.log("Saving budget for FY:", financialYear, budgetData);
        toast({
            title: "Budget Saved!",
            description: `Your budget for the financial year ${financialYear} has been saved.`,
        });
    };

    const handleExportBudget = () => {
        if (budgetData.length === 0) {
            toast({ variant: "destructive", title: "No data to export" });
            return;
        }

        const dataToExport = budgetData.map(item => ({
            "Account Code": item.accountCode,
            "Account Name": item.accountName,
            "Budget Amount (₹)": item.budgetAmount,
        }));
        
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `Budget_${financialYear}`);

        // Set column widths
        worksheet['!cols'] = [
            { wch: 15 }, // Account Code
            { wch: 40 }, // Account Name
            { wch: 20 }, // Budget Amount
        ];
        
        XLSX.writeFile(workbook, `Budget_${financialYear}.xlsx`);
        toast({ title: "Export Successful", description: `Budget for ${financialYear} has been exported to Excel.` });
    };
    
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                <h1 className="text-3xl font-bold">Budgets & Scenarios</h1>
                <p className="text-muted-foreground">
                    Set financial budgets for income and expense accounts.
                </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleExportBudget}><FileSpreadsheet className="mr-2"/>Export Budget</Button>
                    <Button onClick={handleSaveBudget}><Save className="mr-2"/>Save Budget</Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Budget Creation</CardTitle>
                    <CardDescription>
                        Define your budget for the selected financial year. Enter the total amount for the full year.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="max-w-xs">
                        <Label>Financial Year</Label>
                         <Select value={financialYear} onValueChange={setFinancialYear}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{getFinancialYears().map(fy => <SelectItem key={fy} value={fy}>{fy}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                     <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50%]">Account</TableHead>
                                    <TableHead className="text-right">Budget Amount (₹)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={2} className="h-24 text-center">Loading accounts...</TableCell></TableRow>
                                ) : (
                                    budgetData.map(entry => (
                                        <TableRow key={entry.accountCode}>
                                            <TableCell>
                                                <div className="font-medium">{entry.accountName}</div>
                                                <div className="text-xs text-muted-foreground">{entry.accountCode}</div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Input
                                                    type="number"
                                                    className="w-48 ml-auto text-right"
                                                    placeholder="0.00"
                                                    value={entry.budgetAmount || ''}
                                                    onChange={(e) => handleBudgetChange(entry.accountCode, e.target.value)}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                     </div>
                </CardContent>
            </Card>
        </div>
    )
}

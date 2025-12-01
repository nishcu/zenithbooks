
import * as XLSX from 'xlsx';
import { format } from "date-fns";

// Mock company data - in a real app, this would come from a context or settings
const companyBranding = {
    name: "GSTEase Solutions Pvt. Ltd.",
    address: "123 Business Avenue, Commerce City, Maharashtra - 400001",
    gstin: "27ABCDE1234F1Z5",
};

export const exportToExcel = (reportData: any) => {
    const wb = XLSX.utils.book_new();

    const processSheet = (data: any[], sheetName: string) => {
        const ws = XLSX.utils.aoa_to_sheet(data);

        // Auto-fit column widths
        const colWidths = data[0].map((_: any, i: number) => {
            let maxWidth = 0;
            data.forEach((row: any[]) => {
                const cellValue = row[i] ? String(row[i]) : "";
                if (cellValue.length > maxWidth) {
                    maxWidth = cellValue.length;
                }
            });
            return { wch: maxWidth + 2 }; // +2 for a little padding
        });
        ws['!cols'] = colWidths;
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }
    
    processSheet([reportData.operatingStatement.headers, ...reportData.operatingStatement.body], "Operating Statement");
    processSheet([reportData.balanceSheet.headers, ...reportData.balanceSheet.body], "Balance Sheet");
    processSheet([reportData.cashFlow.headers, ...reportData.cashFlow.body], "Cash Flow");
    processSheet([reportData.ratioAnalysis.headers, ...reportData.ratioAnalysis.body], "Ratio Analysis");
    processSheet([reportData.fundFlow.headers, ...reportData.fundFlow.body], "Fund Flow");
    processSheet([reportData.mpbf.headers, ...reportData.mpbf.body], "MPBF");
    if(reportData.repaymentSchedule.body.length > 0) {
        processSheet([reportData.repaymentSchedule.headers, ...reportData.repaymentSchedule.body], "Repayment Schedule");
    }

    XLSX.writeFile(wb, `CMA_Report_${companyBranding.name}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
};

"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, FileDown } from "lucide-react";
import React, { useRef } from "react";
import { exportToCSV, exportToExcel, exportToPDF, ExportData } from "@/lib/export-utils";
import { useToast } from "@/hooks/use-toast";

interface ExportButtonsProps {
  contentRef?: React.RefObject<HTMLDivElement>;
  tableRef?: React.RefObject<HTMLTableElement>;
  data?: ExportData | ExportData[];
  fileName: string;
  showPDF?: boolean;
  showCSV?: boolean;
  showExcel?: boolean;
}

export function ExportButtons({
  contentRef,
  tableRef,
  data,
  fileName,
  showPDF = true,
  showCSV = true,
  showExcel = true,
}: ExportButtonsProps) {
  const { toast } = useToast();

  const handleExportPDF = async () => {
    if (!contentRef?.current) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No content available for PDF export.",
      });
      return;
    }

    try {
      await exportToPDF(contentRef.current, { fileName });
      toast({
        title: "PDF Exported",
        description: "Your document has been exported successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Failed to export PDF. Please try again.",
      });
    }
  };

  const handleExportCSV = () => {
    if (data && !Array.isArray(data)) {
      exportToCSV(data, { fileName });
      toast({
        title: "CSV Exported",
        description: "Your data has been exported successfully.",
      });
    } else if (tableRef?.current) {
      // Extract data from table
      const headers: string[] = [];
      const rows: (string | number)[][] = [];

      const headerRow = tableRef.current.querySelector("thead tr");
      if (headerRow) {
        headerRow.querySelectorAll("th, td").forEach((cell) => {
          headers.push(cell.textContent?.trim() || "");
        });
      }

      tableRef.current.querySelectorAll("tbody tr").forEach((row) => {
        const rowData: (string | number)[] = [];
        row.querySelectorAll("td").forEach((cell) => {
          const text = cell.textContent?.trim() || "";
          const num = parseFloat(text.replace(/[₹,]/g, ""));
          rowData.push(isNaN(num) ? text : num);
        });
        if (rowData.length > 0) {
          rows.push(rowData);
        }
      });

      exportToCSV({ headers, rows }, { fileName });
      toast({
        title: "CSV Exported",
        description: "Your data has been exported successfully.",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No data available for CSV export.",
      });
    }
  };

  const handleExportExcel = () => {
    if (data) {
      exportToExcel(data, { fileName });
      toast({
        title: "Excel Exported",
        description: "Your data has been exported successfully.",
      });
    } else if (tableRef?.current) {
      // Extract data from table
      const headers: string[] = [];
      const rows: (string | number)[][] = [];

      const headerRow = tableRef.current.querySelector("thead tr");
      if (headerRow) {
        headerRow.querySelectorAll("th, td").forEach((cell) => {
          headers.push(cell.textContent?.trim() || "");
        });
      }

      tableRef.current.querySelectorAll("tbody tr").forEach((row) => {
        const rowData: (string | number)[] = [];
        row.querySelectorAll("td").forEach((cell) => {
          const text = cell.textContent?.trim() || "";
          const num = parseFloat(text.replace(/[₹,]/g, ""));
          rowData.push(isNaN(num) ? text : num);
        });
        if (rowData.length > 0) {
          rows.push(rowData);
        }
      });

      exportToExcel({ headers, rows }, { fileName });
      toast({
        title: "Excel Exported",
        description: "Your data has been exported successfully.",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No data available for Excel export.",
      });
    }
  };

  const exportOptions = [
    showPDF && {
      label: "PDF",
      icon: FileText,
      onClick: handleExportPDF,
    },
    showCSV && {
      label: "CSV",
      icon: FileDown,
      onClick: handleExportCSV,
    },
    showExcel && {
      label: "Excel",
      icon: FileSpreadsheet,
      onClick: handleExportExcel,
    },
  ].filter(Boolean) as Array<{
    label: string;
    icon: React.ElementType;
    onClick: () => void;
  }>;

  if (exportOptions.length === 0) {
    return null;
  }

  if (exportOptions.length === 1) {
    const option = exportOptions[0];
    const Icon = option.icon;
    return (
      <Button variant="outline" onClick={option.onClick}>
        <Icon className="mr-2 h-4 w-4" />
        Export {option.label}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {exportOptions.map((option, index) => {
          const Icon = option.icon;
          return (
            <React.Fragment key={option.label}>
              {index > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem onClick={option.onClick}>
                <Icon className="mr-2 h-4 w-4" />
                {option.label}
              </DropdownMenuItem>
            </React.Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


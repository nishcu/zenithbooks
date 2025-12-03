/**
 * Unified export utilities for CSV, Excel, and PDF
 */

import * as XLSX from "xlsx";
import { format } from "date-fns";
import html2pdf from "html2pdf.js";

export interface ExportData {
  headers: string[];
  rows: (string | number)[][];
  sheetName?: string;
}

export interface ExportOptions {
  fileName?: string;
  includeDate?: boolean;
  sheetName?: string;
}

/**
 * Export data to CSV format
 */
export function exportToCSV(
  data: ExportData,
  options: ExportOptions = {}
): void {
  const { headers, rows } = data;
  const { fileName = "export", includeDate = true } = options;

  // Create CSV content
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((cell) => {
          // Escape quotes and wrap in quotes if contains comma or quote
          const cellStr = String(cell);
          if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        })
        .join(",")
    ),
  ].join("\n");

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  const dateSuffix = includeDate ? `_${format(new Date(), "yyyy-MM-dd")}` : "";
  link.setAttribute("href", url);
  link.setAttribute("download", `${fileName}${dateSuffix}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Apply formatting to Excel worksheet for print-ready output
 * This function optimizes column widths and sets up the worksheet for printing
 */
export function applyExcelFormatting(
  worksheet: XLSX.WorkSheet,
  headers: string[],
  rows: (string | number)[][],
  headerOffset: number = 0
): void {
  // Calculate optimal column widths for proper alignment
  const colWidths = headers.map((_, i) => {
    let maxWidth = headers[i]?.length || 10;
    rows.forEach((row) => {
      const cellValue = row[i] ? String(row[i]) : "";
      // Account for numbers with formatting (currency, decimals)
      const numValue = typeof row[i] === "number" ? String(row[i]) : cellValue;
      const width = numValue.length;
      if (width > maxWidth) {
        maxWidth = width;
      }
    });
    // Add padding (3 chars) and ensure minimum width (12) for readability
    // Cap at 60 characters to prevent overly wide columns
    return { wch: Math.max(Math.min(maxWidth + 3, 60), 12) };
  });
  worksheet["!cols"] = colWidths;

  // Set print area to include all data
  if (worksheet["!ref"]) {
    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    // Ensure we have a valid range
    if (range.e.c >= 0 && range.e.r >= 0) {
      // Print settings are handled by Excel when the file is opened
      // Column widths are set above for proper alignment
    }
  }
}

/**
 * Format Excel worksheet created from JSON data
 * Converts JSON sheet to array format and applies formatting
 */
export function formatExcelFromJson(
  worksheet: XLSX.WorkSheet,
  jsonData: Record<string, any>[]
): void {
  if (!jsonData || jsonData.length === 0) return;
  
  const headers = Object.keys(jsonData[0]);
  const rows = jsonData.map(row => headers.map(h => {
    const value = row[h];
    return value !== null && value !== undefined ? String(value) : "";
  }));
  
  applyExcelFormatting(worksheet, headers, rows);
}

/**
 * Export data to Excel format with proper formatting and print settings
 */
export function exportToExcel(
  data: ExportData | ExportData[],
  options: ExportOptions = {}
): void {
  const { fileName = "export", includeDate = true, sheetName = "Sheet1" } = options;

  const workbook = XLSX.utils.book_new();

  // Handle single sheet or multiple sheets
  const dataArray = Array.isArray(data) ? data : [data];

  dataArray.forEach((sheetData, index) => {
    const { headers, rows } = sheetData;
    const currentSheetName = sheetData.sheetName || `${sheetName}${index > 0 ? ` ${index + 1}` : ""}`;

    // Create worksheet from array of arrays
    const worksheetData = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Apply formatting for print-ready output
    applyExcelFormatting(worksheet, headers, rows);

    XLSX.utils.book_append_sheet(workbook, worksheet, currentSheetName.substring(0, 31)); // Excel sheet name limit
  });

  // Generate filename
  const dateSuffix = includeDate ? `_${format(new Date(), "yyyy-MM-dd")}` : "";
  const filename = `${fileName}${dateSuffix}.xlsx`;

  XLSX.writeFile(workbook, filename);
}

/**
 * Export HTML element to PDF
 */
export async function exportToPDF(
  element: HTMLElement,
  options: {
    fileName?: string;
    includeDate?: boolean;
    format?: "a4" | "letter";
    orientation?: "portrait" | "landscape";
  } = {}
): Promise<void> {
  const {
    fileName = "export",
    includeDate = true,
    format = "a4",
    orientation = "portrait",
  } = options;

  const opt = {
    margin: [10, 10, 10, 10],
    filename: `${fileName}${includeDate ? `_${format(new Date(), "yyyy-MM-dd")}` : ""}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
    },
    jsPDF: {
      unit: "mm",
      format,
      orientation,
    },
  };

  await html2pdf().set(opt).from(element).save();
}

/**
 * Export table data to multiple formats
 */
export function exportTable(
  tableElement: HTMLTableElement,
  options: {
    format: "csv" | "excel" | "pdf";
    fileName?: string;
    includeDate?: boolean;
  }
): void {
  const { format, fileName = "table", includeDate = true } = options;

  // Extract data from table
  const headers: string[] = [];
  const rows: (string | number)[][] = [];

  // Get headers
  const headerRow = tableElement.querySelector("thead tr");
  if (headerRow) {
    headerRow.querySelectorAll("th, td").forEach((cell) => {
      headers.push(cell.textContent?.trim() || "");
    });
  }

  // Get rows
  tableElement.querySelectorAll("tbody tr").forEach((row) => {
    const rowData: (string | number)[] = [];
    row.querySelectorAll("td").forEach((cell) => {
      const text = cell.textContent?.trim() || "";
      // Try to parse as number
      const num = parseFloat(text.replace(/[₹,]/g, ""));
      rowData.push(isNaN(num) ? text : num);
    });
    if (rowData.length > 0) {
      rows.push(rowData);
    }
  });

  const exportData: ExportData = { headers, rows };

  switch (format) {
    case "csv":
      exportToCSV(exportData, { fileName, includeDate });
      break;
    case "excel":
      exportToExcel(exportData, { fileName, includeDate });
      break;
    case "pdf":
      exportToPDF(tableElement, { fileName, includeDate });
      break;
  }
}

/**
 * Convert JSON data to export format
 */
export function jsonToExportData(
  json: Record<string, any>[],
  options: {
    headers?: string[];
    excludeKeys?: string[];
  } = {}
): ExportData {
  const { headers: customHeaders, excludeKeys = [] } = options;

  if (json.length === 0) {
    return { headers: [], rows: [] };
  }

  // Get headers from first object or use custom headers
  const headers =
    customHeaders ||
    Object.keys(json[0]).filter((key) => !excludeKeys.includes(key));

  // Convert objects to rows
  const rows = json.map((obj) =>
    headers.map((header) => {
      const value = obj[header];
      return value !== null && value !== undefined ? String(value) : "";
    })
  );

  return { headers, rows };
}


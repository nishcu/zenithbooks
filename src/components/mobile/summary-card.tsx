"use client";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

interface SummaryCardProps {
  sales?: number;
  purchases?: number;
  gstPayable?: number;
  itc?: number;
  className?: string;
}

export function SummaryCard({ sales = 0, purchases = 0, gstPayable, itc, className }: SummaryCardProps) {
  return (
    <div className={cn("bg-white rounded-2xl p-4 shadow-sm border border-gray-100", className)}>
      <div className="grid grid-cols-2 gap-4">
        {/* Sales */}
        <div className="space-y-1">
          <p className="text-xs text-gray-500 font-medium">Sales</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(sales)}</p>
        </div>

        {/* Purchases */}
        <div className="space-y-1">
          <p className="text-xs text-gray-500 font-medium">Purchases</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(purchases)}</p>
        </div>

        {/* GST Payable */}
        {gstPayable !== undefined && (
          <div className="space-y-1">
            <p className="text-xs text-gray-500 font-medium">GST Payable</p>
            <p className={cn(
              "text-xl font-bold",
              gstPayable > 0 ? "text-red-600" : "text-gray-900"
            )}>
              {formatCurrency(Math.abs(gstPayable))}
            </p>
          </div>
        )}

        {/* ITC */}
        {itc !== undefined && (
          <div className="space-y-1">
            <p className="text-xs text-gray-500 font-medium">ITC</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(itc)}</p>
          </div>
        )}
      </div>
    </div>
  );
}


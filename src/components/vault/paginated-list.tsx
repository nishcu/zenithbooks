"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PaginatedListProps<T> {
  items: T[];
  itemsPerPage?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  emptyMessage?: string;
  className?: string;
}

export function PaginatedList<T>({
  items,
  itemsPerPage = 10,
  renderItem,
  emptyMessage = "No items found",
  className = "",
}: PaginatedListProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(itemsPerPage);

  const totalPages = Math.ceil(items.length / perPage);
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedItems = useMemo(
    () => items.slice(startIndex, endIndex),
    [items, startIndex, endIndex]
  );

  // Reset to page 1 when items change significantly
  useMemo(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [items.length, totalPages, currentPage]);

  if (items.length === 0) {
    return (
      <div className={`text-center py-12 text-muted-foreground ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Items */}
      <div className="space-y-2">
        {paginatedItems.map((item, index) => renderItem(item, startIndex + index))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              Showing {startIndex + 1} to {Math.min(endIndex, items.length)} of {items.length} items
            </span>
            <Select
              value={perPage.toString()}
              onValueChange={(value) => {
                setPerPage(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span>per page</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              title="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              title="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              title="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              title="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}


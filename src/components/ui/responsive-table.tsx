"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ResponsiveTableColumn<T = any> {
  key: string;
  header: string;
  accessor: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  className?: string;
  mobileLabel?: string;
  priority?: 'high' | 'medium' | 'low'; // For mobile display priority
}

export interface ResponsiveTableAction<T = any> {
  label: string;
  onClick: (item: T) => void;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: (item: T) => boolean;
}

interface ResponsiveTableProps<T = any> {
  data: T[];
  columns: ResponsiveTableColumn<T>[];
  actions?: ResponsiveTableAction<T>[];
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  mobileCardTitle?: (item: T) => React.ReactNode;
  mobileCardSubtitle?: (item: T) => React.ReactNode;
  expandableContent?: (item: T) => React.ReactNode;
  onRowClick?: (item: T) => void;
  selectable?: boolean;
  selectedRows?: T[];
  onSelectionChange?: (selectedRows: T[]) => void;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
}

// Mobile card component
function MobileCard<T>({
  item,
  columns,
  actions,
  title,
  subtitle,
  expandableContent,
  onRowClick,
  selectable,
  isSelected,
  onSelectionChange,
}: {
  item: T;
  columns: ResponsiveTableColumn<T>[];
  actions?: ResponsiveTableAction<T>[];
  title?: (item: T) => React.ReactNode;
  subtitle?: (item: T) => React.ReactNode;
  expandableContent?: (item: T) => React.ReactNode;
  onRowClick?: (item: T) => void;
  selectable?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (selectedRows: T[]) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);

  // Group columns by priority for mobile display
  const highPriorityColumns = columns.filter(col => col.priority === 'high' || !col.priority);
  const mediumPriorityColumns = columns.filter(col => col.priority === 'medium');
  const lowPriorityColumns = columns.filter(col => col.priority === 'low');

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {title && (
              <CardTitle className="text-base mb-1">
                {title(item)}
              </CardTitle>
            )}
            {subtitle && (
              <div className="text-sm text-muted-foreground">
                {subtitle(item)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4">
            {actions && actions.length > 0 && (
              <div className="flex gap-1">
                {actions.slice(0, 2).map((action, index) => (
                  <Button
                    key={index}
                    variant={action.variant || "ghost"}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      action.onClick(item);
                    }}
                    disabled={action.disabled?.(item)}
                    className="h-8 w-8 p-0"
                  >
                    {action.icon}
                  </Button>
                ))}
                {actions.length > 2 && (
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
            {expandableContent && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="h-8 w-8 p-0"
              >
                {expanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* High priority fields */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          {highPriorityColumns.map((column) => (
            <div key={column.key} className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {column.mobileLabel || column.header}
              </div>
              <div className="text-sm font-medium">
                {column.accessor(item)}
              </div>
            </div>
          ))}
        </div>
      </CardHeader>

      {/* Medium and low priority fields in expandable section */}
      {(mediumPriorityColumns.length > 0 || lowPriorityColumns.length > 0) && expanded && (
        <CardContent className="pt-0">
          <div className="space-y-3">
            {mediumPriorityColumns.concat(lowPriorityColumns).map((column) => (
              <div key={column.key} className="flex justify-between items-center py-2 border-t border-border/50">
                <span className="text-sm font-medium text-muted-foreground">
                  {column.mobileLabel || column.header}
                </span>
                <span className="text-sm font-medium">
                  {column.accessor(item)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      )}

      {/* Expandable content */}
      {expandableContent && expanded && (
        <CardContent className="pt-0">
          <div className="border-t border-border/50 pt-3">
            {expandableContent(item)}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function ResponsiveTable<T = any>({
  data,
  columns,
  actions,
  loading = false,
  emptyMessage = "No data available",
  className,
  mobileCardTitle,
  mobileCardSubtitle,
  expandableContent,
  onRowClick,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  sortBy,
  sortDirection,
  onSort,
}: ResponsiveTableProps<T>) {
  const [expandedRows, setExpandedRows] = React.useState<Set<number>>(new Set());

  const toggleRowExpansion = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const handleRowSelection = (item: T, checked: boolean) => {
    if (!onSelectionChange) return;

    let newSelectedRows = [...selectedRows];
    if (checked) {
      newSelectedRows.push(item);
    } else {
      newSelectedRows = newSelectedRows.filter(row => row !== item);
    }
    onSelectionChange(newSelectedRows);
  };

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    onSelectionChange(checked ? [...data] : []);
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        {/* Mobile loading cards */}
        <div className="md:hidden space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Desktop loading table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column.key} className={column.className}>
                    <div className="h-4 bg-muted rounded animate-pulse"></div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      <div className="h-4 bg-muted rounded animate-pulse"></div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
        <div className="text-muted-foreground mb-2">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">No data found</h3>
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-2">
        {data.map((item, index) => (
          <MobileCard
            key={index}
            item={item}
            columns={columns}
            actions={actions}
            title={mobileCardTitle}
            subtitle={mobileCardSubtitle}
            expandableContent={expandableContent}
            onRowClick={onRowClick}
            selectable={selectable}
            isSelected={selectedRows.includes(item)}
            onSelectionChange={onSelectionChange ? (selected) => handleRowSelection(item, selected.includes(item)) : undefined}
          />
        ))}
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === data.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(column.className, column.sortable && "cursor-pointer select-none hover:bg-muted/50")}
                  style={{ width: column.width }}
                  onClick={column.sortable && onSort ? () => onSort(column.key) : undefined}
                >
                  <div className="flex items-center gap-2">
                    {column.header}
                    {column.sortable && sortBy === column.key && (
                      <span className="text-muted-foreground">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </TableHead>
              ))}
              {(actions && actions.length > 0) && (
                <TableHead className="w-24 text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => (
              <TableRow
                key={index}
                className={cn(
                  onRowClick && "cursor-pointer hover:bg-muted/50",
                  selectedRows.includes(item) && "bg-muted/70"
                )}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
              >
                {selectable && (
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(item)}
                      onChange={(e) => handleRowSelection(item, e.target.checked)}
                      className="rounded border-gray-300"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    className={column.className}
                  >
                    {column.accessor(item)}
                  </TableCell>
                ))}
                {actions && actions.length > 0 && (
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {actions.map((action, actionIndex) => (
                        <Button
                          key={actionIndex}
                          variant={action.variant || "ghost"}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            action.onClick(item);
                          }}
                          disabled={action.disabled?.(item)}
                          className="h-8"
                        >
                          {action.icon && <span className="mr-1">{action.icon}</span>}
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

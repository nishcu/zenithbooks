"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Simple dropdown component that works in dialogs
function SimpleDropdown({
  isOpen,
  onClose,
  options,
  value,
  onValueChange,
  searchPlaceholder,
  emptyMessage,
  groupBy
}: {
  isOpen: boolean;
  onClose: () => void;
  options: SelectOption[];
  value?: string;
  onValueChange: (value: string) => void;
  searchPlaceholder: string;
  emptyMessage: string;
  groupBy: boolean;
}) {
  const [searchTerm, setSearchTerm] = React.useState("");

  const filteredOptions = React.useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      option.value.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  const groupedOptions = React.useMemo(() => {
    if (!groupBy) return { "": filteredOptions };

    return filteredOptions.reduce((acc, option) => {
      const group = option.group || "";
      if (!acc[group]) acc[group] = [];
      acc[group].push(option);
      return acc;
    }, {} as Record<string, SelectOption[]>);
  }, [filteredOptions, groupBy]);

  if (!isOpen) return null;

  console.log('Rendering dropdown, isOpen:', isOpen, 'options count:', options.length);

  return (
    <div
      className="absolute top-full left-0 z-[10000] mt-1 bg-white dark:bg-gray-900 border-2 border-blue-500 dark:border-blue-400 rounded-lg shadow-2xl max-h-80 overflow-hidden"
      style={{
        width: '400px',
        minWidth: '350px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25), 0 8px 16px rgba(0, 0, 0, 0.15)'
      }}
    >
      {/* Search Input */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <Input
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-9 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400"
          autoFocus
        />
      </div>

      {/* Options List */}
      <div className="max-h-60 overflow-y-auto">
        {Object.keys(groupedOptions).length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
            {emptyMessage}
          </div>
        ) : (
          Object.entries(groupedOptions).map(([group, groupOptions]) => (
            <div key={group}>
              {group && (
                <div className="px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 uppercase tracking-wide">
                  {group}
                </div>
              )}
              {groupOptions.map((option) => (
                <div
                  key={option.value}
                  className={cn(
                    "flex items-center px-3 py-3 text-sm cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-150",
                    value === option.value && "bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100"
                  )}
                  onClick={() => {
                    console.log('Selected option:', option.value, option.label);
                    onValueChange(option.value === value ? "" : option.value);
                    onClose();
                  }}
                >
                  <Check
                    className={cn(
                      "mr-3 h-4 w-4 flex-shrink-0",
                      value === option.value ? "opacity-100 text-blue-600 dark:text-blue-400" : "opacity-0"
                    )}
                  />
                  <span className="flex-1 truncate font-medium">{option.label}</span>
                  {option.group && groupBy && (
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                      {option.group}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export interface SelectOption {
  value: string;
  label: string;
  group?: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
  groupBy?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search options...",
  emptyMessage = "No options found.",
  className,
  disabled = false,
  groupBy = false,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find((option) => option.value === value);

  const handleButtonClick = () => {
    console.log('SearchableSelect clicked, toggling dropdown. Current open state:', open);
    console.log('Available options:', options.length);
    setOpen(!open);
  };

  const handleClose = () => {
    console.log('SearchableSelect closing dropdown');
    setOpen(false);
  };

  // Click outside to close
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleClose();
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className={cn("w-full justify-between", className)}
        disabled={disabled}
        onClick={handleButtonClick}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      <SimpleDropdown
        isOpen={open}
        onClose={handleClose}
        options={options}
        value={value}
        onValueChange={onValueChange}
        searchPlaceholder={searchPlaceholder}
        emptyMessage={emptyMessage}
        groupBy={groupBy}
      />
    </div>
  );
}

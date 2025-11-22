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

  return (
    <div className="absolute top-full left-0 right-0 z-[9999] mt-1 bg-popover border rounded-md shadow-md max-h-64 overflow-hidden">
      <div className="p-2">
        <Input
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-8"
          autoFocus
        />
      </div>
      <div className="max-h-48 overflow-y-auto">
        {Object.keys(groupedOptions).length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          Object.entries(groupedOptions).map(([group, groupOptions]) => (
            <div key={group}>
              {group && (
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/50">
                  {group}
                </div>
              )}
              {groupOptions.map((option) => (
                <div
                  key={option.value}
                  className={cn(
                    "flex items-center px-2 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground",
                    value === option.value && "bg-accent text-accent-foreground"
                  )}
                  onClick={() => {
                    onValueChange(option.value === value ? "" : option.value);
                    onClose();
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{option.label}</span>
                  {option.group && groupBy && (
                    <span className="ml-auto text-xs text-muted-foreground">
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
    setOpen(!open);
  };

  const handleClose = () => {
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

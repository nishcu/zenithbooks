
"use client"

import * as React from "react"
import { format, isValid, parse } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
    onDateChange: (dateRange: DateRange | undefined) => void;
    initialDateRange?: DateRange;
}

const DISPLAY_FORMAT = "dd-MM-yyyy";
const INPUT_PLACEHOLDER = "DD-MM-YYYY";
const SUPPORTED_INPUT_FORMATS = ["dd-MM-yyyy", "dd/MM/yyyy", "yyyy-MM-dd", "dd MMM yyyy"];

export function DateRangePicker({
  className,
  onDateChange,
  initialDateRange
}: DateRangePickerProps) {
  const [date, setDate] = React.useState<DateRange | undefined>(initialDateRange);
  const [fromInput, setFromInput] = React.useState(() => initialDateRange?.from ? format(initialDateRange.from, DISPLAY_FORMAT) : "");
  const [toInput, setToInput] = React.useState(() => initialDateRange?.to ? format(initialDateRange.to, DISPLAY_FORMAT) : "");
  const [fromError, setFromError] = React.useState(false);
  const [toError, setToError] = React.useState(false);

  React.useEffect(() => {
    onDateChange?.(date);
  }, [date, onDateChange]);

  React.useEffect(() => {
    setFromInput(date?.from ? format(date.from, DISPLAY_FORMAT) : "");
    setToInput(date?.to ? format(date.to, DISPLAY_FORMAT) : "");
  }, [date?.from, date?.to]);

  const parseInputToDate = React.useCallback((value: string): Date | null => {
    if (!value) return null;
    for (const fmt of SUPPORTED_INPUT_FORMATS) {
      const parsed = parse(value, fmt, new Date());
      if (isValid(parsed)) {
        return parsed;
      }
    }
    const fallback = new Date(value);
    if (isValid(fallback)) {
      return fallback;
    }
    return null;
  }, []);

  const normalizeRange = React.useCallback((range: DateRange | undefined): DateRange | undefined => {
    if (!range?.from && !range?.to) return undefined;
    if (range?.from && range?.to && range.from > range.to) {
      return { from: range.to, to: range.from };
    }
    return range;
  }, []);

  const setRangeDate = React.useCallback((type: "from" | "to", value: Date | undefined) => {
    setDate(prev => {
      const nextRange: DateRange = {
        from: type === "from" ? value : prev?.from,
        to: type === "to" ? value : prev?.to,
      };
      return normalizeRange(nextRange);
    });
  }, [normalizeRange]);

  const handleInputCommit = React.useCallback((type: "from" | "to") => {
    const value = type === "from" ? fromInput : toInput;
    const setError = type === "from" ? setFromError : setToError;

    if (!value) {
      setError(false);
      setRangeDate(type, undefined);
      return;
    }

    const parsed = parseInputToDate(value);
    if (parsed) {
      setError(false);
      setRangeDate(type, parsed);
    } else {
      setError(true);
    }
  }, [fromInput, toInput, parseInputToDate, setRangeDate]);

  const handleCalendarSelect = React.useCallback((type: "from" | "to", selected: Date | undefined) => {
    if (!selected) return;
    setRangeDate(type, selected);
  }, [setRangeDate]);

  const renderDateInput = (type: "from" | "to") => {
    const value = type === "from" ? fromInput : toInput;
    const setValue = type === "from" ? setFromInput : setToInput;
    const error = type === "from" ? fromError : toError;
    const selectedDate = type === "from" ? date?.from : date?.to;
    const label = type === "from" ? "From date" : "To date";

    return (
      <div className="space-y-1">
        <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
        <div className="relative">
          <Input
            value={value}
            placeholder={INPUT_PLACEHOLDER}
            onChange={(event) => {
              setValue(event.target.value);
              if (error) {
                (type === "from" ? setFromError : setToError)(false);
              }
            }}
            onBlur={() => handleInputCommit(type)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleInputCommit(type);
              }
            }}
            className={cn(
              "pr-10 text-sm",
              error && "border-destructive focus-visible:ring-destructive"
            )}
            aria-label={label}
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1.5 h-7 w-7 text-muted-foreground"
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-2">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(selected) => handleCalendarSelect(type, selected)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        {error && <p className="text-xs text-destructive">Enter a valid date.</p>}
      </div>
    );
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Format: DD-MM-YYYY or DD/MM/YYYY</span>
        {date?.from && date?.to && (
          <span>
            {format(date.from, DISPLAY_FORMAT)} — {format(date.to, DISPLAY_FORMAT)}
          </span>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {renderDateInput("from")}
        {renderDateInput("to")}
      </div>
    </div>
  )
}

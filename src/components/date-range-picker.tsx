
"use client"

import * as React from "react"
import { format, isValid, parse } from "date-fns"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  onDateChange: (dateRange: DateRange | undefined) => void
  initialDateRange?: DateRange
}

const DISPLAY_FORMAT = "dd/MM/yyyy"
const INPUT_PLACEHOLDER = "DD/MM/YYYY"
const SUPPORTED_INPUT_FORMATS = ["dd/MM/yyyy", "dd-MM-yyyy", "yyyy-MM-dd", "dd MMM yyyy"]

export function DateRangePicker({
  className,
  onDateChange,
  initialDateRange,
}: DateRangePickerProps) {
  const [date, setDate] = React.useState<DateRange | undefined>(initialDateRange)
  const [fromInput, setFromInput] = React.useState(
    () => initialDateRange?.from ? format(initialDateRange.from, DISPLAY_FORMAT) : ""
  )
  const [toInput, setToInput] = React.useState(
    () => initialDateRange?.to ? format(initialDateRange.to, DISPLAY_FORMAT) : ""
  )
  const [fromError, setFromError] = React.useState<string | null>(null)
  const [toError, setToError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setDate(initialDateRange)
    setFromInput(initialDateRange?.from ? format(initialDateRange.from, DISPLAY_FORMAT) : "")
    setToInput(initialDateRange?.to ? format(initialDateRange.to, DISPLAY_FORMAT) : "")
  }, [initialDateRange])

  React.useEffect(() => {
    onDateChange?.(date)
  }, [date, onDateChange])

  const parseInputToDate = React.useCallback((value: string): Date | null => {
    if (!value) return null
    const cleanValue = value.trim()
    for (const fmt of SUPPORTED_INPUT_FORMATS) {
      const parsed = parse(cleanValue, fmt, new Date())
      if (isValid(parsed)) {
        return parsed
      }
    }
    const fallback = new Date(cleanValue)
    if (isValid(fallback)) {
      return fallback
    }
    return null
  }, [])

  const normalizeRange = React.useCallback((range: DateRange | undefined): DateRange | undefined => {
    if (!range?.from && !range?.to) return undefined
    if (range?.from && range?.to && range.from > range.to) {
      return { from: range.to, to: range.from }
    }
    return range
  }, [])

  const setRangeDate = React.useCallback((type: "from" | "to", value: Date | undefined) => {
    setDate(prev => {
      const nextRange: DateRange = {
        from: type === "from" ? value : prev?.from,
        to: type === "to" ? value : prev?.to,
      }
      return normalizeRange(nextRange)
    })
  }, [normalizeRange])

  const commitInputValue = React.useCallback((type: "from" | "to") => {
    const rawValue = type === "from" ? fromInput : toInput
    const setError = type === "from" ? setFromError : setToError

    if (!rawValue) {
      setError(null)
      setRangeDate(type, undefined)
      return
    }

    const parsed = parseInputToDate(rawValue)
    if (parsed) {
      setError(null)
      setRangeDate(type, parsed)
    } else {
      setError("Enter a valid date in DD/MM/YYYY format.")
    }
  }, [fromInput, toInput, parseInputToDate, setRangeDate])

  const handleInputChange = React.useCallback((type: "from" | "to", value: string) => {
    if (type === "from") {
      setFromInput(value)
      if (fromError) setFromError(null)
    } else {
      setToInput(value)
      if (toError) setToError(null)
    }
  }, [fromError, toError])

  const renderInput = (type: "from" | "to") => {
    const value = type === "from" ? fromInput : toInput
    const error = type === "from" ? fromError : toError
    const label = type === "from" ? "From date" : "To date"

    return (
      <div className="space-y-1">
        <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
        <Input
          value={value}
          placeholder={INPUT_PLACEHOLDER}
          onChange={(event) => handleInputChange(type, event.target.value)}
          onBlur={() => commitInputValue(type)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              commitInputValue(type)
            }
          }}
          className={cn(
            "text-sm",
            error && "border-destructive focus-visible:ring-destructive"
          )}
          aria-label={label}
        />
        <p className="text-[11px] text-muted-foreground">
          Example: {type === "from" ? "01/04/2024" : "31/03/2025"}
        </p>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col gap-1 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
        <span>Accepted formats: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD</span>
        {date?.from && date?.to && (
          <span className="font-medium text-foreground">
            Period: {format(date.from, DISPLAY_FORMAT)} → {format(date.to, DISPLAY_FORMAT)}
          </span>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {renderInput("from")}
        {renderInput("to")}
      </div>
    </div>
  )
}

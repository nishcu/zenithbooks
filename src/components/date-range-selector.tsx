"use client"

import * as React from "react"
import { format, parse, startOfMonth, endOfMonth, subDays } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface DateRangeSelectorProps {
  fromDate?: Date
  toDate?: Date
  onFromDateChange: (date: Date | undefined) => void
  onToDateChange: (date: Date | undefined) => void
  onSubmit: () => void
  className?: string
  submitLabel?: string
  disabled?: boolean
}

export function DateRangeSelector({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  onSubmit,
  className,
  submitLabel = "Generate Report",
  disabled = false,
}: DateRangeSelectorProps) {
  const [fromOpen, setFromOpen] = React.useState(false)
  const [toOpen, setToOpen] = React.useState(false)
  const [fromInput, setFromInput] = React.useState("")
  const [toInput, setToInput] = React.useState("")

  React.useEffect(() => {
    setFromInput(fromDate ? format(fromDate, "yyyy-MM-dd") : "")
  }, [fromDate])

  React.useEffect(() => {
    setToInput(toDate ? format(toDate, "yyyy-MM-dd") : "")
  }, [toDate])

  const resolveKeyword = React.useCallback((value: string): Date | undefined => {
    const keyword = value.trim().toLowerCase()
    const today = new Date()
    switch (keyword) {
      case "today":
        return today
      case "yesterday":
        return subDays(today, 1)
      case "month-start":
      case "start":
        return startOfMonth(today)
      case "month-end":
      case "end":
        return endOfMonth(today)
      default:
        return undefined
    }
  }, [])

  const parseManualDate = React.useCallback((value: string): Date | undefined => {
    if (!value.trim()) return undefined
    const keywordDate = resolveKeyword(value)
    if (keywordDate) return keywordDate
    const parsed = parse(value, "yyyy-MM-dd", new Date())
    if (!isNaN(parsed.getTime())) return parsed
    const fallback = new Date(value)
    if (!isNaN(fallback.getTime())) return fallback
    return undefined
  }, [resolveKeyword])

  const commitManualInput = React.useCallback(
    (type: "from" | "to", raw: string) => {
      const parsed = parseManualDate(raw)
      if (parsed) {
        if (type === "from") {
          onFromDateChange(parsed)
        } else {
          onToDateChange(parsed)
        }
      }
    },
    [onFromDateChange, onToDateChange, parseManualDate]
  )

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="from-date">From Date</Label>
          <Popover open={fromOpen} onOpenChange={setFromOpen}>
            <PopoverTrigger asChild>
              <Button
                id="from-date"
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal min-w-0",
                  !fromDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate min-w-0">
                  {fromDate ? format(fromDate, "dd MMM yyyy") : "Select from date"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={fromDate}
                onSelect={(date) => {
                  onFromDateChange(date)
                  setFromOpen(false)
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Input
            list="from-date-suggestions"
            value={fromInput}
            placeholder="YYYY-MM-DD or keyword (today)"
            onChange={(event) => setFromInput(event.target.value)}
            onBlur={() => commitManualInput("from", fromInput)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                commitManualInput("from", fromInput)
              }
            }}
          />
          <datalist id="from-date-suggestions">
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="month-start">Month Start</option>
            <option value="month-end">Month End</option>
          </datalist>
          <p className="text-xs text-muted-foreground">
            Pick a date or type keywords like "today", "month-start", or a custom YYYY-MM-DD.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="to-date">To Date</Label>
          <Popover open={toOpen} onOpenChange={setToOpen}>
            <PopoverTrigger asChild>
              <Button
                id="to-date"
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal min-w-0",
                  !toDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate min-w-0">
                  {toDate ? format(toDate, "dd MMM yyyy") : "Select to date"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={toDate}
                onSelect={(date) => {
                  onToDateChange(date)
                  setToOpen(false)
                }}
                initialFocus
                disabled={(date) => fromDate ? date < fromDate : false}
              />
            </PopoverContent>
          </Popover>
          <Input
            list="to-date-suggestions"
            value={toInput}
            placeholder="YYYY-MM-DD or keyword (today)"
            onChange={(event) => setToInput(event.target.value)}
            onBlur={() => commitManualInput("to", toInput)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                commitManualInput("to", toInput)
              }
            }}
          />
          <datalist id="to-date-suggestions">
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="month-start">Month Start</option>
            <option value="month-end">Month End</option>
          </datalist>
          <p className="text-xs text-muted-foreground">
            Pick a date or type keywords like "today", "month-end", or a custom YYYY-MM-DD.
          </p>
        </div>
      </div>
      <Button
        onClick={onSubmit}
        disabled={disabled || !fromDate || !toDate}
        className="w-full md:w-auto"
      >
        {submitLabel}
      </Button>
    </div>
  )
}


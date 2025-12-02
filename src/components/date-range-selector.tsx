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
          {/* Manual Input - More Prominent */}
          <div className="space-y-2">
            <Input
              id="from-date-input"
              type="date"
              value={fromInput}
              placeholder="YYYY-MM-DD"
              onChange={(event) => {
                setFromInput(event.target.value)
                if (event.target.value) {
                  const parsed = parseManualDate(event.target.value)
                  if (parsed) {
                    onFromDateChange(parsed)
                  }
                }
              }}
              className="w-full"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Or</span>
              <Popover open={fromOpen} onOpenChange={setFromOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="from-date"
                    variant={"outline"}
                    size="sm"
                    className={cn(
                      "justify-start text-left font-normal",
                      !fromDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {fromDate ? format(fromDate, "dd MMM yyyy") : "Pick from calendar"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={(date) => {
                      onFromDateChange(date)
                      setFromOpen(false)
                    }}
                    initialFocus
                    className="calendar-fixed"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                const today = new Date()
                onFromDateChange(today)
                setFromInput(format(today, "yyyy-MM-dd"))
              }}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                const start = startOfMonth(new Date())
                onFromDateChange(start)
                setFromInput(format(start, "yyyy-MM-dd"))
              }}
            >
              Month Start
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                const yesterday = subDays(new Date(), 1)
                onFromDateChange(yesterday)
                setFromInput(format(yesterday, "yyyy-MM-dd"))
              }}
            >
              Yesterday
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="to-date">To Date</Label>
          {/* Manual Input - More Prominent */}
          <div className="space-y-2">
            <Input
              id="to-date-input"
              type="date"
              value={toInput}
              placeholder="YYYY-MM-DD"
              onChange={(event) => {
                setToInput(event.target.value)
                if (event.target.value) {
                  const parsed = parseManualDate(event.target.value)
                  if (parsed) {
                    onToDateChange(parsed)
                  }
                }
              }}
              className="w-full"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Or</span>
              <Popover open={toOpen} onOpenChange={setToOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="to-date"
                    variant={"outline"}
                    size="sm"
                    className={cn(
                      "justify-start text-left font-normal",
                      !toDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {toDate ? format(toDate, "dd MMM yyyy") : "Pick from calendar"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={(date) => {
                      onToDateChange(date)
                      setToOpen(false)
                    }}
                    initialFocus
                    disabled={(date) => fromDate ? date < fromDate : false}
                    className="calendar-fixed"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                const today = new Date()
                onToDateChange(today)
                setToInput(format(today, "yyyy-MM-dd"))
              }}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                const end = endOfMonth(new Date())
                onToDateChange(end)
                setToInput(format(end, "yyyy-MM-dd"))
              }}
            >
              Month End
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                const yesterday = subDays(new Date(), 1)
                onToDateChange(yesterday)
                setToInput(format(yesterday, "yyyy-MM-dd"))
              }}
            >
              Yesterday
            </Button>
          </div>
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


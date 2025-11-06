"use client"

import * as React from "react"
import { format } from "date-fns"
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
                  "w-full justify-start text-left font-normal",
                  !fromDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {fromDate ? format(fromDate, "dd MMM, yyyy") : <span>Select from date</span>}
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
        </div>
        <div className="space-y-2">
          <Label htmlFor="to-date">To Date</Label>
          <Popover open={toOpen} onOpenChange={setToOpen}>
            <PopoverTrigger asChild>
              <Button
                id="to-date"
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !toDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {toDate ? format(toDate, "dd MMM, yyyy") : <span>Select to date</span>}
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


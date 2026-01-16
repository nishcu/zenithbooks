/**
 * Task Filters Component
 * Filter tasks by category, location, etc.
 */

"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { TASK_CATEGORIES, INDIA_STATES } from "@/lib/professionals/types";

interface TaskFiltersProps {
  onFilterChange: (filters: {
    category?: string;
    state?: string;
    city?: string;
    status?: string;
  }) => void;
  initialFilters?: {
    category?: string;
    state?: string;
    city?: string;
    status?: string;
  };
}

export function TaskFilters({ onFilterChange, initialFilters = {} }: TaskFiltersProps) {
  const [category, setCategory] = useState(initialFilters.category ? (initialFilters.category === "" ? "all" : initialFilters.category) : "all");
  const [state, setState] = useState(initialFilters.state ? (initialFilters.state === "" ? "all" : initialFilters.state) : "all");
  const [city, setCity] = useState(initialFilters.city || "");
  const [status, setStatus] = useState(initialFilters.status || "open");

  const handleApply = () => {
    onFilterChange({
      category: category && category !== "all" ? category : undefined,
      state: state && state !== "all" ? state : undefined,
      city: city || undefined,
      status: status || undefined,
    });
  };

  const handleClear = () => {
    setCategory("all");
    setState("all");
    setCity("");
    setStatus("open");
    onFilterChange({});
  };

  const hasFilters = (category && category !== "all") || (state && state !== "all") || city || status !== "open";

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Filters</h3>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-8"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category || undefined} onValueChange={(value) => setCategory(value || "")}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {TASK_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* State */}
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Select value={state || undefined} onValueChange={(value) => setState(value === "all" ? "" : value || "")}>
                <SelectTrigger id="state">
                  <SelectValue placeholder="All states" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All states</SelectItem>
                  {INDIA_STATES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* City */}
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <input
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Enter city name"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          <Button onClick={handleApply} className="w-full">
            Apply Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


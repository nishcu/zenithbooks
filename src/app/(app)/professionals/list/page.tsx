/**
 * Professionals List Page
 */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProfessionalCard } from "@/components/professionals/professional-card";
import { Loader2 } from "lucide-react";
import { INDIA_STATES } from "@/lib/professionals/types";
import type { ProfessionalProfile } from "@/lib/professionals/types";

export default function ProfessionalsListPage() {
  const [professionals, setProfessionals] = useState<ProfessionalProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("");

  useEffect(() => {
    loadProfessionals();
  }, [stateFilter, cityFilter]);

  const loadProfessionals = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (stateFilter && stateFilter !== "all" && stateFilter.trim() !== "") {
        params.append("state", stateFilter.trim());
      }
      if (cityFilter && cityFilter.trim() !== "") {
        params.append("city", cityFilter.trim());
      }

      const url = params.toString() 
        ? `/api/professionals/list?${params.toString()}`
        : `/api/professionals/list`;

      const response = await fetch(url);
      
      if (!response.ok) {
        // Don't throw, just log and set empty array to prevent retry loops
        console.error(`API returned ${response.status}: ${response.statusText}`);
        setProfessionals([]);
        return;
      }

      const data = await response.json();

      if (data.success) {
        setProfessionals(data.professionals || []);
      } else {
        // API returned success: false, set empty array
        setProfessionals([]);
      }
    } catch (error) {
      console.error("Error loading professionals:", error);
      // Set empty array on error to prevent retry loops
      setProfessionals([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProfessionals = professionals.filter((prof) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      prof.fullName.toLowerCase().includes(term) ||
      prof.firmName?.toLowerCase().includes(term) ||
      prof.skills.some((skill) => skill.toLowerCase().includes(term))
    );
  });

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Firm Network</h1>
        <p className="text-muted-foreground">
          View verified professionals in your firm network
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Internal reference directory for platform-managed professional resources.
        </p>
      </div>

      <div className="space-y-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <Input
                  placeholder="Search by name, firm, or skills..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">State</label>
                <Select value={stateFilter || undefined} onValueChange={(value) => setStateFilter(value === "all" ? "" : value || "")}>
                  <SelectTrigger>
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
              <div className="space-y-2">
                <label className="text-sm font-medium">City</label>
                <Input
                  placeholder="Enter city name"
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredProfessionals.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground py-8">
              No professionals found
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProfessionals.map((professional) => (
            <ProfessionalCard key={professional.id} professional={professional} />
          ))}
        </div>
      )}
    </div>
  );
}


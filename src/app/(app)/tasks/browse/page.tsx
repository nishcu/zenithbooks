/**
 * Collaboration Requests Page
 * Invite-only: Shows only requests where user's firm is invited or requested
 */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TaskCard } from "@/components/tasks/task-card";
import { TaskFilters } from "@/components/tasks/task-filters";
import { Loader2 } from "lucide-react";
import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import type { CollaborationRequest, TaskPost } from "@/lib/professionals/types";

export default function CollaborationRequestsPage() {
  const [user] = useAuthState(auth);
  const [requests, setRequests] = useState<(CollaborationRequest | TaskPost)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<{
    category?: string;
    state?: string;
    city?: string;
    status?: string;
  }>({});

  useEffect(() => {
    if (user) {
      loadRequests();
    }
  }, [filters, user]);

  const loadRequests = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("userId", user.uid); // Filter by user's firm
      if (filters.category) params.append("category", filters.category);
      if (filters.state) params.append("state", filters.state);
      if (filters.city) params.append("city", filters.city);
      if (filters.status) params.append("status", filters.status);
      else params.append("status", "open");

      const response = await fetch(`/api/collaboration/requests?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setRequests(data.requests || []);
      }
    } catch (error) {
      console.error("Error loading collaboration requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground py-8">
              Please sign in to view collaboration requests
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Collaboration Requests</h1>
        <p className="text-muted-foreground">
          View collaboration requests available to your firm
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          You can see: (1) Requests you posted, (2) Requests where you were invited, (3) Public requests in the firm network.
          <br />
          All tasks are handled by ZenithBooks' internal professional team.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <TaskFilters onFilterChange={setFilters} initialFilters={filters} />
        </div>
        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground py-8">
                  No collaboration requests found
                </p>
                <p className="text-center text-xs text-muted-foreground mt-2">
                  No collaboration requests available. You will see requests you posted, were invited to, or public network requests.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {requests.map((request) => (
                <TaskCard key={request.id} task={request} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


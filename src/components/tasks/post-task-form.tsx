/**
 * Post Task Form Component
 * Form for users to post new tasks
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { TASK_CATEGORIES, INDIA_STATES } from "@/lib/professionals/types";
import { ProfessionalSelector } from "./professional-selector";

export function PostTaskForm() {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFirmIds, setSelectedFirmIds] = useState<string[]>([]);
  const [currentUserFirmId, setCurrentUserFirmId] = useState<string | undefined>();

  // Get current user's firmId
  useEffect(() => {
    const fetchUserFirmId = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setCurrentUserFirmId(userData?.firmId || user.uid);
          } else {
            setCurrentUserFirmId(user.uid);
          }
        } catch (error) {
          console.error("Error fetching user firmId:", error);
          setCurrentUserFirmId(user.uid);
        }
      }
    };
    fetchUserFirmId();
  }, [user]);

  const [formData, setFormData] = useState({
    category: "",
    title: "",
    description: "",
    location: "",
    state: "",
    city: "",
    onSite: false,
    deadline: "",
    visibility: "invite-only" as "invite-only" | "firm-network",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please sign in to create collaboration requests",
      });
      return;
    }

    // Validation
    if (!formData.category || !formData.title || !formData.description || !formData.location || !formData.deadline) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please fill in all required fields",
      });
      return;
    }

    // Validate invitations for invite-only visibility
    if (formData.visibility === "invite-only" && selectedFirmIds.length === 0) {
      toast({
        variant: "destructive",
        title: "No professionals selected",
        description: "Please select at least one professional to invite, or change visibility to 'Firm Network'",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/tasks/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category: formData.category,
          title: formData.title,
          description: formData.description,
          location: formData.location,
          state: formData.state || undefined,
          city: formData.city || undefined,
          onSite: formData.onSite,
          visibility: formData.visibility,
          invitedFirmIds: formData.visibility === "invite-only" ? selectedFirmIds : [],
          deadline: new Date(formData.deadline).toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create task");
      }

      toast({
        title: "Collaboration request created",
        description: "Your collaboration request has been created successfully",
      });

      router.push(`/tasks/view/${data.taskId}`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to post task",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="category">Category *</Label>
        <Select
          value={formData.category || undefined}
          onValueChange={(value) => setFormData({ ...formData, category: value })}
          required
        >
          <SelectTrigger id="category">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {TASK_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Request Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., GST Filing for FY 2024-25"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe your collaboration requirements in detail..."
          rows={6}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Select
            value={formData.state || undefined}
            onValueChange={(value) => setFormData({ ...formData, state: value || "" })}
          >
            <SelectTrigger id="state">
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {INDIA_STATES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            placeholder="Enter city name"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location *</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="e.g., Mumbai, Maharashtra"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="deadline">Deadline *</Label>
        <Input
          id="deadline"
          type="date"
          value={formData.deadline}
          onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
          min={new Date().toISOString().split("T")[0]}
          required
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="onSite"
          checked={formData.onSite}
          onCheckedChange={(checked) => setFormData({ ...formData, onSite: checked })}
        />
        <Label htmlFor="onSite">On-site work required</Label>
      </div>

      <div className="space-y-3">
        <Label>Visibility *</Label>
        <RadioGroup
          value={formData.visibility}
          onValueChange={(value) => setFormData({ ...formData, visibility: value as "invite-only" | "firm-network" })}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="invite-only" id="invite-only" />
            <Label htmlFor="invite-only" className="font-normal cursor-pointer">
              Invite Only - Only selected professionals can see this request
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="firm-network" id="firm-network" />
            <Label htmlFor="firm-network" className="font-normal cursor-pointer">
              Firm Network - All professionals in the network can see this request
            </Label>
          </div>
        </RadioGroup>
        <p className="text-xs text-muted-foreground">
          Choose who can discover and view this collaboration request.
        </p>
      </div>

      {formData.visibility === "invite-only" && (
        <ProfessionalSelector
          selectedFirmIds={selectedFirmIds}
          onSelectionChange={setSelectedFirmIds}
          excludeFirmId={currentUserFirmId}
        />
      )}

      <p className="text-xs text-muted-foreground">
        This collaboration request will be handled by ZenithBooks' internal professional team.
      </p>
      
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Create Collaboration Request
      </Button>
    </form>
  );
}


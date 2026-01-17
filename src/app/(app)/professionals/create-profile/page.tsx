/**
 * Create Professional Profile Page
 */

"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";
import { INDIA_STATES, TASK_CATEGORIES } from "@/lib/professionals/types";

export default function CreateProfilePage() {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    firmName: "",
    qualifications: [] as string[],
    skills: [] as string[],
    experience: "",
    locations: [] as string[],
    bio: "",
    phone: "",
    email: "",
    website: "",
  });

  const [qualificationInput, setQualificationInput] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [locationInput, setLocationInput] = useState("");

  const addQualification = () => {
    if (qualificationInput.trim() && !formData.qualifications.includes(qualificationInput.trim())) {
      setFormData({
        ...formData,
        qualifications: [...formData.qualifications, qualificationInput.trim()],
      });
      setQualificationInput("");
    }
  };

  const removeQualification = (qual: string) => {
    setFormData({
      ...formData,
      qualifications: formData.qualifications.filter((q) => q !== qual),
    });
  };

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, skillInput.trim()],
      });
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter((s) => s !== skill),
    });
  };

  const addLocation = () => {
    if (locationInput.trim() && !formData.locations.includes(locationInput.trim())) {
      setFormData({
        ...formData,
        locations: [...formData.locations, locationInput.trim()],
      });
      setLocationInput("");
    }
  };

  const removeLocation = (loc: string) => {
    setFormData({
      ...formData,
      locations: formData.locations.filter((l) => l !== loc),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please sign in to create a profile",
      });
      return;
    }

    // Trim fullName to check for whitespace-only strings
    const trimmedFullName = formData.fullName?.trim();
    
    // Validate experience - check if it's a valid number (not empty string)
    const experienceNum = formData.experience ? Number(formData.experience) : null;
    
    if (
      !trimmedFullName ||
      formData.qualifications.length === 0 ||
      formData.skills.length === 0 ||
      experienceNum === null ||
      isNaN(experienceNum) ||
      experienceNum < 0 ||
      formData.locations.length === 0
    ) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please fill in all required fields",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/professionals/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: trimmedFullName,
          firmName: formData.firmName?.trim() || undefined,
          qualifications: formData.qualifications,
          skills: formData.skills,
          experience: experienceNum,
          locations: formData.locations,
          bio: formData.bio?.trim() || undefined,
          phone: formData.phone?.trim() || undefined,
          email: formData.email?.trim() || undefined,
          website: formData.website?.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create profile");
      }

      toast({
        title: "Profile created",
        description: "Your professional profile has been created successfully",
      });

      router.push(`/professionals/view/${data.profileId}`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create profile",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Please sign in to create a professional profile
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Create Professional Profile</CardTitle>
          <CardDescription>
            Create your professional profile to start receiving task assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="firmName">Firm Name</Label>
              <Input
                id="firmName"
                value={formData.firmName}
                onChange={(e) => setFormData({ ...formData, firmName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Qualifications *</Label>
              <div className="flex gap-2">
                <Input
                  value={qualificationInput}
                  onChange={(e) => setQualificationInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addQualification())}
                  placeholder="e.g., CA, CS, CMA"
                />
                <Button type="button" onClick={addQualification} variant="outline">
                  Add
                </Button>
              </div>
              {formData.qualifications.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.qualifications.map((qual) => (
                    <div
                      key={qual}
                      className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-sm"
                    >
                      {qual}
                      <button
                        type="button"
                        onClick={() => removeQualification(qual)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Skills *</Label>
              <div className="flex gap-2">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                  placeholder="e.g., GST Filing, ITR Filing"
                />
                <Button type="button" onClick={addSkill} variant="outline">
                  Add
                </Button>
              </div>
              {formData.skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.skills.map((skill) => (
                    <div
                      key={skill}
                      className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-sm"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience">Experience (Years) *</Label>
              <Input
                id="experience"
                type="number"
                min="0"
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Locations *</Label>
              <div className="flex gap-2">
                <Input
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addLocation())}
                  placeholder="e.g., Mumbai, Maharashtra"
                />
                <Button type="button" onClick={addLocation} variant="outline">
                  Add
                </Button>
              </div>
              {formData.locations.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.locations.map((loc) => (
                    <div
                      key={loc}
                      className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-sm"
                    >
                      {loc}
                      <button
                        type="button"
                        onClick={() => removeLocation(loc)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={4}
                placeholder="Tell us about yourself..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Profile
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


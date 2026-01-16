/**
 * Professional Profile View Page
 */

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, Star, MapPin, Briefcase, Award, CheckCircle2, Mail, Phone, Globe } from "lucide-react";
import { getProfessionalProfile } from "@/lib/professionals/firestore";
import { getProfessionalReviews } from "@/lib/tasks/firestore";
import type { ProfessionalProfile, TaskReview } from "@/lib/professionals/types";
import Link from "next/link";

export default function ProfessionalViewPage() {
  const params = useParams();
  const profileId = params.id as string;
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [reviews, setReviews] = useState<TaskReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfile();
    loadReviews();
  }, [profileId]);

  const loadProfile = async () => {
    try {
      const prof = await getProfessionalProfile(profileId);
      setProfile(prof);
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadReviews = async () => {
    try {
      const revs = await getProfessionalReviews(profileId);
      setReviews(revs);
    } catch (error) {
      console.error("Error loading reviews:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground py-8">
              Professional profile not found
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const initials = profile.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-pink-100 text-pink-700 text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold">{profile.fullName}</h1>
                {profile.isVerified && (
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                )}
              </div>
              {profile.firmName && (
                <p className="text-lg text-muted-foreground mb-2">
                  {profile.firmName}
                </p>
              )}
              {profile.rating && profile.rating > 0 && (
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{profile.rating.toFixed(1)}</span>
                  {profile.totalReviews && (
                    <span className="text-muted-foreground">
                      ({profile.totalReviews} reviews)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile.bio && (
            <div>
              <h3 className="font-semibold mb-2">About</h3>
              <p className="text-muted-foreground">{profile.bio}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-muted-foreground" />
              <span>{profile.experience} years experience</span>
            </div>
            {profile.locations && profile.locations.length > 0 && (
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  {profile.locations.map((loc, idx) => (
                    <div key={idx}>{loc}</div>
                  ))}
                </div>
              </div>
            )}
            {profile.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <a href={`mailto:${profile.email}`} className="text-blue-600 hover:underline">
                  {profile.email}
                </a>
              </div>
            )}
            {profile.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <a href={`tel:${profile.phone}`} className="text-blue-600 hover:underline">
                  {profile.phone}
                </a>
              </div>
            )}
            {profile.website && (
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Visit Website
                </a>
              </div>
            )}
          </div>

          {profile.qualifications && profile.qualifications.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Qualifications</h3>
              <div className="flex flex-wrap gap-2">
                {profile.qualifications.map((qual, idx) => (
                  <Badge key={idx} variant="secondary">
                    <Award className="h-3 w-3 mr-1" />
                    {qual}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {profile.skills && profile.skills.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill, idx) => (
                  <Badge key={idx} variant="outline">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {reviews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="border-b pb-4 last:border-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= review.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      by {review.reviewerName}
                    </span>
                  </div>
                  <p className="text-sm">{review.comment}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-6">
        <Link href="/tasks/browse">
          <Button>Browse Available Tasks</Button>
        </Link>
      </div>
    </div>
  );
}


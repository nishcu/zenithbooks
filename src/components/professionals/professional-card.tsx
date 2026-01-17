/**
 * Professional Card Component
 * Displays professional profile information
 */

"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, MapPin, Briefcase, Award, CheckCircle2 } from "lucide-react";
import type { ProfessionalProfile } from "@/lib/professionals/types";

interface ProfessionalCardProps {
  professional: ProfessionalProfile;
}

export function ProfessionalCard({ professional }: ProfessionalCardProps) {
  const initials = professional.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Link href={`/professionals/view/${professional.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-pink-100 text-pink-700">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base truncate">
                  {professional.fullName}
                </h3>
                {professional.isVerified && (
                  <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                )}
              </div>
              {professional.firmName && (
                <p className="text-sm text-muted-foreground truncate">
                  {professional.firmName}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Verification Status - No public ratings for ICAI compliance */}
          {professional.isVerified && (
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="text-xs">
                Verified Professional
              </Badge>
            </div>
          )}

          {/* Experience */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Briefcase className="h-4 w-4" />
            <span>{professional.experience} years experience</span>
          </div>

          {/* Location */}
          {professional.locations && professional.locations.length > 0 && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">
                {professional.locations.slice(0, 2).join(", ")}
                {professional.locations.length > 2 && "..."}
              </span>
            </div>
          )}

          {/* Qualifications */}
          {professional.qualifications && professional.qualifications.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {professional.qualifications.slice(0, 2).map((qual, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  <Award className="h-3 w-3 mr-1" />
                  {qual}
                </Badge>
              ))}
              {professional.qualifications.length > 2 && (
                <Badge variant="secondary" className="text-xs">
                  +{professional.qualifications.length - 2} more
                </Badge>
              )}
            </div>
          )}

          {/* Skills */}
          {professional.skills && professional.skills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {professional.skills.slice(0, 3).map((skill, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {professional.skills.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{professional.skills.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}


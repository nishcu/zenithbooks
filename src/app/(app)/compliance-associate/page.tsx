"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Users, TrendingUp, Shield, GraduationCap, Briefcase, IndianRupee, Clock, Award, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function ComplianceAssociatePage() {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    qualification: "",
    experience: "",
    currentRole: "",
    whyJoin: "",
    availability: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please sign in to apply as a Zenith Corporate Mitra",
      });
      router.push("/login");
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement form submission to Firestore
      // For now, just show success message
      toast({
        title: "Application Submitted!",
        description: "We'll review your application and get back to you soon.",
      });
      
      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        qualification: "",
        experience: "",
        currentRole: "",
        whyJoin: "",
        availability: "",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to submit application. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    {
      icon: IndianRupee,
      title: "Earn Competitive Compensation",
      description: "Get paid for handling GST, Income Tax, Payroll & MCA compliance for ZenithBooks clients",
    },
    {
      icon: Clock,
      title: "Flexible Work Hours",
      description: "Work on your own schedule while gaining valuable experience",
    },
    {
      icon: GraduationCap,
      title: "Learn & Grow",
      description: "Gain hands-on experience with real compliance cases and build your expertise",
    },
    {
      icon: Briefcase,
      title: "Build Your Profile",
      description: "Enhance your professional profile and grow your career in accounting and compliance",
    },
    {
      icon: Users,
      title: "Work with Experts",
      description: "Collaborate with experienced professionals and learn from the best",
    },
    {
      icon: Award,
      title: "Recognition",
      description: "Get recognized for your work and build a strong professional reputation",
    },
  ];

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 max-w-6xl">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
            <Users className="h-8 w-8" />
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">Join as Zenith Corporate Mitra</h1>
        </div>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
          Perfect for Young CAs, Accountants & Students - Earn While You Learn
        </p>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl mx-auto">
          Zenith Corporate Mitra is an internal platform-defined role and not a government-authorized designation.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Benefits Section */}
        <div className="space-y-6">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-2xl">Why Join ZenithBooks Team?</CardTitle>
              <CardDescription>
                Build your career while earning competitive compensation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary mt-1">
                    <benefit.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-2 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                What You'll Do
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Handle GST filing and compliance for clients</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Process Income Tax returns and TDS filings</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Manage Payroll and PF/ESI compliance</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Handle MCA compliance and filings</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Work on real cases with expert guidance</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Application Form */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-2xl">Apply Now</CardTitle>
            <CardDescription>
              Fill out the form below to join our team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  placeholder="+91 9876543210"
                />
              </div>

              <div>
                <Label htmlFor="qualification">Qualification *</Label>
                <Input
                  id="qualification"
                  value={formData.qualification}
                  onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                  required
                  placeholder="e.g., CA, CMA, CS, B.Com, M.Com, etc."
                />
              </div>

              <div>
                <Label htmlFor="experience">Years of Experience *</Label>
                <Input
                  id="experience"
                  type="number"
                  min="0"
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  required
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="currentRole">Current Role / Status *</Label>
                <Input
                  id="currentRole"
                  value={formData.currentRole}
                  onChange={(e) => setFormData({ ...formData, currentRole: e.target.value })}
                  required
                  placeholder="e.g., CA Student, Junior Accountant, etc."
                />
              </div>

              <div>
                <Label htmlFor="availability">Availability (Hours per week) *</Label>
                <Input
                  id="availability"
                  type="number"
                  min="1"
                  max="40"
                  value={formData.availability}
                  onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                  required
                  placeholder="e.g., 20"
                />
              </div>

              <div>
                <Label htmlFor="whyJoin">Why do you want to join ZenithBooks? *</Label>
                <Textarea
                  id="whyJoin"
                  value={formData.whyJoin}
                  onChange={(e) => setFormData({ ...formData, whyJoin: e.target.value })}
                  required
                  placeholder="Tell us about your motivation and goals..."
                  rows={4}
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <span className="mr-2">Submitting...</span>
                  </>
                ) : (
                  <>
                    Submit Application
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              {!user && (
                <p className="text-sm text-muted-foreground text-center">
                  You need to be signed in to apply. <Button variant="link" className="p-0 h-auto" onClick={() => router.push("/login")}>Sign in here</Button>
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

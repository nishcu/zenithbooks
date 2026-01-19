/**
 * Create Knowledge Post Page
 * Separate page for creating knowledge posts (not a modal)
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { createKnowledgePost } from "@/lib/knowledge/firestore";
import { validateKnowledgeContent, shouldAutoFlagForReview } from "@/lib/knowledge/validation";
import { KNOWLEDGE_CATEGORIES, type KnowledgeCategory } from "@/lib/knowledge/types";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const formSchema = z.object({
  title: z.string().min(10, "Title must be at least 10 characters.").max(200, "Title must be less than 200 characters."),
  content: z.string().min(50, "Content must be at least 50 characters."),
  category: z.enum([
    "GST",
    "Income Tax",
    "Company Law",
    "TDS",
    "Labour Law",
    "Case Law",
    "Circular / Notification",
    "Templates & Checklists",
    "Others",
  ] as const),
  categoryOther: z.string().optional(),
  professionalName: z.string().min(2, "Professional Name is required.").max(100, "Name must be less than 100 characters."),
  firmName: z.string().min(2, "Firm Name is required.").max(200, "Firm name must be less than 200 characters."),
  qualification: z.string().min(2, "Qualification is required.").max(100, "Qualification must be less than 100 characters."),
  sourceReference: z.string().min(5, "Source reference is mandatory (e.g., Govt circular, Act, Case citation)."),
  complianceDeclarationAccepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the compliance declaration.",
  }),
}).refine((data) => {
  // If category is "Others", categoryOther must be provided
  if (data.category === "Others") {
    return data.categoryOther && data.categoryOther.trim().length >= 2;
  }
  return true;
}, {
  message: "Please specify the category name.",
  path: ["categoryOther"],
});

type FormData = z.infer<typeof formSchema>;

export default function CreateKnowledgePostPage() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check authorization (verified professionals only)
  useEffect(() => {
    const checkAuthorization = async () => {
      if (!user) {
        setIsAuthorized(false);
        setIsLoading(false);
        router.push("/login");
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) {
          setIsAuthorized(false);
          setIsLoading(false);
          toast({
            variant: "destructive",
            title: "Access Denied",
            description: "Knowledge Exchange is available only to verified professionals.",
          });
          router.push("/dashboard");
          return;
        }

        const userData = userDoc.data();
        const userType = userData?.userType;
        
        // Only professionals can access
        if (userType !== "professional") {
          setIsAuthorized(false);
          setIsLoading(false);
          toast({
            variant: "destructive",
            title: "Access Denied",
            description: "Knowledge Exchange is available only to verified professionals.",
          });
          router.push("/dashboard");
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error("Error checking authorization:", error);
        setIsAuthorized(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthorization();
  }, [user, router, toast]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      category: "GST",
      categoryOther: "",
      professionalName: "",
      firmName: "",
      qualification: "",
      sourceReference: "",
      complianceDeclarationAccepted: false,
    },
  });

  // Pre-populate CA Name, Firm Name, and Qualification from user profile
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user || !isAuthorized) return;

      try {
        // Try to get professional profile first
        try {
          const profileDoc = await getDoc(doc(db, "professionals_profiles", user.uid));
          if (profileDoc.exists()) {
            const profileData = profileDoc.data();
            form.setValue("professionalName", profileData?.fullName || "");
            form.setValue("firmName", profileData?.firmName || "");
            form.setValue("qualification", profileData?.qualification || "CA");
            return;
          }
        } catch (error) {
          // Profile not found, continue to user data
        }

        // Fallback to user document
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          form.setValue("professionalName", userData?.name || userData?.displayName || "");
          form.setValue("firmName", userData?.companyName || userData?.firmName || "");
          form.setValue("qualification", userData?.qualification || "CA");
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
      }
    };

    loadUserProfile();
  }, [user, isAuthorized, form]);

  const onSubmit = async (data: FormData) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please sign in to create a knowledge post.",
      });
      return;
    }

    // Content validation for promotional content
    const validation = validateKnowledgeContent(data.title, data.content);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      toast({
        variant: "destructive",
        title: "Content Validation Failed",
        description: validation.errors.join(", "),
      });
      return;
    }

    setIsSubmitting(true);
    setValidationErrors([]);

    try {
      // Get user details
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();
      
      // Use form data for author information (CA Name, Firm Name, Qualification)
      const postId = await createKnowledgePost({
        title: data.title.trim(),
        content: data.content.trim(),
        category: data.category as KnowledgeCategory,
        categoryOther: data.category === "Others" ? data.categoryOther?.trim() : undefined,
        authorId: user.uid,
        authorName: data.professionalName.trim(),
        authorFirmName: data.firmName.trim(),
        authorQualification: data.qualification.trim(),
        sourceReference: data.sourceReference.trim(),
        complianceDeclarationAccepted: data.complianceDeclarationAccepted,
      });

      toast({
        title: "Post Created",
        description: "Your post has been created. It will be reviewed before publication.",
      });

      form.reset();
      router.push("/knowledge");
    } catch (error: any) {
      console.error("Error creating post:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create knowledge post.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Real-time validation
  const handleContentChange = (field: "title" | "content", value: string) => {
    form.setValue(field, value);
    
    const title = field === "title" ? value : form.getValues("title");
    const content = field === "content" ? value : form.getValues("content");
    
    if (title && content && title.length > 10 && content.length > 50) {
      const validation = validateKnowledgeContent(title, content);
      setValidationErrors(validation.errors);
    } else {
      setValidationErrors([]);
    }
  };

  // Watch form values for button disable logic
  const title = form.watch("title");
  const sourceReference = form.watch("sourceReference");
  const complianceAccepted = form.watch("complianceDeclarationAccepted");
  const category = form.watch("category");
  const categoryOther = form.watch("categoryOther");
  const professionalName = form.watch("professionalName");
  const firmName = form.watch("firmName");
  const qualification = form.watch("qualification");
  
  const isFormValid = 
    title.length >= 10 && 
    title.length <= 200 &&
    professionalName.length >= 2 &&
    firmName.length >= 2 &&
    qualification.length >= 2 &&
    sourceReference.length >= 5 &&
    complianceAccepted &&
    category &&
    (category !== "Others" || (categoryOther && categoryOther.trim().length >= 2)) &&
    validationErrors.length === 0;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null; // Already redirected
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/knowledge" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Knowledge Exchange
        </Link>
        <h1 className="text-3xl font-bold mb-2">Share Knowledge</h1>
        <p className="text-muted-foreground">
          Share educational content for professional awareness. All content must comply with ICAI guidelines.
        </p>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Create Knowledge Post</CardTitle>
          <CardDescription>
            Fill in the details below to share educational content with the professional community.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-6">
                {/* SECTION 1: Knowledge Content */}
                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-800">Knowledge Content</h3>
                  
                  {/* Category */}
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Category *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {KNOWLEDGE_CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Category Other - Show only if "Others" is selected */}
                  {category === "Others" && (
                    <FormField
                      control={form.control}
                      name="categoryOther"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Specify Category *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Please mention the category name"
                              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                              {...field}
                            />
                          </FormControl>
                          <p className="text-xs text-gray-500 mt-1">
                            Please specify the category name for this knowledge post
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Title */}
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Title *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter a clear, descriptive title"
                            className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                            {...field}
                            onChange={(e) => handleContentChange("title", e.target.value)}
                          />
                        </FormControl>
                        <div className="flex justify-end mt-1">
                          <span className="text-xs text-gray-400">
                            {field.value.length}/200 characters
                          </span>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Content */}
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Content *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter educational content. Avoid promotional language, contact information, or pricing."
                            className="w-full min-h-[160px] resize-y text-sm px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                            {...field}
                            onChange={(e) => handleContentChange("content", e.target.value)}
                          />
                        </FormControl>
                        <div className="flex justify-end mt-1">
                          <span className="text-xs text-gray-400">
                            {field.value.length} characters
                          </span>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </section>

                <hr className="border-gray-200" />

                {/* SECTION 2: Author Information */}
                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-800">Author Information</h3>
                  
                  {/* Professional Name */}
                  <FormField
                    control={form.control}
                    name="professionalName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Name of the Professional *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your full name"
                            className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Firm Name */}
                  <FormField
                    control={form.control}
                    name="firmName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Firm Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your firm name"
                            className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Qualification */}
                  <FormField
                    control={form.control}
                    name="qualification"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Qualification *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., CA, CMA, CS, etc."
                            className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                            {...field}
                          />
                        </FormControl>
                        <p className="text-xs text-gray-500 mt-1">
                          Your professional qualification (e.g., CA, CMA, CS)
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </section>

                <hr className="border-gray-200" />

                {/* SECTION 3: Source Reference */}
                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-800">Source Reference</h3>
                  
                  <FormField
                    control={form.control}
                    name="sourceReference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Source Reference (Mandatory) *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Circular No. 123/2024, Section 43B of Income Tax Act, Supreme Court Case XYZ vs ABC"
                            className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                            {...field}
                          />
                        </FormControl>
                        <p className="text-xs text-gray-500 mt-1">
                          Mandatory: Government circular, Act section, notification, or court case citation
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </section>

                <hr className="border-gray-200" />

                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="mt-2">
                      <strong className="text-sm font-semibold">Content Issues Detected:</strong>
                      <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                        {validationErrors.map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                      <p className="mt-3 text-sm font-medium">
                        Please remove promotional content, contact information, or pricing terms.
                      </p>
                    </AlertDescription>
                  </Alert>
                )}

                {/* SECTION 3: Compliance Declaration */}
                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-800">Compliance Declaration</h3>
                  
                  <FormField
                    control={form.control}
                    name="complianceDeclarationAccepted"
                    render={({ field }) => (
                      <FormItem>
                        <div className="rounded-md border border-gray-200 bg-gray-50 p-4 flex items-start gap-3">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 [&>svg]:h-3 [&>svg]:w-3"
                            />
                          </FormControl>
                          <p className="text-xs text-gray-700 leading-relaxed flex-1">
                            I confirm this content is purely educational, non-promotional, and does not solicit
                            professional work, pricing, or contact information, as per ICAI guidelines.
                          </p>
                        </div>
                        <FormMessage className="ml-6 mt-1.5" />
                      </FormItem>
                    )}
                  />
                </section>
              </div>

              {/* Footer Buttons */}
              <div className="border-t border-gray-200 pt-6 mt-6 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset();
                    setValidationErrors([]);
                    router.push("/knowledge");
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || !isFormValid}
                  className="min-w-[120px]"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? "Creating..." : "Create Post"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Compliance Notice */}
      <div className="mt-6 p-4 bg-muted rounded-lg border">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>ICAI Compliance:</strong> ZenithBooks Knowledge Exchange is an educational, non-commercial feature
          intended solely for professional awareness and compliance updates. No solicitation or professional marketing is permitted.
        </p>
      </div>
    </div>
  );
}


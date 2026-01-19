/**
 * Create Knowledge Post Modal
 * ICAI-Compliant: Includes mandatory compliance declaration and content validation
 */

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Loader2, AlertCircle, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { createKnowledgePost } from "@/lib/knowledge/firestore";
import { validateKnowledgeContent, shouldAutoFlagForReview } from "@/lib/knowledge/validation";
import { KNOWLEDGE_CATEGORIES, type KnowledgeCategory } from "@/lib/knowledge/types";

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
  ] as const),
  sourceReference: z.string().min(5, "Source reference is mandatory (e.g., Govt circular, Act, Case citation)."),
  complianceDeclarationAccepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the compliance declaration.",
  }),
});

type FormData = z.infer<typeof formSchema>;

interface CreateKnowledgePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostCreated?: () => void;
}

export function CreateKnowledgePostModal({
  open,
  onOpenChange,
  onPostCreated,
}: CreateKnowledgePostModalProps) {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      category: "GST",
      sourceReference: "",
      complianceDeclarationAccepted: false,
    },
  });

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

    // Check if should be auto-flagged
    const shouldFlag = shouldAutoFlagForReview(data.title, data.content, data.sourceReference);
    
    setIsSubmitting(true);
    setValidationErrors([]);

    try {
      // Get user details
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();
      
      // Get professional profile if exists
      let authorName = userData?.name || userData?.displayName || "";
      let authorFirmName = userData?.companyName || userData?.firmName || "";

      try {
        const profileDoc = await getDoc(doc(db, "professionals_profiles", user.uid));
        if (profileDoc.exists()) {
          const profileData = profileDoc.data();
          authorName = profileData?.fullName || authorName;
          authorFirmName = profileData?.firmName || authorFirmName;
        }
      } catch (error) {
        // Profile not found, use user data
      }

      // Create post
      const postId = await createKnowledgePost({
        title: data.title.trim(),
        content: data.content.trim(),
        category: data.category as KnowledgeCategory,
        authorId: user.uid,
        authorName,
        authorFirmName,
        sourceReference: data.sourceReference.trim(),
        complianceDeclarationAccepted: data.complianceDeclarationAccepted,
      });

      toast({
        title: "Post Created",
        description: "Your post has been created. It will be reviewed before publication.",
      });

      form.reset();
      onOpenChange(false);
      
      if (onPostCreated) {
        onPostCreated();
      }
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
  
  const isFormValid = 
    title.length >= 10 && 
    title.length <= 200 &&
    sourceReference.length >= 5 &&
    complianceAccepted &&
    category &&
    validationErrors.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[720px] max-h-[90vh] overflow-y-auto p-8">
        <DialogHeader className="pb-5 mb-0">
          <DialogTitle className="text-2xl font-semibold">Share Knowledge</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-muted-foreground">
            Share educational content for professional awareness. All content must comply with ICAI guidelines.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
            {/* Section 1: Post Content */}
            <div className="space-y-5">
              <h3 className="text-sm font-medium text-foreground mb-4">Post Content</h3>
              
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
                        className="h-10"
                        {...field}
                        onChange={(e) => handleContentChange("title", e.target.value)}
                      />
                    </FormControl>
                    <div className="flex justify-end">
                      <span className="text-xs text-muted-foreground mt-1">
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
                        className="min-h-[160px] resize-y"
                        {...field}
                        onChange={(e) => handleContentChange("content", e.target.value)}
                      />
                    </FormControl>
                    <div className="flex justify-end">
                      <span className="text-xs text-muted-foreground mt-1">
                        {field.value.length} characters
                      </span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Divider */}
            <div className="border-t border-border"></div>

            {/* Section 2: Source Reference */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="sourceReference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Source Reference (Mandatory) *</FormLabel>
                    <FormDescription className="text-xs text-muted-foreground mt-1 mb-2">
                      Government circular, Act section, notification, or court case citation
                    </FormDescription>
                    <FormControl>
                      <Input
                        placeholder="e.g., Circular No. 123/2024, Section 43B of Income Tax Act, Supreme Court Case XYZ vs ABC"
                        className="h-10"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Divider */}
            <div className="border-t border-border"></div>

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

            {/* Section 3: Compliance Declaration */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="complianceDeclarationAccepted"
                render={({ field }) => (
                  <FormItem>
                    <div className="rounded-lg border border-border bg-muted/30 p-4">
                      <div className="flex items-start space-x-3">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="mt-0.5"
                          />
                        </FormControl>
                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <FormLabel className="text-sm font-medium cursor-pointer m-0 leading-normal">
                              Compliance Declaration *
                            </FormLabel>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <p className="text-xs">
                                    This declaration is required per ICAI guidelines to ensure all shared content 
                                    is educational and non-promotional in nature.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <FormDescription className="text-xs text-muted-foreground leading-relaxed m-0">
                            I confirm this content is educational, non-promotional, and does not solicit professional work,
                            as per ICAI guidelines. I understand that promotional content, contact information, or pricing
                            terms are prohibited.
                          </FormDescription>
                        </div>
                      </div>
                    </div>
                    <FormMessage className="ml-7 mt-1.5" />
                  </FormItem>
                )}
              />
            </div>

            {/* Submission Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  setValidationErrors([]);
                  onOpenChange(false);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !isFormValid}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Post
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


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
import { Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share Knowledge</DialogTitle>
          <DialogDescription>
            Share educational content for professional awareness. All content must comply with ICAI guidelines.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
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
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter a clear, descriptive title (10-200 characters)"
                      {...field}
                      onChange={(e) => handleContentChange("title", e.target.value)}
                    />
                  </FormControl>
                  <FormDescription>
                    {field.value.length}/200 characters
                  </FormDescription>
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
                  <FormLabel>Content *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter educational content (minimum 50 characters). Avoid promotional language, contact information, or pricing."
                      className="min-h-[200px]"
                      {...field}
                      onChange={(e) => handleContentChange("content", e.target.value)}
                    />
                  </FormControl>
                  <FormDescription>
                    {field.value.length} characters (minimum 50)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Source Reference */}
            <FormField
              control={form.control}
              name="sourceReference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source Reference *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Circular No. 123/2024, Section 43B of Income Tax Act, Supreme Court Case XYZ vs ABC"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Mandatory: Reference to government circular, Act, or case citation
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Content Issues Detected:</strong>
                  <ul className="list-disc list-inside mt-2">
                    {validationErrors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-sm">
                    Please remove promotional content, contact information, or pricing terms.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Compliance Declaration */}
            <FormField
              control={form.control}
              name="complianceDeclarationAccepted"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-normal">
                      Compliance Declaration *
                    </FormLabel>
                    <FormDescription className="text-xs">
                      I confirm this content is educational, non-promotional, and does not solicit professional work,
                      as per ICAI guidelines. I understand that promotional content, contact information, or pricing
                      terms are prohibited.
                    </FormDescription>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submission Buttons */}
            <div className="flex justify-end gap-2">
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
              <Button type="submit" disabled={isSubmitting || validationErrors.length > 0}>
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


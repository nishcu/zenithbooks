"use client";

import { useState, useRef, useEffect } from 'react';
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, FileText, ArrowLeft, PlusCircle, Trash2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { samplePosts } from "@/app/(app)/blog/page";

// Function to update a blog post in the samplePosts array
function updateSamplePost(postId: string, updatedData: any) {
    const postIndex = samplePosts.findIndex(post => post.id === postId);
    if (postIndex !== -1) {
        // Convert contentBlocks back to content array format
        const content = updatedData.contentBlocks
            .filter((block: any) => block.value.trim() !== '')
            .map((block: any) => block.value);

        // Update the post with new data
        samplePosts[postIndex] = {
            ...samplePosts[postIndex],
            title: updatedData.title,
            author: updatedData.authorName,
            authorTitle: updatedData.authorTitle,
            category: updatedData.category,
            content: content,
            // Handle image - if a new image was uploaded, use the data URL
            // Otherwise keep the existing imageUrl
            imageUrl: updatedData.imageDataUrl || samplePosts[postIndex].imageUrl,
            image: updatedData.imageDataUrl || samplePosts[postIndex].imageUrl,
        };
    }
}

const contentSchema = z.object({
  value: z.string().min(10, "Paragraph content must be at least 10 characters."),
});

const formSchema = z.object({
  title: z.string().min(5, "Title is required."),
  authorName: z.string().min(3, "Author name is required."),
  authorTitle: z.string().min(2, "Author title/experience is required."),
  category: z.string().min(2, "Category is required."),

  image: z.custom<File>((val) => val instanceof File, "Featured image is required.").optional(),

  contentBlocks: z.array(contentSchema).min(1, "At least one content paragraph is required."),
});

export default function EditBlogPostPage() {
    const params = useParams();
    const router = useRouter();
    const postId = params.id as string;
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    const imageInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            authorName: "",
            authorTitle: "",
            category: "",
            contentBlocks: [{ value: "" }],
        },
    });

    const { fields: contentFields, append: appendContent, remove: removeContent } = useFieldArray({
        control: form.control,
        name: "contentBlocks",
    });

    // Load existing blog post data
    useEffect(() => {
        const loadPost = async () => {
            try {
                // Find the post by ID from sample data
                const post = samplePosts.find(p => p.id === postId);

                if (!post) {
                    toast({
                        variant: "destructive",
                        title: "Post Not Found",
                        description: "The blog post you're trying to edit could not be found.",
                    });
                    router.push('/admin/blog');
                    return;
                }

                // Convert content array to contentBlocks format
                const contentBlocks = post.content.map(content => ({ value: content }));

                // Set form data
                form.reset({
                    title: post.title,
                    authorName: post.author,
                    authorTitle: post.authorTitle || "",
                    category: post.category,
                    contentBlocks: contentBlocks.length > 0 ? contentBlocks : [{ value: "" }],
                });

                // Set image preview if available
                setImagePreview(post.image);

            } catch (error) {
                console.error('Error loading post:', error);
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to load the blog post.",
                });
                router.push('/admin/blog');
            } finally {
                setIsLoading(false);
            }
        };

        if (postId) {
            loadPost();
        }
    }, [postId, form, router, toast]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            form.setValue("image", file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsSaving(true);
        try {
            // Prepare the data for saving
            const postData = {
                title: values.title,
                authorName: values.authorName,
                authorTitle: values.authorTitle,
                category: values.category,
                contentBlocks: values.contentBlocks,
                // If a new image was uploaded, use the data URL, otherwise keep existing
                imageDataUrl: values.image ? imagePreview : undefined,
            };

            // Update the blog post in the samplePosts array
            updateSamplePost(postId, postData);

            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1500));

            toast({
                title: "Blog Post Updated!",
                description: `"${values.title}" has been successfully updated.`,
            });

            // Navigate back to blog list
            router.push('/admin/blog');

        } catch (error) {
            console.error('Error updating post:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to update the blog post. Please try again.",
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading blog post...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-4xl mx-auto p-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/blog">
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold">Edit Blog Post</h1>
                    <p className="text-muted-foreground">
                        Update your blog post content and settings.
                    </p>
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Blog Post Details</CardTitle>
                            <CardDescription>
                                Edit the basic information for your blog post.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Title</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter blog post title" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="authorName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Author Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g., John Doe" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="category"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Category</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g., Accounting, GST, Finance" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="authorTitle"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Author Title/Experience</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., Chartered Accountant, 10+ years experience" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Featured Image</CardTitle>
                            <CardDescription>
                                Upload a high-quality image for your blog post (optional update).
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-32 h-24 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center bg-muted/50 overflow-hidden">
                                        {imagePreview ? (
                                            <Image
                                                src={imagePreview}
                                                alt="Preview"
                                                width={128}
                                                height={96}
                                                className="object-cover w-full h-full"
                                            />
                                        ) : (
                                            <div className="text-center text-muted-foreground text-sm">
                                                <Upload className="h-6 w-6 mx-auto mb-1" />
                                                Preview
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => imageInputRef.current?.click()}
                                            className="w-full"
                                        >
                                            <Upload className="mr-2 h-4 w-4" />
                                            {imagePreview ? 'Change Image' : 'Upload Image'}
                                        </Button>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Recommended: 1200x630px, JPG or PNG format.
                                        </p>
                                    </div>
                                </div>
                                <Input
                                    ref={imageInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageChange}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Content</CardTitle>
                            <CardDescription>
                                Write or edit your blog post content. Each block represents a paragraph.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {contentFields.map((field, index) => (
                                <div key={field.id} className="flex gap-2 items-start">
                                    <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold mt-2">
                                        {index + 1}
                                    </div>
                                    <FormField
                                        control={form.control}
                                        name={`contentBlocks.${index}.value`}
                                        render={({ field }) => (
                                            <FormItem className="flex-1">
                                                <FormControl>
                                                    <Textarea
                                                        placeholder={`Enter paragraph ${index + 1}...`}
                                                        className="min-h-[120px]"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeContent(index)}
                                        disabled={contentFields.length === 1}
                                        className="mt-2"
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => appendContent({ value: "" })}
                                className="w-full"
                            >
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Paragraph
                            </Button>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={isSaving} className="w-full">
                                {isSaving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Updating Post...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Update Blog Post
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
            </Form>
        </div>
    );
}

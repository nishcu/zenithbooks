
"use client";

import { useState, useRef } from 'react';
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

const contentSchema = z.object({
  value: z.string().min(10, "Paragraph content must be at least 10 characters."),
});

const formSchema = z.object({
  title: z.string().min(5, "Title is required."),
  authorName: z.string().min(3, "Author name is required."),
  authorTitle: z.string().min(2, "Author title/experience is required."),
  category: z.string().min(2, "Category is required."),
  
  image: z.custom<File>((val) => val instanceof File, "Featured image is required."),

  contentBlocks: z.array(contentSchema).min(1, "At least one content paragraph is required."),
});

export default function NewBlogPostPage() {
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const { toast } = useToast();
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [isLoading, setIsLoading] = useState(false);

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

    const { fields, append, remove } = useFieldArray({
      control: form.control,
      name: "contentBlocks",
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            form.setValue("image", file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        console.log(values);
        // Simulate API call to save blog post
        setTimeout(() => {
            setIsLoading(false);
            toast({
                title: "Blog Post Published!",
                description: "Your new blog post is now live.",
            });
            form.reset();
            setImagePreview(null);
        }, 1500);
    }

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
             <Link href="/admin/blog" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                <ArrowLeft className="size-4" />
                Back to Blog Management
            </Link>
            <div className="text-center">
                <h1 className="text-3xl font-bold">Create New Blog Post</h1>
                <p className="mt-2 max-w-2xl text-muted-foreground">
                    Fill in the details below to create and publish a new article for the blog.
                </p>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Post Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField control={form.control} name="title" render={({ field }) => ( <FormItem><FormLabel>Blog Post Title</FormLabel><FormControl><Input placeholder="e.g., Understanding Input Tax Credit (ITC)" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                             <div className="grid md:grid-cols-3 gap-4">
                                <FormField control={form.control} name="authorName" render={({ field }) => ( <FormItem><FormLabel>Author Name</FormLabel><FormControl><Input placeholder="e.g., Priya Mehta" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField control={form.control} name="authorTitle" render={({ field }) => ( <FormItem><FormLabel>Author Title/Experience</FormLabel><FormControl><Input placeholder="e.g., CA, Tax Expert" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField control={form.control} name="category" render={({ field }) => ( <FormItem><FormLabel>Category</FormLabel><FormControl><Input placeholder="e.g., GST" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Featured Image</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <FormField
                                control={form.control}
                                name="image"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <div 
                                                className="relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/75"
                                                onClick={() => imageInputRef.current?.click()}
                                            >
                                                {imagePreview ? (
                                                    <Image src={imagePreview} alt="Featured Image Preview" fill className="object-contain p-2 rounded-lg" />
                                                ) : (
                                                     <div className="text-center text-muted-foreground">
                                                        <Upload className="mx-auto h-8 w-8" />
                                                        <p className="mt-2 text-sm">Click to upload a featured image</p>
                                                        <p className="text-xs">Recommended size: 600x400</p>
                                                    </div>
                                                )}
                                            </div>
                                        </FormControl>
                                        <Input 
                                            ref={imageInputRef}
                                            type="file" 
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Blog Content</CardTitle>
                             <CardDescription>Add paragraphs for your blog content. Each box represents a new paragraph.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {fields.map((field, index) => (
                                <div key={field.id} className="flex items-start gap-2">
                                     <FormField
                                        control={form.control}
                                        name={`contentBlocks.${index}.value`}
                                        render={({ field }) => (
                                            <FormItem className="flex-1">
                                                <FormLabel className="sr-only">Paragraph {index + 1}</FormLabel>
                                                <FormControl><Textarea className="min-h-24" placeholder={`Paragraph ${index + 1}...`} {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="mt-7"
                                        onClick={() => remove(index)}
                                        disabled={fields.length <= 1}
                                    >
                                        <Trash2 className="size-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                             <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => append({ value: "" })}
                            >
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Paragraph
                            </Button>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2"/>}
                                Publish Post
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
            </Form>
        </div>
    );
}

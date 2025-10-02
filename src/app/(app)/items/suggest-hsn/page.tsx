
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Wand2, ArrowLeft } from "lucide-react";
import { suggestHsnCodeAction } from "./actions";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  description: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
});

type SuggestionResult = {
  hsnCode: string;
  confidence?: number;
};

export default function SuggestHsnPage() {
  const [result, setResult] = useState<SuggestionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setResult(null);
    try {
      const response = await suggestHsnCodeAction({
        productOrServiceDescription: values.description,
      });
      if (response?.hsnCode) {
        setResult(response);
        toast({ title: "HSN Code Suggestion Received!"});
      } else {
        toast({
          variant: "destructive",
          title: "Suggestion Failed",
          description: "Failed to get a suggestion. The AI model might be unavailable. Please try again later.",
        });
      }
    } catch (e) {
      toast({
        variant: "destructive",
        title: "An Error Occurred",
        description: "An unexpected error occurred. Please check the console and try again.",
      });
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-8">
       <Link href="/items" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            Back to Items
        </Link>
      <div className="flex flex-col items-center text-center">
        <div className="flex items-center justify-center size-16 rounded-full bg-primary/10 mb-4">
            <Wand2 className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">AI-Powered HSN Code Suggestion</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Describe your product or service, and our AI will suggest the most appropriate
          Harmonized System of Nomenclature (HSN) code. This helps ensure accurate GST classification and compliance.
        </p>
      </div>
      <Card className="max-w-3xl mx-auto w-full">
        <CardHeader>
          <CardTitle>Product/Service Description</CardTitle>
          <CardDescription>
            Provide a detailed description for the best results.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="sr-only">Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., 'Imported Italian leather office chairs with adjustable height and lumbar support'"
                          className="resize-none"
                          rows={5}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        The more detail you provide, the more accurate the HSN code suggestion will be.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Suggest HSN Code
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {result && (
        <Card className="max-w-3xl mx-auto w-full animate-in fade-in-50">
          <CardHeader>
            <CardTitle>Suggestion Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Suggested HSN Code</p>
              <p className="text-4xl font-bold font-code tracking-wider text-primary">{result.hsnCode}</p>
            </div>
            {result.confidence !== undefined && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Confidence Score</p>
                <div className="flex items-center gap-4 mt-1">
                  <Progress value={result.confidence * 100} className="w-full max-w-sm" />
                  <span className="font-semibold text-foreground">{(result.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

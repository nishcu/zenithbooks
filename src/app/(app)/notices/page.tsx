
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MailWarning, Upload, UserCheck, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { servicePricing } from "@/lib/on-demand-pricing";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Form, FormField, FormItem, FormControl, FormMessage, FormLabel } from "@/components/ui/form";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";


const noticeSchema = z.object({
  noticeType: z.string().min(1, "Please select a notice type."),
  noticeFile: z.custom<File>((val) => val instanceof File, "Notice document is required."),
  dueDate: z.date({ required_error: "A due date for the reply is required."}),
  description: z.string().optional(),
});

type NoticeFormData = z.infer<typeof noticeSchema>;


export default function NoticesPage() {
    const { toast } = useToast();
    const [user] = useAuthState(auth);

    const form = useForm<NoticeFormData>({
        resolver: zodResolver(noticeSchema),
        defaultValues: {
            noticeType: "GST_NOTICE",
        },
    });
    
    const selectedService = servicePricing.notice_handling.find(s => s.id === form.watch("noticeType"));
    const servicePrice = selectedService ? selectedService.price : 0;

    const handleSubmit = async (values: NoticeFormData) => {
        if (!user) {
            toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to submit a notice." });
            return;
        }

        try {
            // In a real app, you would upload the file to Firebase Storage first.
            // For this simulation, we'll just store the metadata.
            await addDoc(collection(db, "noticeRequests"), {
                userId: user.uid,
                noticeType: values.noticeType,
                fileName: values.noticeFile.name,
                fileType: values.noticeFile.type,
                dueDate: values.dueDate,
                description: values.description,
                status: "Pending Assignment",
                requestedAt: new Date(),
            });

            toast({
                title: "Request Submitted Successfully!",
                description: "Your notice has been sent to the admin panel. A professional will be assigned shortly and will get in touch with you.",
            });
            form.reset();
        } catch (error) {
            console.error("Error submitting notice request: ", error);
            toast({ variant: "destructive", title: "Submission Failed", description: "There was a problem submitting your request."});
        }
    }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
       <div className="text-center">
            <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
                <MailWarning /> Submit a Notice for Professional Opinion
            </h1>
            <p className="text-muted-foreground mt-2">
                Upload your departmental notice, and our team of experts will handle the rest.
            </p>
        </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
            <Card>
                <CardHeader>
                    <CardTitle>Submit Your Notice</CardTitle>
                    <CardDescription>Provide the notice details to request a professional consultation and drafted response.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="noticeType" render={({ field }) => (
                             <FormItem><FormLabel>Notice From</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {servicePricing.notice_handling.map(service => (
                                            <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                             <FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="noticeFile" render={({ field: { onChange, value, ...rest } }) => (
                            <FormItem><FormLabel>Upload Notice Document (PDF/Image)</FormLabel>
                                <FormControl><Input type="file" onChange={(e) => onChange(e.target.files?.[0])} {...rest} /></FormControl>
                            <FormMessage /></FormItem>
                        )}/>
                    </div>
                    <FormField control={form.control} name="dueDate" render={({ field }) => (
                        <FormItem><FormLabel>Due Date for Reply</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {field.value ? format(field.value, "PPP") : <span>Pick a due date</span>}
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                            </Popover>
                        <FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="description" render={({ field }) => (
                         <FormItem><FormLabel>Brief Description of Case (Optional)</FormLabel>
                            <FormControl><Textarea placeholder="Provide some background about the notice or your business context..." className="min-h-24" {...field} /></FormControl>
                         <FormMessage /></FormItem>
                    )}/>
                </CardContent>
                <CardFooter className="flex-col items-start gap-4">
                    <Button type="submit" size="lg">
                        <Send className="mr-2" />
                        Request Professional Opinion
                        {servicePrice > 0 && <span className="ml-2 font-semibold">(Starts at ₹{servicePrice})</span>}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                        By submitting, you agree to our terms of service. A professional will contact you to confirm the final scope and fees before proceeding.
                    </p>
                </CardFooter>
            </Card>
        </form>
      </Form>
    </div>
  );
}


"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSearchParams } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";
import { Form, FormField, FormItem, FormControl, FormMessage, FormLabel } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarIcon, Send } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const serviceAreas = [
    { value: "gst_registration", label: "GST Registration" },
    { value: "startup_registration", label: "Start-Up Registration" },
    { value: "pvt_incorporation", label: "PVT Incorporation" },
    { value: "opc_incorporation", label: "OPC Incorporation" },
    { value: "llp_registration", label: "LLP Registration" },
    { value: "partnership_registration", label: "Partnership Registration" },
    { value: "itr_filing", label: "ITR Filing" },
    { value: "society_registration", label: "Society Registration" },
    { value: "gstr_filings", label: "GSTR Filings" },
    { value: "gst_notices", label: "GST Notices" },
    { value: "income_tax_notices", label: "Income Tax Notices" },
    { value: "mca_compliance", label: "MCA Compliance" },
    { value: "mca_monthly_retainership", label: "MCA Monthly Retainership" },
    { value: "virtual_cfo", label: "Virtual CFO" },
    { value: "book_keeping", label: "Book Keeping" },
    { value: "payroll_accounting", label: "Payroll Accounting" },
    { value: "others", label: "Others" },
];


const formSchema = z.object({
  serviceArea: z.string().min(1, "Please select a service area."),
  otherServiceDescription: z.string().optional(),
  consultationMode: z.string().min(1, "Please select a consultation mode."),
  preferredDate: z.date({ required_error: "A preferred date is required." }),
  preferredTime: z.string().min(1, "Please select a time slot."),
  fullName: z.string().min(3, "Full name is required."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().min(10, "Please enter a valid phone number."),
  queryDescription: z.string().min(10, "Please provide a brief description."),
}).refine(data => {
    if (data.serviceArea === 'others' && (!data.otherServiceDescription || data.otherServiceDescription.length < 10)) {
        return false;
    }
    return true;
}, {
    message: "Please describe the other service you require (min. 10 characters).",
    path: ["otherServiceDescription"],
});

type FormData = z.infer<typeof formSchema>;

function BookAppointmentForm() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const proName = searchParams.get('proName');
  const proType = searchParams.get('proType');
  const service = searchParams.get('service');


  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serviceArea: service || "",
      otherServiceDescription: "",
      consultationMode: "",
      preferredTime: "",
      fullName: "",
      email: "",
      phone: "",
      queryDescription: "",
    },
  });

  useEffect(() => {
    if(service) {
      form.setValue("serviceArea", service);
    }
  }, [service, form]);

  const watchServiceArea = form.watch("serviceArea");

  function onSubmit(values: FormData) {
    console.log(values);
    toast({
      title: "Request Submitted!",
      description: "Our team will get in touch with you shortly to confirm your appointment.",
    });
    form.reset();
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Book an Appointment</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {proName ? `You are booking an appointment with ${decodeURIComponent(proName)}.` : "Schedule a consultation with a qualified professional."}
        </p>
      </div>

      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>Consultation Details</CardTitle>
              <CardDescription>
                Help us understand your needs so we can connect you with the right expert.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="serviceArea"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Area</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select a service" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {serviceAreas.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="consultationMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Consultation Mode</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select a mode" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="phone">Phone Call</SelectItem>
                          <SelectItem value="video">Video Call (Google Meet)</SelectItem>
                          <SelectItem value="in-person">In-Person Meeting</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

               {watchServiceArea === 'others' && (
                <FormField
                  control={form.control}
                  name="otherServiceDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Please Describe the Service You Need</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe the specific service or consultation you are looking for..." className="min-h-24" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}


              <div className="grid sm:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="preferredDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Preferred Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="preferredTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Time Slot</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select a time" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="10am-12pm">10:00 AM - 12:00 PM</SelectItem>
                          <SelectItem value="12pm-2pm">12:00 PM - 02:00 PM</SelectItem>
                          <SelectItem value="2pm-4pm">02:00 PM - 04:00 PM</SelectItem>
                          <SelectItem value="4pm-6pm">04:00 PM - 06:00 PM</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <FormField control={form.control} name="fullName" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>

              <FormField
                control={form.control}
                name="queryDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Briefly Describe Your Query</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Please provide some context for your consultation..." className="min-h-24" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit">
                <Send className="mr-2" />
                Submit Request
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}

export default function BookAppointmentPage() {
    return (
        <React.Suspense fallback={<div>Loading...</div>}>
            <BookAppointmentForm />
        </React.Suspense>
    )
}

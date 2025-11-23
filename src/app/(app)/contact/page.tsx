
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, MapPin, Send, Linkedin, Twitter, Facebook, Instagram } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, "Name is required."),
  email: z.string().email("A valid email is required."),
  subject: z.string().min(5, "Subject is required."),
  message: z.string().min(10, "Message must be at least 10 characters."),
});

export default function ContactPage() {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", email: "", subject: "", message: "" },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    toast({
      title: "Message Sent!",
      description: "Thank you for reaching out. Our team will get back to you shortly.",
    });
    form.reset();
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Contact Us</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          We'd love to hear from you. Whether you have a question about features, trials, pricing, or anything else, our team is ready to answer all your questions.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Legal & Business Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Legal Business Name</h3>
                <p className="text-muted-foreground font-medium">NAGA SRUTHI PULLURU</p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Merchant Legal Entity Name</h3>
                <p className="text-muted-foreground">zenithbooks</p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Registered Address</h3>
                <p className="text-muted-foreground">Block D 1805 IndisoneCity, Hyderabad, Telangana, PIN: 500081</p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Operational Address</h3>
                <p className="text-muted-foreground">Block D 1805 IndisoneCity, Hyderabad, Telangana, PIN: 500081</p>
              </div>
              <div className="flex items-start gap-4">
                <Phone className="text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">Telephone No</h3>
                  <p className="text-muted-foreground">7396059393</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Mail className="text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">E-Mail ID</h3>
                  <p className="text-muted-foreground">kranthisuryadevara25@gmail.com</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Terms & Conditions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>Last updated on 23-11-2025 21:56:49</strong></p>
                <p>These Terms and Conditions, along with privacy policy or other terms ("Terms") constitute a binding agreement by and between zenithbooks, ("Website Owner" or "we" or "us" or "our") and you ("you" or "your") and relate to your use of our website, goods (as applicable) or services (as applicable) (collectively, "Services").</p>
                <p>By using our website and availing the Services, you agree that you have read and accepted these Terms (including the Privacy Policy). We reserve the right to modify these Terms at any time and without assigning any reason. It is your responsibility to periodically review these Terms to stay informed of updates.</p>
                <p>The use of this website or availing of our Services is subject to the following terms of use:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>To access and use the Services, you agree to provide true, accurate and complete information to us during and after registration, and you shall be responsible for all acts done through the use of your registered account.</li>
                  <li>Neither we nor any third parties provide any warranty or guarantee as to the accuracy, timeliness, performance, completeness or suitability of the information and materials offered on this website or through the Services, for any specific purpose. You acknowledge that such information and materials may contain inaccuracies or errors and we expressly exclude liability for any such inaccuracies or errors to the fullest extent permitted by law.</li>
                  <li>Your use of our Services and the website is solely at your own risk and discretion. You are required to independently assess and ensure that the Services meet your requirements.</li>
                  <li>The contents of the Website and the Services are proprietary to Us and you will not have any authority to claim any intellectual property rights, title, or interest in its contents.</li>
                  <li>You acknowledge that unauthorized use of the Website or the Services may lead to action against you as per these Terms or applicable laws.</li>
                  <li>You agree to pay us the charges associated with availing the Services.</li>
                  <li>You agree not to use the website and/ or Services for any purpose that is unlawful, illegal or forbidden by these Terms, or Indian or local laws that might apply to you.</li>
                  <li>You agree and acknowledge that website and the Services may contain links to other third party websites. On accessing these links, you will be governed by the terms of use, privacy policy and such other policies of such third party websites.</li>
                  <li>You understand that upon initiating a transaction for availing the Services you are entering into a legally binding and enforceable contract with the us for the Services.</li>
                  <li>You shall be entitled to claim a refund of the payment made by you in case we are not able to provide the Service. The timelines for such return and refund will be according to the specific Service you have availed or within the time period provided in our policies (as applicable). In case you do not raise a refund claim within the stipulated time, than this would make you ineligible for a refund.</li>
                  <li>Notwithstanding anything contained in these Terms, the parties shall not be liable for any failure to perform an obligation under these Terms if performance is prevented or delayed by a force majeure event.</li>
                  <li>These Terms and any dispute or claim relating to it, or its enforceability, shall be governed by and construed in accordance with the laws of India.</li>
                  <li>All disputes arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts in Hyderabad, Telangana</li>
                  <li>All concerns or communications relating to these Terms must be communicated to us using the contact information provided on this website.</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cancellation & Refund Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>Last updated on 23-11-2025 21:57:16</strong></p>
                <p>zenithbooks believes in helping its customers as far as possible, and has therefore a liberal cancellation policy. Under this policy:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Cancellations will be considered only if the request is made immediately after placing the order. However, the cancellation request may not be entertained if the orders have been communicated to the vendors/merchants and they have initiated the process of shipping them.</li>
                  <li>zenithbooks does not accept cancellation requests for perishable items like flowers, eatables etc. However, refund/replacement can be made if the customer establishes that the quality of product delivered is not good.</li>
                  <li>In case of receipt of damaged or defective items please report the same to our Customer Service team. The request will, however, be entertained once the merchant has checked and determined the same at his own end. This should be reported within 2 Days days of receipt of the products. In case you feel that the product received is not as shown on the site or as per your expectations, you must bring it to the notice of our customer service within 2 Days days of receiving the product. The Customer Service Team after looking into your complaint will take an appropriate decision.</li>
                  <li>In case of complaints regarding products that come with a warranty from manufacturers, please refer the issue to them. In case of any Refunds approved by the zenithbooks, it'll take 9-15 Days days for the refund to be processed to the end customer.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Send us a Message</CardTitle>
            <CardDescription>Fill out the form below and we'll get back to you as soon as possible.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} placeholder="Your Name" /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} placeholder="your@email.com" type="email" /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="subject" render={({ field }) => (
                  <FormItem><FormLabel>Subject</FormLabel><FormControl><Input {...field} placeholder="How can we help?" /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="message" render={({ field }) => (
                  <FormItem><FormLabel>Message</FormLabel><FormControl><Textarea {...field} placeholder="Your message..." className="min-h-32" /></FormControl><FormMessage /></FormItem>
                )}/>
                <Button type="submit">
                  <Send className="mr-2"/> Send Message
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


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
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Trash2, Edit, Ticket, Percent, IndianRupee } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { servicePricing } from "@/lib/on-demand-pricing";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";


const couponSchema = z.object({
  code: z.string().min(3, "Code must be at least 3 characters.").max(20),
  type: z.enum(["percentage", "fixed"]),
  value: z.coerce.number().positive("Value must be a positive number."),
  expiryDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Expiry date is required." }),
  appliesTo: z.object({
    subscriptions: z.array(z.string()),
    services: z.array(z.string()),
  }).refine(data => data.subscriptions.length > 0 || data.services.length > 0, {
      message: "Coupon must apply to at least one subscription or service."
  })
});

type Coupon = z.infer<typeof couponSchema> & { id: string, status: "Active" | "Expired" | "Inactive" };
type CouponFormValues = z.infer<typeof couponSchema>;

const initialCoupons: Coupon[] = [
  {
    id: "C-001",
    code: "WELCOME10",
    type: "percentage",
    value: 10,
    status: "Active",
    expiryDate: new Date(2024, 11, 31).toISOString(),
    appliesTo: { subscriptions: ["business", "professional"], services: [] },
  },
  {
    id: "C-002",
    code: "CMA500",
    type: "fixed",
    value: 500,
    status: "Active",
    expiryDate: new Date(2024, 8, 30).toISOString(),
    appliesTo: { subscriptions: [], services: ["CMA_REPORT"] },
  },
  {
    id: "C-003",
    code: "GSTSPECIAL18",
    type: "percentage",
    value: 18,
    status: "Active",
    expiryDate: new Date(2024, 7, 31).toISOString(),
    appliesTo: { subscriptions: [], services: ["GST_NOTICE"] },
  },
   {
    id: "C-004",
    code: "OLD20",
    type: "percentage",
    value: 20,
    status: "Expired",
    expiryDate: new Date(2023, 11, 31).toISOString(),
    appliesTo: { subscriptions: ["business"], services: [] },
  },
];

const allServices = Object.values(servicePricing).flat();
const subscriptionPlans = [
    { id: "business", label: "Business Plan Subscription" },
    { id: "professional", label: "Professional Plan Subscription" },
]

export default function CouponsPage() {
  const [coupons, setCoupons] = useState(initialCoupons);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<CouponFormValues>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
        code: "",
        type: "percentage",
        value: 10,
        expiryDate: new Date().toISOString().split("T")[0],
        appliesTo: {
            subscriptions: [],
            services: []
        }
    }
  })

  const onSubmit = (data: CouponFormValues) => {
    const newCoupon: Coupon = {
        ...data,
        id: `C-${Date.now().toString().slice(-4)}`,
        status: new Date(data.expiryDate) < new Date() ? 'Expired' : 'Active',
    };
    setCoupons(prev => [newCoupon, ...prev]);
    toast({ title: "Coupon Created", description: `Coupon code ${newCoupon.code} has been added.`});
    setIsDialogOpen(false);
    form.reset();
  }

  const getStatusBadge = (status: Coupon['status']) => {
    switch (status) {
      case "Active":
        return <Badge className="bg-green-600 hover:bg-green-700">Active</Badge>;
      case "Expired":
        return <Badge variant="secondary">Expired</Badge>;
      case "Inactive":
        return <Badge variant="destructive">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const getApplicabilityText = (appliesTo: Coupon['appliesTo']) => {
    const subCount = appliesTo.subscriptions.length;
    const serviceCount = appliesTo.services.length;

    if (subCount > 0 && serviceCount > 0) return `${subCount} sub(s) & ${serviceCount} service(s)`;
    if (subCount > 0) return `${subCount} subscription(s)`;
    if (serviceCount > 0) return `${serviceCount} service(s)`;
    return "None";
  };


  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Coupons & Discounts</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => form.reset({
                 code: "",
                type: "percentage",
                value: 10,
                expiryDate: new Date().toISOString().split("T")[0],
                appliesTo: { subscriptions: [], services: [] }
            })}>
              <PlusCircle className="mr-2" />
              Create Coupon
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
             <DialogHeader>
                <DialogTitle>Create New Coupon</DialogTitle>
                <DialogDescription>Define a new discount code for your users.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                       <FormField control={form.control} name="code" render={({ field }) => ( <FormItem><FormLabel>Coupon Code</FormLabel><FormControl><Input placeholder="e.g., LAUNCH20" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                       <FormField control={form.control} name="expiryDate" render={({ field }) => ( <FormItem><FormLabel>Expiry Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="type" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Discount Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="percentage">Percentage</SelectItem>
                                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormItem>
                         )}/>
                         <FormField control={form.control} name="value" render={({ field }) => ( <FormItem><FormLabel>Value</FormLabel><FormControl><Input type="number" placeholder="e.g., 10 (for 10%) or 500 (for ₹500)" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>
                     <FormField
                        control={form.control}
                        name="appliesTo"
                        render={() => (
                             <FormItem>
                                <FormLabel>Applicable To</FormLabel>
                                <ScrollArea className="h-60 w-full rounded-md border p-4">
                                     <h4 className="font-semibold mb-2">Subscriptions</h4>
                                     {subscriptionPlans.map(plan => (
                                         <FormField
                                            key={plan.id}
                                            control={form.control}
                                            name="appliesTo.subscriptions"
                                            render={({ field }) => (
                                                <FormItem key={plan.id} className="flex items-center space-x-2 my-2">
                                                    <FormControl>
                                                        <Checkbox checked={field.value?.includes(plan.id)} onCheckedChange={checked => {
                                                            return checked ? field.onChange([...field.value, plan.id]) : field.onChange(field.value?.filter(v => v !== plan.id))
                                                        }}/>
                                                    </FormControl>
                                                    <FormLabel className="font-normal">{plan.label}</FormLabel>
                                                </FormItem>
                                            )}
                                         />
                                     ))}
                                      <h4 className="font-semibold pt-4 mt-4 border-t">On-Demand Services</h4>
                                     {allServices.map(service => (
                                          <FormField
                                            key={service.id}
                                            control={form.control}
                                            name="appliesTo.services"
                                            render={({ field }) => (
                                                <FormItem key={service.id} className="flex items-center space-x-2 my-2">
                                                    <FormControl>
                                                        <Checkbox checked={field.value?.includes(service.id)} onCheckedChange={checked => {
                                                            return checked ? field.onChange([...field.value, service.id]) : field.onChange(field.value?.filter(v => v !== service.id))
                                                        }}/>
                                                    </FormControl>
                                                    <FormLabel className="font-normal">{service.name}</FormLabel>
                                                </FormItem>
                                            )}
                                         />
                                     ))}
                                </ScrollArea>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <DialogFooter>
                        <Button type="submit">Save Coupon</Button>
                    </DialogFooter>
                </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Coupon Codes</CardTitle>
          <CardDescription>View, manage, and create discount codes for subscriptions and services.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Applies To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires On</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.length > 0 ? coupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-mono">{coupon.code}</TableCell>
                  <TableCell className="font-semibold flex items-center gap-1">
                      {coupon.type === 'percentage' ? <Percent className="size-4 text-muted-foreground"/> : <IndianRupee className="size-4 text-muted-foreground"/>}
                      {coupon.value}{coupon.type === 'percentage' && '%'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{getApplicabilityText(coupon.appliesTo)}</TableCell>
                  <TableCell>{getStatusBadge(coupon.status)}</TableCell>
                  <TableCell>{format(new Date(coupon.expiryDate), 'dd MMM, yyyy')}</TableCell>
                  <TableCell className="text-right">
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><Edit className="mr-2"/>Edit Coupon</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2"/>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No coupons created yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}


"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Briefcase, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { professionals as sampleProfessionals } from '@/lib/professionals';

const professionalsWithStatus = sampleProfessionals.map((p, i) => ({
    ...p,
    status: i % 2 === 0 ? 'Verified' : 'Pending Verification',
    joinedOn: new Date(2024, 6, 15 - i * 5),
}));

export default function AdminProfessionals() {

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Verified":
        return <Badge className="bg-green-600 hover:bg-green-700">Verified</Badge>;
      case "Pending Verification":
        return <Badge variant="destructive">Pending Verification</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center size-12 rounded-full bg-primary/10">
            <Briefcase className="size-6 text-primary" />
        </div>
        <div>
            <h1 className="text-3xl font-bold">Manage Professionals</h1>
            <p className="text-muted-foreground">View, verify, and manage all registered professionals on the platform.</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>All Professionals</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Professional</TableHead>
                <TableHead>Firm Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Joined On</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {professionalsWithStatus.map((pro) => (
                <TableRow key={pro.id}>
                  <TableCell className="font-medium">{pro.name}</TableCell>
                  <TableCell>{pro.firm}</TableCell>
                  <TableCell>{pro.location}</TableCell>
                  <TableCell>{format(pro.joinedOn, 'dd MMM, yyyy')}</TableCell>
                  <TableCell>{getStatusBadge(pro.status)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Profile & Documents</DropdownMenuItem>
                        {pro.status !== 'Verified' && <DropdownMenuItem><ShieldCheck className="mr-2"/>Mark as Verified</DropdownMenuItem>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

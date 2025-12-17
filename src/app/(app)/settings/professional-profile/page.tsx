
"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Save } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useDocument } from "react-firebase-hooks/firestore";

const serviceAreas = [
    { id: "gst_registration", label: "GST Registration" },
    { id: "startup_registration", label: "Start-Up Registration" },
    { id: "pvt_incorporation", label: "PVT Incorporation" },
    { id: "itr_filing", label: "ITR Filing" },
    { id: "gstr_filings", label: "GSTR Filings" },
    { id: "gst_notices", label: "GST Notices" },
    { id: "income_tax_notices", label: "Income Tax Notices" },
    { id: "mca_compliance", label: "MCA Compliance" },
    { id: "virtual_cfo", label: "Virtual CFO" },
    { id: "book_keeping", label: "Book Keeping" },
    { id: "audit", label: "Statutory & Tax Audit" },
    { id: "tax_litigation", label: "Tax Litigation" },
    { id: "cma_report", label: "CMA Report Preparation" },
    { id: "project_financing", label: "Project Financing" },
    { id: "ca_certification", label: "CA Certification" },
];


export default function ProfessionalProfilePage() {
    const { toast } = useToast();
    const [user] = useAuthState(auth);
    const proRef = useMemo(() => (user ? doc(db, "professionals", user.uid) : null), [user]);
    const [proSnap] = useDocument(proRef as any);

    const [form, setForm] = useState({
        name: "",
        firm: "",
        title: "",
        experience: "",
        professionals: "",
        bio: "",
        email: "",
        phone: "",
        imageUrl: "",
        specialties: [] as string[],
    });

    useEffect(() => {
        if (!proSnap?.exists()) return;
        const data: any = proSnap.data();
        setForm({
            name: data?.name || "",
            firm: data?.firm || "",
            title: data?.title || "",
            experience: data?.experience != null ? String(data.experience) : "",
            professionals: data?.professionals != null ? String(data.professionals) : "",
            bio: data?.bio || "",
            email: data?.email || "",
            phone: data?.phone || "",
            imageUrl: data?.imageUrl || "",
            specialties: Array.isArray(data?.specialties) ? data.specialties : [],
        });
    }, [proSnap]);

    const handleSaveChanges = async () => {
        if (!user) {
            toast({ variant: "destructive", title: "Login required", description: "Please login to save your professional profile." });
            return;
        }
        const payload = {
            ownerUid: user.uid,
            name: form.name.trim(),
            firm: form.firm.trim(),
            title: form.title.trim(),
            experience: Number(form.experience || 0) || 0,
            professionals: Number(form.professionals || 0) || 0,
            bio: form.bio,
            email: form.email.trim(),
            phone: form.phone.trim(),
            imageUrl: form.imageUrl.trim(),
            specialties: form.specialties,
            // If already approved, keep it. Else default to pending.
            status: proSnap?.data()?.status || "pending",
            updatedAt: serverTimestamp(),
            createdAt: proSnap?.exists() ? proSnap?.data()?.createdAt : serverTimestamp(),
        };

        await setDoc(doc(db, "professionals", user.uid), payload, { merge: true });
        toast({
            title: "Profile Saved",
            description: "Your professional profile has been saved. If pending, admin will verify it."
        });
    }

    const toggleSpecialty = (id: string) => {
        setForm((p) => {
            const exists = p.specialties.includes(id);
            // allow up to 5
            if (!exists && p.specialties.length >= 5) return p;
            return { ...p, specialties: exists ? p.specialties.filter((s) => s !== id) : [...p.specialties, id] };
        });
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold">Professional Profile</h1>
                <p className="text-muted-foreground">This information will be visible to clients seeking professional services.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Full Name</Label>
                            <Input value={form.name} onChange={(e) => setForm(p => ({...p, name: e.target.value}))} />
                        </div>
                         <div className="space-y-2">
                            <Label>Firm Name</Label>
                            <Input value={form.firm} onChange={(e) => setForm(p => ({...p, firm: e.target.value}))} />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label>Professional Title / Qualification</Label>
                        <Input value={form.title} onChange={(e) => setForm(p => ({...p, title: e.target.value}))} />
                    </div>
                     <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Years of Experience</Label>
                            <Input type="number" value={form.experience} onChange={(e) => setForm(p => ({...p, experience: e.target.value}))} />
                        </div>
                         <div className="space-y-2">
                            <Label>Number of Professionals in Firm</Label>
                            <Input type="number" value={form.professionals} onChange={(e) => setForm(p => ({...p, professionals: e.target.value}))} />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label>About / Bio</Label>
                        <Textarea className="min-h-24" placeholder="Write a brief bio..." value={form.bio} onChange={(e) => setForm(p => ({...p, bio: e.target.value}))} />
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Areas of Expertise</CardTitle>
                    <CardDescription>Select up to 5 core areas of your practice. This will help clients find you.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-64">
                        <div className="grid sm:grid-cols-2 gap-4">
                            {serviceAreas.map(service => (
                                <div key={service.id} className="flex items-center space-x-2">
                                    <Checkbox id={service.id} checked={form.specialties.includes(service.label)} onCheckedChange={() => toggleSpecialty(service.label)} />
                                    <Label htmlFor={service.id} className="font-normal">{service.label}</Label>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>Branding & Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center gap-6">
                        <Image src={form.imageUrl || "https://picsum.photos/seed/user/120/120"} alt="Profile Picture" width={120} height={120} className="rounded-full border"/>
                        <div className="space-y-2">
                            <Label>Profile Picture</Label>
                            <Input type="file" className="max-w-xs"/>
                            <p className="text-xs text-muted-foreground">Recommended: Square image, at least 200x200px.</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Profile Image URL (optional)</Label>
                        <Input value={form.imageUrl} onChange={(e) => setForm(p => ({...p, imageUrl: e.target.value}))} placeholder="https://..." />
                    </div>
                    <Separator/>
                     <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Contact Email</Label>
                            <Input type="email" value={form.email} onChange={(e) => setForm(p => ({...p, email: e.target.value}))} />
                        </div>
                         <div className="space-y-2">
                            <Label>Phone Number</Label>
                            <Input type="tel" value={form.phone} onChange={(e) => setForm(p => ({...p, phone: e.target.value}))} />
                        </div>
                    </div>
                </CardContent>
                 <CardFooter>
                    <Button onClick={handleSaveChanges} disabled={!user}>
                        <Save className="mr-2"/>
                        Save Profile
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

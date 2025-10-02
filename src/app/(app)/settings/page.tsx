
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Building,
  CreditCard,
  Briefcase,
  ShieldCheck,
  Paintbrush
} from "lucide-react";
import Link from "next/link";
import { useRoleSimulator } from "@/context/role-simulator-context";
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc } from "firebase/firestore";
import { useDocumentData } from 'react-firebase-hooks/firestore';

const SUPER_ADMIN_EMAIL = 'smr@smr.com';


export default function SettingsPage() {
  const { simulatedRole, setSimulatedRole } = useRoleSimulator();
  const [user] = useAuthState(auth);
  const userDocRef = user ? doc(db, 'users', user.uid) : null;
  const [userData] = useDocumentData(userDocRef);

  const getRole = () => {
    if (!user) return 'business'; // Default to business if not logged in for viewing purposes
    if (user.email === SUPER_ADMIN_EMAIL) return 'super_admin';
    return userData?.userType || 'business'; 
  }
  
  const userRole = getRole();
  const displayRole = simulatedRole || userRole;


  const settingsCards = [
    { title: "Company Branding", description: "Manage your logo, company details, and invoice templates.", icon: Paintbrush, href: "/settings/branding", roles: ['business', 'professional', 'super_admin'] },
    { title: "User Management", description: "Invite and manage user access to your organization.", icon: Users, href: "/settings/users", roles: ['business', 'professional', 'super_admin'] },
    { title: "Subscription & Billing", description: "View your current plan and manage billing details.", icon: CreditCard, href: "/pricing", roles: ['business', 'professional', 'super_admin'] },
    { title: "Professional Profile", description: "Set up your public profile for clients to see.", icon: Briefcase, href: "/settings/professional-profile", roles: ['professional'] },
  ];
  
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-2 text-muted-foreground">Manage your account, organization, and billing preferences.</p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        {settingsCards.map(card => {
            if (card.roles && !card.roles.includes(displayRole)) return null;
            return (
              <Card key={card.title}>
                  <CardHeader>
                      <CardTitle className="flex items-center gap-3"><card.icon className="text-primary"/> {card.title}</CardTitle>
                      <CardDescription>{card.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <Link href={card.href} passHref>
                        <Button variant="outline">Go to {card.title}</Button>
                      </Link>
                  </CardContent>
              </Card>
            )
        })}
      </div>

       {/* Super Admin Role Simulator */}
       <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-3"><ShieldCheck className="text-destructive"/> Developer: Role Simulator</CardTitle>
                <CardDescription>Switch between user roles to test application access levels.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
                <Button variant={!simulatedRole || simulatedRole === 'business' ? 'default' : 'secondary'} onClick={() => setSimulatedRole('business')}>Business User</Button>
                <Button variant={simulatedRole === 'professional' ? 'default' : 'secondary'} onClick={() => setSimulatedRole('professional')}>Professional</Button>
                {userRole === 'super_admin' && (
                  <Button variant={simulatedRole === 'super_admin' ? 'default' : 'secondary'} onClick={() => setSimulatedRole('super_admin')}>Super Admin</Button>
                )}
            </CardContent>
       </Card>
    </div>
  );
}

    
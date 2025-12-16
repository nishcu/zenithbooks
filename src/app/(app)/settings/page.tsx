
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Users,
  Building,
  CreditCard,
  Briefcase,
  ShieldCheck,
  Paintbrush,
  User,
  BadgeCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useRoleSimulator } from "@/context/role-simulator-context";
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc } from "firebase/firestore";
import { useDocumentData } from 'react-firebase-hooks/firestore';

const SUPER_ADMIN_UID = '9soE3VaoHzUcytSTtA9SaFS7cC82';


export default function SettingsPage() {
  const { simulatedRole, setSimulatedRole } = useRoleSimulator();
  const [user] = useAuthState(auth);
  const userDocRef = user ? doc(db, 'users', user.uid) : null;
  const [userData] = useDocumentData(userDocRef);

  const getRole = () => {
    if (!user) return 'business'; // Default to business if not logged in for viewing purposes
    if (user.uid === SUPER_ADMIN_UID) return 'super_admin';
    return userData?.userType || 'business'; 
  }
  
  const userRole = getRole();
  const displayRole = simulatedRole || userRole;


  const settingsCards = [
    { title: "Company Branding", description: "Manage your logo, company details, and invoice templates.", icon: Paintbrush, href: "/settings/branding", roles: ['business', 'professional', 'super_admin'] },
    { title: "User Management", description: "Invite and manage user access to your organization.", icon: Users, href: "/settings/users", roles: ['business', 'professional', 'super_admin'] },
    { title: "Subscription & Billing", description: "View your current plan and manage billing details.", icon: CreditCard, href: "/pricing", roles: ['business', 'professional', 'super_admin'] },
    { title: "Transaction History", description: "View all your payments, subscriptions, and service orders.", icon: CreditCard, href: "/transactions", roles: ['business', 'professional', 'super_admin'] },
    { title: "Professional Profile", description: "Set up your public profile for clients to see.", icon: Briefcase, href: "/settings/professional-profile", roles: ['professional'] },
  ];
  
  const getUserTypeLabel = (userType: string | undefined) => {
    if (userType === 'professional') return 'Professional';
    if (userType === 'business') return 'Business';
    return 'Business'; // Default
  };

  const getSubscriptionPlanLabel = (plan: string | undefined) => {
    if (plan === 'professional') return 'Professional Plan';
    if (plan === 'business') return 'Business Plan';
    if (plan === 'freemium') return 'Freemium Plan';
    return 'Not Subscribed';
  };

  const getSubscriptionPlanBadgeVariant = (plan: string | undefined) => {
    if (plan === 'professional') return 'default';
    if (plan === 'business') return 'secondary';
    return 'outline';
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-2 text-muted-foreground">Manage your account, organization, and billing preferences.</p>
      </div>

      {/* Account Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <User className="text-primary" />
            Account Information
          </CardTitle>
          <CardDescription>View your account type and subscription details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium text-muted-foreground">User Type</Label>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={userRole === 'professional' ? 'default' : 'secondary'} className="text-sm">
                  {getUserTypeLabel(userData?.userType)}
                </Badge>
                {userRole === 'professional' && (
                  <span className="text-xs text-muted-foreground">(Cannot be changed)</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {userRole === 'professional' 
                  ? 'You are registered as a Professional (CA, Tax Consultant, etc.)' 
                  : 'You are registered as a Business Owner'}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium text-muted-foreground">Subscription Plan</Label>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getSubscriptionPlanBadgeVariant(userData?.subscriptionPlan)} className="text-sm">
                  {getSubscriptionPlanLabel(userData?.subscriptionPlan)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {userData?.subscriptionPlan === 'professional'
                  ? 'Full access to all features including client management'
                  : userData?.subscriptionPlan === 'business'
                  ? 'Access to accounting, GST, and compliance features'
                  : 'Basic billing features only'}
              </p>
            </div>
          </div>
          {userRole === 'professional' && userData?.subscriptionPlan !== 'professional' && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Note:</strong> As a Professional user, you must subscribe to the Professional Plan to access client management features.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
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

"use client";

import { useState, useEffect } from "react";
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollection } from 'react-firebase-hooks/firestore';
import { auth, db } from "@/lib/firebase";
import { collection, query, where, updateDoc, doc, getDocs } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, CheckCircle, XCircle, Building, User } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function InvitationsPage() {
  const { toast } = useToast();
  const [user] = useAuthState(auth);
  const [acceptingInviteId, setAcceptingInviteId] = useState<string | null>(null);
  const [decliningInviteId, setDecliningInviteId] = useState<string | null>(null);

  // Query for pending invitations matching user's email
  const invitesQuery = user?.email 
    ? query(
        collection(db, 'userInvites'),
        where("email", "==", user.email),
        where("status", "==", "Invited")
      )
    : null;
  
  const [invitesSnapshot, invitesLoading] = useCollection(invitesQuery);

  const pendingInvites = invitesSnapshot?.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) || [];

  // Get inviter information
  const [inviters, setInviters] = useState<Record<string, any>>({});
  
  useEffect(() => {
    const loadInviters = async () => {
      if (pendingInvites.length === 0) return;
      
      const inviterIds = [...new Set(pendingInvites.map((inv: any) => inv.invitedBy))];
      const inviterData: Record<string, any> = {};
      
      for (const inviterId of inviterIds) {
        try {
          const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', inviterId)));
          if (!userDoc.empty) {
            const userData = userDoc.docs[0].data();
            inviterData[inviterId] = {
              name: userData.companyName || userData.email || 'Unknown',
              email: userData.email,
            };
          }
        } catch (error) {
          console.error('Error loading inviter:', error);
        }
      }
      
      setInviters(inviterData);
    };
    
    loadInviters();
  }, [pendingInvites]);

  const handleAcceptInvitation = async (inviteId: string, invite: any) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Not Authenticated",
        description: "Please sign in to accept invitations.",
      });
      return;
    }

    setAcceptingInviteId(inviteId);
    try {
      // 1. Update invitation status
      await updateDoc(doc(db, "userInvites", inviteId), {
        status: "Active",
        acceptedAt: new Date(),
        acceptedBy: user.uid,
      });

      // 2. Update user document with invitation details
      const userUpdate: any = {
        invitedBy: invite.invitedBy,
        role: invite.role,
        organizationId: invite.invitedBy,
        inviteType: invite.inviteType || 'organization-wide',
      };
      
      if (invite.clientId) {
        userUpdate.clientId = invite.clientId;
      }

      // Get current user data and merge
      const currentUserDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', user.uid)));
      if (!currentUserDoc.empty) {
        const currentData = currentUserDoc.docs[0].data();
        await updateDoc(doc(db, "users", currentUserDoc.docs[0].id), {
          ...currentData,
          ...userUpdate,
        });
      } else {
        // If user doc doesn't exist, create it
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email: user.email,
          ...userUpdate,
          createdAt: new Date(),
        });
      }

      toast({
        title: "Invitation Accepted",
        description: `You've been added to the organization as ${invite.role}.`,
      });

      // Refresh the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      toast({
        variant: "destructive",
        title: "Failed to Accept Invitation",
        description: error.message || "Could not accept the invitation. Please try again.",
      });
    } finally {
      setAcceptingInviteId(null);
    }
  };

  const handleDeclineInvitation = async (inviteId: string) => {
    if (!user) return;

    setDecliningInviteId(inviteId);
    try {
      await updateDoc(doc(db, "userInvites", inviteId), {
        status: "Declined",
        declinedAt: new Date(),
        declinedBy: user.uid,
      });

      toast({
        title: "Invitation Declined",
        description: "The invitation has been declined.",
      });

      // Refresh after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error: any) {
      console.error("Error declining invitation:", error);
      toast({
        variant: "destructive",
        title: "Failed to Decline Invitation",
        description: error.message || "Could not decline the invitation. Please try again.",
      });
    } finally {
      setDecliningInviteId(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Please sign in to view invitations.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Pending Invitations</h1>
        <p className="text-muted-foreground">
          View and accept invitations to join organizations.
        </p>
      </div>

      {invitesLoading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading invitations...</span>
            </div>
          </CardContent>
        </Card>
      ) : pendingInvites.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Mail className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Pending Invitations</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                You don't have any pending invitations. When someone invites you to join their organization, 
                it will appear here.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingInvites.map((invite: any) => {
            const inviter = inviters[invite.invitedBy];
            return (
              <Card key={invite.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Organization Invitation
                      </CardTitle>
                      <CardDescription className="mt-2">
                        You've been invited to join an organization
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">Pending</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex items-start gap-3">
                        <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Organization</p>
                          <p className="text-sm text-muted-foreground">
                            {inviter?.name || 'Unknown Organization'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Role</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {invite.role || 'Viewer'}
                          </p>
                        </div>
                      </div>
                      {invite.clientId && (
                        <div className="flex items-start gap-3">
                          <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">Scope</p>
                            <p className="text-sm text-muted-foreground">
                              Client-specific access
                            </p>
                          </div>
                        </div>
                      )}
                      {invite.inviteType && (
                        <div className="flex items-start gap-3">
                          <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">Access Level</p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {invite.inviteType === 'client-specific' ? 'Client-specific' : 'Organization-wide'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {invite.invitedAt && (
                      <div className="pt-4 border-t">
                        <p className="text-xs text-muted-foreground">
                          Invited on: {invite.invitedAt.toDate ? 
                            invite.invitedAt.toDate().toLocaleDateString() : 
                            new Date(invite.invitedAt).toLocaleDateString()}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-3 pt-4">
                      <Button
                        onClick={() => handleAcceptInvitation(invite.id, invite)}
                        disabled={acceptingInviteId === invite.id || decliningInviteId === invite.id}
                        className="flex-1"
                      >
                        {acceptingInviteId === invite.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Accepting...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Accept Invitation
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleDeclineInvitation(invite.id)}
                        disabled={acceptingInviteId === invite.id || decliningInviteId === invite.id}
                      >
                        {decliningInviteId === invite.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}


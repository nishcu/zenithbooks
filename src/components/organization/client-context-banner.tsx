"use client";

import { useRolePermissions } from "@/hooks/use-role-permissions";
import { Badge } from "@/components/ui/badge";
import { Building, Eye, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { getUserOrganizationData } from "@/lib/organization-utils";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export function ClientContextBanner() {
  const { clientId, organizationId, isViewer, role } = useRolePermissions();
  const [user] = useAuthState(auth);
  const [clientName, setClientName] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);

  useEffect(() => {
    const loadContext = async () => {
      if (!user) return;

      // Load organization name
      if (organizationId) {
        try {
          const orgDoc = await getDoc(doc(db, "users", organizationId));
          if (orgDoc.exists()) {
            setOrgName(orgDoc.data()?.companyName || orgDoc.data()?.email || "Organization");
          }
        } catch (error) {
          console.error("Error loading organization name:", error);
        }
      }

      // Load client name if client-specific
      if (clientId) {
        try {
          const clientDoc = await getDoc(doc(db, "professional_clients", clientId));
          if (clientDoc.exists()) {
            setClientName(clientDoc.data()?.name || "Client");
          }
        } catch (error) {
          console.error("Error loading client name:", error);
        }
      }
    };

    loadContext();
  }, [user, organizationId, clientId]);

  if (!organizationId) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b">
      <div className="flex items-center gap-2 flex-1">
        {clientId && clientName ? (
          <>
            <Building className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Working with:</span>
            <Badge variant="secondary" className="font-medium">
              {clientName}
            </Badge>
            <span className="text-xs text-muted-foreground">(Client-specific access)</span>
          </>
        ) : orgName ? (
          <>
            <Building className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Organization:</span>
            <Badge variant="secondary" className="font-medium">
              {orgName}
            </Badge>
            <span className="text-xs text-muted-foreground">(Organization-wide access)</span>
          </>
        ) : null}
      </div>
      
      {isViewer && (
        <Badge variant="outline" className="flex items-center gap-1">
          <Eye className="h-3 w-3" />
          <span>Read-Only</span>
        </Badge>
      )}
      
      {role && role !== 'admin' && (
        <Badge variant="outline" className="text-xs capitalize">
          {role}
        </Badge>
      )}
    </div>
  );
}


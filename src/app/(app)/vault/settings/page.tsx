"use client";

import { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Save, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { VaultErrorBoundary } from "@/components/vault/error-boundary";

interface NotificationPreferences {
  accessAlerts: boolean;
  expiryWarnings: boolean;
  storageWarnings: boolean;
}

export default function VaultSettingsPage() {
  const [user, loadingUser] = useAuthState(auth);
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    accessAlerts: true,
    expiryWarnings: true,
    storageWarnings: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load preferences
  useEffect(() => {
    if (!user) return;

    const loadPreferences = async () => {
      try {
        const settingsRef = doc(db, "vaultSettings", user.uid);
        const settingsDoc = await getDoc(settingsRef);
        
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          const notificationPrefs = data.notificationPreferences || {};
          setPreferences({
            accessAlerts: notificationPrefs.accessAlerts ?? true,
            expiryWarnings: notificationPrefs.expiryWarnings ?? true,
            storageWarnings: notificationPrefs.storageWarnings ?? true,
          });
        }
      } catch (error) {
        console.error("Error loading preferences:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load notification preferences.",
        });
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [user, toast]);

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const settingsRef = doc(db, "vaultSettings", user.uid);
      const settingsDoc = await getDoc(settingsRef);
      
      const currentSettings = settingsDoc.exists() ? settingsDoc.data() : {};
      
      await setDoc(
        settingsRef,
        {
          ...currentSettings,
          notificationPreferences: preferences,
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      );

      toast({
        title: "Preferences Saved",
        description: "Your notification preferences have been updated.",
      });
      
      setHasChanges(false);
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Failed to save notification preferences. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loadingUser || loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <Bell className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">Please log in to access settings.</p>
      </div>
    );
  }

  return (
    <VaultErrorBoundary>
      <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Vault Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your Document Vault preferences and notifications
          </p>
        </div>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Choose which notifications you want to receive for Document Vault activities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                These preferences control notifications for Document Vault only. Other app notifications are managed separately.
              </AlertDescription>
            </Alert>

            {/* Access Alerts */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="access-alerts" className="text-base">
                  Document Access Alerts
                </Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when documents are viewed or downloaded via share codes
                </p>
              </div>
              <Switch
                id="access-alerts"
                checked={preferences.accessAlerts}
                onCheckedChange={() => handleToggle("accessAlerts")}
              />
            </div>

            {/* Expiry Warnings */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="expiry-warnings" className="text-base">
                  Share Code Expiry Warnings
                </Label>
                <p className="text-sm text-muted-foreground">
                  Get notified 1 day before share codes expire and when they expire
                </p>
              </div>
              <Switch
                id="expiry-warnings"
                checked={preferences.expiryWarnings}
                onCheckedChange={() => handleToggle("expiryWarnings")}
              />
            </div>

            {/* Storage Warnings */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="storage-warnings" className="text-base">
                  Storage Warnings
                </Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when storage usage reaches 80%, 90%, or 95% capacity
                </p>
              </div>
              <Switch
                id="storage-warnings"
                checked={preferences.storageWarnings}
                onCheckedChange={() => handleToggle("storageWarnings")}
              />
            </div>

            {/* Save Button */}
            {hasChanges && (
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Preferences
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>About Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              • Notifications appear in the notification center (bell icon) in the header
            </p>
            <p>
              • You can mark notifications as read or delete them
            </p>
            <p>
              • Disabling a notification type means you won't receive alerts for those events
            </p>
            <p>
              • Critical security alerts may still be shown regardless of preferences
            </p>
          </CardContent>
        </Card>
      </div>
    </VaultErrorBoundary>
  );
}


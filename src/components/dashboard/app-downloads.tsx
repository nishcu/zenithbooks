"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Download, Monitor } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ZENITH_BOOKS_VERSION } from "@/lib/constants";

export function AppDownloads() {
  const { toast } = useToast();

  const handleAppDownload = (platform: string) => {
    toast({
      title: "Coming Soon! 🚀",
      description: `ZenithBooks mobile app for ${platform} will be available soon. We'll notify you when it's ready!`,
      duration: 5000,
    });
  };

  return (
    <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900">
              <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                Mobile Apps
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                  Coming Soon
                </Badge>
              </CardTitle>
              <CardDescription>
                Download ZenithBooks on your mobile device
              </CardDescription>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Version</div>
            <Badge variant="secondary" className="font-mono text-sm">
              v{ZENITH_BOOKS_VERSION}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Android App */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-white/50 dark:bg-gray-900/50">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.523 15.3414c-.5511 0-.9993-.4482-.9993-.9993s.4482-.9993.9993-.9993.9993.4482.9993.9993-.4482.9993-.9993.9993zm-11.046 0c-.5511 0-.9993-.4482-.9993-.9993s.4482-.9993.9993-.9993.9993.4482.9993.9993-.4482.9993-.9993.9993zm11.404-6.02l1.318-1.318c.115-.115.297-.115.411 0 .115.115.115.297 0 .411l-1.317 1.317c.373.673.581 1.433.581 2.25 0 2.485-2.015 4.5-4.5 4.5s-4.5-2.015-4.5-4.5 2.015-4.5 4.5-4.5c.817 0 1.577.208 2.25.581l1.317-1.317c.115-.115.297-.115.411 0s.115.297 0 .411l-1.318 1.318zm-2.858 2.858c-1.381 0-2.5 1.119-2.5 2.5s1.119 2.5 2.5 2.5 2.5-1.119 2.5-2.5-1.119-2.5-2.5-2.5z"/>
                </svg>
              </div>
              <div>
                <div className="font-medium">Android App</div>
                <div className="text-sm text-muted-foreground">Google Play Store</div>
              </div>
            </div>
            <Button
              onClick={() => handleAppDownload('Android')}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>

          {/* iOS App */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-white/50 dark:bg-gray-900/50">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800">
                <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
              </div>
              <div>
                <div className="font-medium">iOS App</div>
                <div className="text-sm text-muted-foreground">App Store</div>
              </div>
            </div>
            <Button
              onClick={() => handleAppDownload('iOS')}
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>

          {/* Desktop/Web Version Info */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <Monitor className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-medium">Desktop/Web Version</div>
                <div className="text-sm text-muted-foreground">Currently using v{ZENITH_BOOKS_VERSION}</div>
              </div>
            </div>
            <Badge variant="default" className="font-mono">
              v{ZENITH_BOOKS_VERSION}
            </Badge>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}

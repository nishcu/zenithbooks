"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Download, FileText, X } from "lucide-react";
import { format } from "date-fns";
import { formatBytes } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Document {
  id: string;
  fileName: string;
  currentVersion: number;
  versions?: {
    [version: number]: {
      fileUrl: string;
      fileSize: number;
      fileType: string;
      uploadedAt: any;
      versionNote?: string;
    };
  };
}

interface DocumentVersionHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document | null;
}

export function DocumentVersionHistory({
  open,
  onOpenChange,
  document,
}: DocumentVersionHistoryProps) {
  const { toast } = useToast();

  const handleDownload = async (versionNumber: number, fileUrl: string, fileName: string) => {
    try {
      console.log("Starting version download:", versionNumber, fileName);

      // Properly download the file with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(fileUrl, {
        signal: controller.signal,
        headers: {
          'Accept': '*/*',
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName || `version-${versionNumber}.pdf`;
      link.style.display = 'none';

      // Ensure body exists
      if (!document.body) {
        throw new Error("Document body not available");
      }

      document.body.appendChild(link);

      // Trigger download
      link.click();

      // Cleanup with delay to ensure download starts
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

      console.log("Version download completed:", versionNumber);

      // Defer toast to next tick to avoid React context issues
      setTimeout(() => {
        toast({
          title: "Download Started",
          description: `Version ${versionNumber} download has started.`,
        });
      }, 0);
    } catch (error: any) {
      console.error("Version download error:", error);

      let errorMessage = "Failed to download version. Please try again.";
      if (error.name === 'AbortError') {
        errorMessage = "Download timed out. Please try again.";
      } else if (error.message) {
        errorMessage = `Download failed: ${error.message}`;
      }

      // Defer error toast to next tick to avoid React context issues
      setTimeout(() => {
        toast({
          variant: "destructive",
          title: "Download Failed",
          description: errorMessage,
        });
      }, 0);
    }
  };

  if (!document || !document.versions) {
    return null;
  }

  // Sort versions in descending order (newest first)
  const sortedVersions = Object.entries(document.versions)
    .map(([version, data]) => ({
      version: parseInt(version),
      ...data,
    }))
    .sort((a, b) => b.version - a.version);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
          <DialogDescription>
            All versions of "{document.fileName}". Current version: v{document.currentVersion}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {sortedVersions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No version history available.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedVersions.map((version) => {
                  const uploadedDate = version.uploadedAt?.toDate 
                    ? version.uploadedAt.toDate() 
                    : new Date(version.uploadedAt);
                  
                  const isCurrentVersion = version.version === document.currentVersion;

                  return (
                    <TableRow key={version.version}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={isCurrentVersion ? "default" : "outline"}
                          >
                            v{version.version}
                          </Badge>
                          {isCurrentVersion && (
                            <Badge variant="secondary" className="text-xs">Current</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatBytes(version.fileSize)}</TableCell>
                      <TableCell>
                        {format(uploadedDate, "dd MMM, yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {version.versionNote || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const fileName = `${document.fileName.replace(/\.[^/.]+$/, "")}_v${version.version}${document.fileName.match(/\.[^/.]+$/)?.[0] || ".pdf"}`;
                            handleDownload(version.version, version.fileUrl, fileName);
                          }}
                          title="Download this version"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


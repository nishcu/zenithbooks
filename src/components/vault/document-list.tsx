"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import { Download, FileText, MoreVertical, Trash2, Edit, Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { formatBytes } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface Document {
  id: string;
  fileName: string;
  category: string;
  currentVersion: number;
  fileSize: number;
  uploadedAt: any;
  lastUpdated: any;
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

interface DocumentListProps {
  documents: Document[];
}

export function DocumentList({ documents }: DocumentListProps) {
  const { toast } = useToast();

  const handleDownload = async (document: Document) => {
    try {
      const latestVersion = document.versions?.[document.currentVersion];
      if (!latestVersion?.fileUrl) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Document URL not found.",
        });
        return;
      }

      // Open in new tab for download
      window.open(latestVersion.fileUrl, '_blank');
      
      toast({
        title: "Download Started",
        description: "Your document download has started.",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Failed to download document. Please try again.",
      });
    }
  };

  const handleView = (document: Document) => {
    const latestVersion = document.versions?.[document.currentVersion];
    if (!latestVersion?.fileUrl) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Document URL not found.",
      });
      return;
    }

    window.open(latestVersion.fileUrl, '_blank');
  };

  const handleDelete = async (documentId: string) => {
    // TODO: Implement delete functionality in Phase 2
    toast({
      title: "Coming Soon",
      description: "Delete functionality will be available in Phase 2.",
    });
  };

  const handleEdit = (documentId: string) => {
    // TODO: Implement edit functionality in Phase 2
    toast({
      title: "Coming Soon",
      description: "Edit functionality will be available in Phase 2.",
    });
  };

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No documents found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Document Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((document) => {
            const uploadedDate = document.uploadedAt?.toDate 
              ? document.uploadedAt.toDate() 
              : new Date(document.uploadedAt);
            
            return (
              <TableRow key={document.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    {document.fileName}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{document.category}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">v{document.currentVersion}</Badge>
                </TableCell>
                <TableCell>{formatBytes(document.fileSize)}</TableCell>
                <TableCell>
                  {format(uploadedDate, "dd MMM, yyyy")}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleView(document)}
                      title="View"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(document)}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(document.id)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Document</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{document.fileName}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(document.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}


/**
 * Admin Knowledge Moderation Dashboard
 * For reviewing and moderating knowledge posts
 */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, XCircle, AlertTriangle, Eye } from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { listKnowledgePosts, updateKnowledgePostStatus } from "@/lib/knowledge/firestore";
import type { KnowledgePost, KnowledgePostStatus } from "@/lib/knowledge/types";
import { SUPER_ADMIN_UID } from "@/lib/constants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function KnowledgeModerationPage() {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [posts, setPosts] = useState<KnowledgePost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<KnowledgePost | null>(null);
  const [isModerationDialogOpen, setIsModerationDialogOpen] = useState(false);
  const [moderationStatus, setModerationStatus] = useState<KnowledgePostStatus>("PUBLISHED");
  const [moderationNotes, setModerationNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<KnowledgePostStatus | "all">("all");

  useEffect(() => {
    if (user && user.uid === SUPER_ADMIN_UID) {
      loadPosts();
    }
  }, [user, statusFilter]);

  const loadPosts = async () => {
    setIsLoading(true);
    try {
      // Load all posts - no status filter for admin to see all
      const allPosts = await listKnowledgePosts({
        status: statusFilter === "all" ? undefined : (statusFilter as any),
        sortBy: "latest",
      });
      setPosts(allPosts);
    } catch (error) {
      console.error("Error loading posts:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load posts for moderation.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleModerate = async () => {
    if (!selectedPost || !user) return;

    setIsSubmitting(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/knowledge/moderate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          postId: selectedPost.id,
          status: moderationStatus,
          notes: moderationNotes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to moderate post");
      }

      toast({
        title: "Post Moderated",
        description: `Post status updated to ${moderationStatus}.`,
      });

      setIsModerationDialogOpen(false);
      setSelectedPost(null);
      setModerationNotes("");
      loadPosts();
    } catch (error: any) {
      console.error("Error moderating post:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to moderate post.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openModerationDialog = (post: KnowledgePost) => {
    setSelectedPost(post);
    setModerationStatus(post.status);
    setModerationNotes("");
    setIsModerationDialogOpen(true);
  };

  if (!user || user.uid !== SUPER_ADMIN_UID) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground py-8">
              Admin access required
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: KnowledgePostStatus) => {
    switch (status) {
      case "PUBLISHED":
        return <Badge className="bg-green-500">Published</Badge>;
      case "UNDER_REVIEW":
        return <Badge className="bg-yellow-500">Under Review</Badge>;
      case "REMOVED":
        return <Badge variant="destructive">Removed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Knowledge Moderation</h1>
        <p className="text-muted-foreground">
          Review and moderate knowledge posts for compliance
        </p>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="REMOVED">Removed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Posts List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground py-8">
              No posts found
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusBadge(post.status)}
                      <Badge variant="outline">{post.category}</Badge>
                    </div>
                    <CardTitle>{post.title}</CardTitle>
                    <CardDescription>
                      By {post.authorFirmName || post.authorName || "Anonymous"}
                      {post.authorFirmName && post.authorName && ` (${post.authorName})`}
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openModerationDialog(post)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Review
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm mb-4 line-clamp-3">
                  {post.content.substring(0, 200)}...
                </div>
                {post.sourceReference && (
                  <div className="text-xs text-muted-foreground mb-2">
                    <strong>Source:</strong> {post.sourceReference}
                  </div>
                )}
                {post.reportedByUsers && post.reportedByUsers.length > 0 && (
                  <div className="text-xs text-red-600">
                    <AlertTriangle className="inline h-3 w-3 mr-1" />
                    Reported {post.reportedByUsers.length} time(s)
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Moderation Dialog */}
      <Dialog open={isModerationDialogOpen} onOpenChange={setIsModerationDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Moderate Post</DialogTitle>
            <DialogDescription>
              Review post content and update status
            </DialogDescription>
          </DialogHeader>

          {selectedPost && (
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <p className="text-sm font-medium">{selectedPost.title}</p>
              </div>

              <div>
                <Label>Category</Label>
                <p className="text-sm">{selectedPost.category}</p>
              </div>

              <div>
                <Label>Content</Label>
                <div className="text-sm whitespace-pre-wrap p-3 bg-muted rounded-md max-h-60 overflow-y-auto">
                  {selectedPost.content}
                </div>
              </div>

              <div>
                <Label>Source Reference</Label>
                <p className="text-sm">{selectedPost.sourceReference}</p>
              </div>

              <div>
                <Label>Author</Label>
                <p className="text-sm">
                  {selectedPost.authorFirmName || selectedPost.authorName || "Anonymous"}
                </p>
              </div>

              {selectedPost.reportedByUsers && selectedPost.reportedByUsers.length > 0 && (
                <div>
                  <Label>Reports</Label>
                  <div className="text-sm text-red-600">
                    Reported {selectedPost.reportedByUsers.length} time(s)
                    {selectedPost.reportReasons && selectedPost.reportReasons.length > 0 && (
                      <div className="mt-1">
                        Reasons: {selectedPost.reportReasons.join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="moderation-status">Status *</Label>
                <Select
                  value={moderationStatus}
                  onValueChange={(value) => setModerationStatus(value as KnowledgePostStatus)}
                >
                  <SelectTrigger id="moderation-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                    <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                    <SelectItem value="REMOVED">Removed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="moderation-notes">Moderation Notes</Label>
                <Textarea
                  id="moderation-notes"
                  placeholder="Optional notes about this moderation decision..."
                  value={moderationNotes}
                  onChange={(e) => setModerationNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsModerationDialogOpen(false);
                setSelectedPost(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleModerate} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


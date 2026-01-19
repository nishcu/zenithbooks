/**
 * Knowledge Exchange - Main Feed Page
 * ICAI-Compliant: Education-only, non-promotional content
 * Access: Verified professionals only
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ThumbsUp, Bookmark, Flag, Plus, Filter, Search } from "lucide-react";
import Link from "next/link";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { listKnowledgePosts, addHelpfulReaction, removeHelpfulReaction, saveKnowledgePost, unsaveKnowledgePost, reportKnowledgePost, hasUserReacted, hasUserSaved } from "@/lib/knowledge/firestore";
import type { KnowledgePost, KnowledgeCategory } from "@/lib/knowledge/types";
import { KNOWLEDGE_CATEGORIES } from "@/lib/knowledge/types";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function KnowledgePage() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const { toast } = useToast();
  const [posts, setPosts] = useState<KnowledgePost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [userReactions, setUserReactions] = useState<Set<string>>(new Set());
  const [userSaves, setUserSaves] = useState<Set<string>>(new Set());

  // Check authorization (verified professionals only)
  useEffect(() => {
    const checkAuthorization = async () => {
      if (!user) {
        setIsAuthorized(false);
        setIsLoading(false);
        router.push("/login");
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) {
          setIsAuthorized(false);
          setIsLoading(false);
          toast({
            variant: "destructive",
            title: "Access Denied",
            description: "Knowledge Exchange is available only to verified professionals.",
          });
          router.push("/dashboard");
          return;
        }

        const userData = userDoc.data();
        const userType = userData?.userType;
        
        // Only professionals can access
        if (userType !== "professional") {
          setIsAuthorized(false);
          setIsLoading(false);
          toast({
            variant: "destructive",
            title: "Access Denied",
            description: "Knowledge Exchange is available only to verified professionals.",
          });
          router.push("/dashboard");
          return;
        }

        setIsAuthorized(true);
        loadPosts();
      } catch (error) {
        console.error("Error checking authorization:", error);
        setIsAuthorized(false);
        setIsLoading(false);
      }
    };

    checkAuthorization();
  }, [user, router, toast]);

  const loadPosts = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const filters: any = {
        status: "PUBLISHED" as const,
        sortBy: "latest" as const,
      };
      
      if (selectedCategory !== "all") {
        filters.category = selectedCategory as KnowledgeCategory;
      }
      
      const fetchedPosts = await listKnowledgePosts(filters);
      setPosts(fetchedPosts);
      
      // Load user reactions and saves
      const reactions = new Set<string>();
      const saves = new Set<string>();
      
      for (const post of fetchedPosts) {
        const hasReacted = await hasUserReacted(post.id, user.uid);
        const hasSaved = await hasUserSaved(post.id, user.uid);
        if (hasReacted) reactions.add(post.id);
        if (hasSaved) saves.add(post.id);
      }
      
      setUserReactions(reactions);
      setUserSaves(saves);
    } catch (error) {
      console.error("Error loading posts:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load knowledge posts.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      loadPosts();
    }
  }, [selectedCategory, isAuthorized]);

  const handleHelpful = async (postId: string) => {
    if (!user) return;
    
    const hasReacted = userReactions.has(postId);
    
    try {
      if (hasReacted) {
        await removeHelpfulReaction(postId, user.uid);
        setUserReactions(prev => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });
      } else {
        await addHelpfulReaction(postId, user.uid);
        setUserReactions(prev => new Set(prev).add(postId));
      }
      
      // Reload to get updated count
      await loadPosts();
    } catch (error) {
      console.error("Error toggling reaction:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update reaction.",
      });
    }
  };

  const handleSave = async (postId: string) => {
    if (!user) return;
    
    const hasSaved = userSaves.has(postId);
    
    try {
      if (hasSaved) {
        await unsaveKnowledgePost(postId, user.uid);
        setUserSaves(prev => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });
      } else {
        await saveKnowledgePost(postId, user.uid);
        setUserSaves(prev => new Set(prev).add(postId));
      }
    } catch (error) {
      console.error("Error toggling save:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save post.",
      });
    }
  };

  const handleReport = async (postId: string, reason: "Promotional" | "Misleading" | "Incorrect" | "Other") => {
    if (!user) return;
    
    try {
      await reportKnowledgePost(postId, user.uid, reason);
      toast({
        title: "Report Submitted",
        description: "Thank you for your report. The content will be reviewed.",
      });
    } catch (error) {
      console.error("Error reporting post:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit report.",
      });
    }
  };

  const filteredPosts = posts.filter((post) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      post.title.toLowerCase().includes(term) ||
      post.content.toLowerCase().includes(term) ||
      post.sourceReference.toLowerCase().includes(term)
    );
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null; // Already redirected
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      {/* Header */}
      <div className="mb-6 space-y-4">
        {/* Title and Action Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Knowledge Exchange</h1>
            <p className="text-muted-foreground">
              Educational content for professional awareness and compliance updates
            </p>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/knowledge/create">
              <Plus className="mr-2 h-4 w-4" />
              Share Knowledge
            </Link>
          </Button>
        </div>

        {/* Compliance Notice - Full Width */}
        <Alert className="w-full">
          <AlertDescription className="text-xs leading-relaxed">
            <strong>ICAI Compliance:</strong> ZenithBooks Knowledge Exchange is an educational, non-commercial feature
            intended solely for professional awareness and compliance updates. No solicitation or professional marketing is permitted.
          </AlertDescription>
        </Alert>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search knowledge posts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {KNOWLEDGE_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Posts Feed */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground py-8">
              No knowledge posts found
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <Card key={post.id} className="border-l-4 border-l-primary">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline">{post.category}</Badge>
                      {post.status === "UNDER_REVIEW" && (
                        <Badge variant="secondary">Under Review</Badge>
                      )}
                    </div>
                    <CardTitle className="text-xl mb-2 break-words">{post.title}</CardTitle>
                    <CardDescription className="text-sm">
                      By {post.authorFirmName || post.authorName || "Anonymous"}
                      {post.authorFirmName && post.authorName && ` (${post.authorName})`}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none mb-4">
                  <div
                    className="whitespace-pre-wrap text-sm text-foreground leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, "<br />") }}
                  />
                </div>
                
                {post.sourceReference && (
                  <div className="mt-4 p-3 bg-muted rounded-md border">
                    <p className="text-xs font-semibold mb-1 text-foreground">Source Reference:</p>
                    <p className="text-xs text-muted-foreground break-words">{post.sourceReference}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleHelpful(post.id)}
                    className={userReactions.has(post.id) ? "text-primary" : ""}
                  >
                    <ThumbsUp className={`mr-2 h-4 w-4 ${userReactions.has(post.id) ? "fill-current" : ""}`} />
                    Helpful ({post.helpfulCount || 0})
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSave(post.id)}
                    className={userSaves.has(post.id) ? "text-primary" : ""}
                  >
                    <Bookmark className={`mr-2 h-4 w-4 ${userSaves.has(post.id) ? "fill-current" : ""}`} />
                    {userSaves.has(post.id) ? "Saved" : "Save"}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      // Simple report - could be enhanced with dialog
                      const reason = prompt("Report reason:\n1. Promotional\n2. Misleading\n3. Incorrect\n4. Other");
                      if (reason) {
                        const reasonMap: { [key: string]: "Promotional" | "Misleading" | "Incorrect" | "Other" } = {
                          "1": "Promotional",
                          "2": "Misleading",
                          "3": "Incorrect",
                          "4": "Other",
                        };
                        handleReport(post.id, reasonMap[reason] || "Other");
                      }
                    }}
                  >
                    <Flag className="mr-2 h-4 w-4" />
                    Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Footer Compliance Text */}
      <div className="mt-8 pt-6 border-t text-center text-xs text-muted-foreground">
        <p>
          ZenithBooks Knowledge Exchange is an educational, non-commercial feature
          intended solely for professional awareness and compliance updates.
          No solicitation or professional marketing is permitted.
        </p>
      </div>
    </div>
  );
}



"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { samplePosts } from "../../blog/page";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { useToast } from "@/hooks/use-toast";

export default function AdminBlog() {
  const { toast } = useToast();
  const [posts, setPosts] = useState(samplePosts);
  const [editTarget, setEditTarget] = useState<typeof samplePosts[number] | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    author: "",
    category: "",
    date: "",
    description: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<typeof samplePosts[number] | null>(null);

  const startEdit = (post: typeof samplePosts[number]) => {
    setEditTarget(post);
    setEditForm({
      title: post.title,
      author: post.author,
      category: post.category,
      date: post.date,
      description: post.description,
    });
  };

  const handleEditChange = (field: keyof typeof editForm, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const savePost = async () => {
    if (!editTarget) return;
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setPosts((prev) =>
      prev.map((post) =>
        post.id === editTarget.id ? { ...post, ...editForm } : post
      )
    );
    toast({
      title: "Post updated",
      description: `${editForm.title} has been saved.`,
    });
    setIsSaving(false);
    setEditTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    setPosts((prev) => prev.filter((post) => post.id !== deleteTarget.id));
    toast({
      variant: "destructive",
      title: "Post deleted",
      description: `${deleteTarget.title} has been removed.`,
    });
    setIsSaving(false);
    setDeleteTarget(null);
  };

  return (
    <>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Manage Blog</h1>
            <p className="text-muted-foreground">
              Create, edit, and manage all your blog posts.
            </p>
          </div>
          <Link href="/admin/blog/new" passHref>
            <Button>
                <PlusCircle className="mr-2"/>
                New Blog Post
            </Button>
          </Link>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>All Blog Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="font-medium">{post.title}</TableCell>
                    <TableCell><Badge variant="outline">{post.category}</Badge></TableCell>
                    <TableCell>{post.author}</TableCell>
                    <TableCell>{format(new Date(post.date), "dd MMM, yyyy")}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => startEdit(post)}><Edit className="mr-2"/> Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onSelect={() => setDeleteTarget(post)}><Trash2 className="mr-2"/> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) {
            setEditTarget(null);
            setIsSaving(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Blog Post</DialogTitle>
            <DialogDescription>Update the metadata shown across the site.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Title"
              value={editForm.title}
              onChange={(event) => handleEditChange("title", event.target.value)}
            />
            <Input
              placeholder="Author"
              value={editForm.author}
              onChange={(event) => handleEditChange("author", event.target.value)}
            />
            <Input
              placeholder="Category"
              value={editForm.category}
              onChange={(event) => handleEditChange("category", event.target.value)}
            />
            <Input
              type="date"
              value={editForm.date}
              onChange={(event) => handleEditChange("date", event.target.value)}
            />
            <Textarea
              placeholder="Short description"
              value={editForm.description}
              onChange={(event) => handleEditChange("description", event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button disabled={isSaving} onClick={savePost}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !isSaving) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={isSaving}
              onClick={(event) => {
                event.preventDefault();
                confirmDelete();
              }}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

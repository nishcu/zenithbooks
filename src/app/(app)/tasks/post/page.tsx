/**
 * Create Collaboration Request Page
 */

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PostTaskForm } from "@/components/tasks/post-task-form";

export default function CreateCollaborationRequestPage() {
  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Create Collaboration Request</CardTitle>
          <CardDescription>
            Create a collaboration request and invite specific firms to participate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PostTaskForm />
        </CardContent>
      </Card>
    </div>
  );
}


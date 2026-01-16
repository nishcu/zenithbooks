/**
 * Post Task Page
 */

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PostTaskForm } from "@/components/tasks/post-task-form";

export default function PostTaskPage() {
  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Post a Task</CardTitle>
          <CardDescription>
            Post your requirement and get matched with qualified professionals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PostTaskForm />
        </CardContent>
      </Card>
    </div>
  );
}


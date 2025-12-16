
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Newspaper } from "lucide-react";

const activities = [
  {
    text: "Rohan Sharma Upgraded to Business Plan.",
    time: "2 minutes ago",
    user: "Rohan Sharma",
  },
  {
    text: "Priya Mehta Used ITC Reconciliation.",
    time: "5 minutes ago",
    user: "Priya Mehta",
  },
  {
    text: "Anjali Singh generated a GSTR-1 Report.",
    time: "15 minutes ago",
    user: "Anjali Singh",
  },
  {
    text: "New User Registered: sales@techcorp.com",
    time: "30 minutes ago",
    user: "System",
  },
    {
    text: "Rohan Sharma Switched to Client Workspace: 'Innovate LLC'",
    time: "45 minutes ago",
    user: "Rohan Sharma",
  },
];

export function ActivityFeed() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Newspaper /> Live Activity Feed
        </CardTitle>
        <CardDescription>
          A real-time stream of important user actions from across the
          platform.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div key={index} className="flex items-start gap-4">
              <div className="flex-1">
                <p className="text-sm">{activity.text}</p>
                <p className="text-xs text-muted-foreground">
                  {activity.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

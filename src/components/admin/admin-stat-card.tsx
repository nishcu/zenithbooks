
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { type LucideIcon } from "lucide-react";

type AdminStatCardProps = {
  title: string;
  icon: LucideIcon;
  mainValue?: string;
  subValue?: string;
};

export function AdminStatCard({
  title,
  icon: Icon,
  mainValue,
  subValue,
}: AdminStatCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {mainValue && <div className="text-2xl font-bold">{mainValue}</div>}
        {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
      </CardContent>
    </Card>
  );
}

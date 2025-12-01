"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

// Loading component for charts
const ChartLoader = () => (
  <div className="flex items-center justify-center h-[300px] w-full">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

// Lazy load Recharts components
export const LazyBarChart = dynamic(
  () => import("recharts").then((mod) => mod.BarChart),
  { 
    loading: () => <ChartLoader />,
    ssr: false 
  }
);

export const LazyPieChart = dynamic(
  () => import("recharts").then((mod) => mod.PieChart),
  { 
    loading: () => <ChartLoader />,
    ssr: false 
  }
);

export const LazyResponsiveContainer = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer),
  { 
    loading: () => <ChartLoader />,
    ssr: false 
  }
);

// Export other chart components that are lighter
export {
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Pie,
  Cell,
} from "recharts";


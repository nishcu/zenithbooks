
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import * as LucideIcons from "lucide-react";
import shortcutData from "@/lib/tally-shortcuts.json";

export default function AppShortcutsPage() {
  const categories = Array.from(new Set(shortcutData.map(s => s.category)));

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">App Shortcuts</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Boost your productivity with these keyboard shortcuts.
        </p>
      </div>

      {categories.map(category => {
          const shortcuts = shortcutData.filter(s => s.category === category);
          return (
            <Card key={category}>
                <CardHeader>
                    <CardTitle>{category}</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[30%]">Action</TableHead>
                                <TableHead className="w-[50%]">Description</TableHead>
                                <TableHead className="w-[20%] text-right">Shortcut</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {shortcuts.map(shortcut => {
                                const Icon = (LucideIcons as any)[shortcut.icon] || LucideIcons.Keyboard;
                                return (
                                <TableRow key={shortcut.name}>
                                    <TableCell className="font-medium flex items-center gap-2"><Icon className="size-4 text-muted-foreground"/>{shortcut.name}</TableCell>
                                    <TableCell className="text-muted-foreground">{shortcut.description}</TableCell>
                                    <TableCell className="text-right">
                                        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                            {shortcut.shortcut}
                                        </kbd>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
          )
      })}
    </div>
  );
}

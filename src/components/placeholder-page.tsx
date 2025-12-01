import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction } from "lucide-react";

type PlaceholderPageProps = {
    title: string;
    description: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center text-center gap-4 py-16">
                    <Construction className="w-16 h-16 text-muted-foreground" />
                    <h2 className="text-2xl font-semibold">Under Construction</h2>
                    <p className="text-muted-foreground max-w-md">{description}</p>
                </div>
            </CardContent>
        </Card>
    );
}

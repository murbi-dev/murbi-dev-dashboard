import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function SummaryCard({
  icon: Icon,
  label,
  value,
  tone = "default",
  mode
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  tone?: "default" | "hotfix" | "done";
  mode: "standard" | "tv";
}) {
  return (
    <Card
      className={cn(
        "border-border shadow-operational",
        tone === "hotfix" && "border-red-200 bg-red-50 dark:border-red-900/70 dark:bg-red-950/40",
        tone === "done" && "border-emerald-200 bg-emerald-50 dark:border-emerald-900/70 dark:bg-emerald-950/40"
      )}
    >
      <CardContent className={cn("flex items-center justify-between p-4", mode === "tv" && "p-5")}>
        <div>
          <p className={cn("font-medium text-muted-foreground", mode === "tv" ? "text-base" : "text-xs")}>{label}</p>
          <p className={cn("font-semibold", mode === "tv" ? "text-4xl" : "text-2xl")}>{value}</p>
        </div>
        <Icon
          className={cn(
            "h-6 w-6 text-muted-foreground",
            mode === "tv" && "h-8 w-8",
            tone === "hotfix" && "text-red-600 dark:text-red-300",
            tone === "done" && "text-emerald-700 dark:text-emerald-300"
          )}
        />
      </CardContent>
    </Card>
  );
}

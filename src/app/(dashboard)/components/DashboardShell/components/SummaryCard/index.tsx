import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
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
      <CardContent className={cn("flex items-center justify-between gap-2 px-2.5 py-1.5", mode === "tv" && "py-1.5")}>
        <div className="flex min-w-0 items-baseline gap-2">
          <p className={cn("shrink-0 font-semibold leading-none", mode === "tv" ? "text-xl" : "text-lg")}>{value}</p>
          <p className={cn("truncate font-medium text-muted-foreground", mode === "tv" ? "text-sm" : "text-xs")}>{label}</p>
        </div>
        <Icon
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground",
            mode === "tv" && "h-5 w-5",
            tone === "hotfix" && "text-red-600 dark:text-red-300",
            tone === "done" && "text-emerald-700 dark:text-emerald-300"
          )}
        />
      </CardContent>
    </Card>
  );
}

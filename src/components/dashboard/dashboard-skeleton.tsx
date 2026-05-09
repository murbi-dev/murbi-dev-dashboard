import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function DashboardSkeleton({ mode }: { mode: "standard" | "tv" }) {
  return (
    <main className={cn("min-h-screen p-4 md:p-6", mode === "tv" && "p-7")}>
      <div className="mx-auto flex max-w-[1920px] flex-col gap-4">
        <div className="flex items-end justify-between border-b pb-4">
          <div>
            <Skeleton className="h-8 w-72" />
            <Skeleton className="mt-2 h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>
        <div className={cn("grid gap-3", mode === "tv" ? "grid-cols-5" : "grid-cols-2 lg:grid-cols-5")}>
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
        <div className={cn("grid gap-3", mode === "tv" ? "grid-cols-5" : "grid-cols-1 xl:grid-cols-5")}>
          {Array.from({ length: 5 }).map((_, column) => (
            <div key={column} className="rounded-lg border bg-card p-3">
              <Skeleton className="h-6 w-32" />
              <div className="mt-4 space-y-3">
                {Array.from({ length: 3 }).map((__, card) => (
                  <Skeleton key={card} className="h-40" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

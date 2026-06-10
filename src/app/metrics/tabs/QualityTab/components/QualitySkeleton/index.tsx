import { Skeleton } from "@/components/ui/Skeleton";

export function QualitySkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Skeleton className="md:col-span-2 h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="md:col-span-2 h-32" />
      </div>
      <Skeleton className="h-28" />
      <Skeleton className="h-48" />
    </div>
  );
}

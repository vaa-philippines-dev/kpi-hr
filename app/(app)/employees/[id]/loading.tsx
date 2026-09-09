import { Skeleton } from "@/components/ui/skeleton";

export default function EmployeeScorecardLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-24 w-40" />
      </div>
      <Skeleton className="h-80 w-full" />
    </div>
  );
}

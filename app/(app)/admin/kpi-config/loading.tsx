import { Skeleton } from "@/components/ui/skeleton";

export default function KpiConfigLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-9 w-28" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

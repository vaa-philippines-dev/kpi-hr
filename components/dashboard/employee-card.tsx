import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { RatingBadge } from "@/components/rating-badge";
import type { EmployeeOverallScore } from "@/lib/dashboard-queries";

export function EmployeeCard({ employee }: { employee: EmployeeOverallScore }) {
  return (
    <Link href={`/employees/${employee.employeeId}`}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardContent className="flex items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className="truncate font-medium">{employee.name}</p>
            <p className="truncate text-sm text-muted-foreground">{employee.role}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="text-lg font-semibold">{employee.score.toFixed(2)}</span>
            <RatingBadge rating={employee.rating} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

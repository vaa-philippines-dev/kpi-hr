import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getLatestResultsForEmployee, getEmployeeOverallScore } from "@/lib/dashboard-queries";
import { RatingBadge } from "@/components/rating-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent, formatScore } from "@/lib/utils";
import type { Rating } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export default async function EmployeeScorecardPage({ params }: { params: { id: string } }) {
  const user = await requireUser();

  const employee = await prisma.employee.findUnique({ where: { id: params.id } });
  if (!employee) notFound();

  const isSelf = user.employeeId === employee.id;
  const isManagerOfTeam =
    (user.role === "HR_MANAGER" && employee.team === "HR") ||
    (user.role === "RECRUITMENT_MANAGER" && employee.team === "RECRUITMENT");
  const canView = isSelf || isManagerOfTeam || user.role === "ADMIN" || user.role === "VIEWER";

  if (!canView) redirect("/dashboard");

  const [results, overall] = await Promise.all([
    getLatestResultsForEmployee(employee.id),
    getEmployeeOverallScore(employee.id),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{employee.name}</h1>
          <p className="text-sm text-muted-foreground">
            {employee.role} · {employee.team}
          </p>
        </div>
        {overall && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Overall Score
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <span className="text-2xl font-semibold">{formatScore(overall.score)}</span>
              <RatingBadge rating={overall.rating as Rating} />
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>KPI Scorecard</CardTitle>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No KPI results yet for this employee. Configure KPIs in{" "}
              <span className="font-medium">KPI Config</span> and run the scoring engine.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>KPI</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Achievement</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="text-right">Weight</TableHead>
                  <TableHead className="text-right">Weighted Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.kpiName}
                      {r.sampleSize !== null && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          ({r.sampleSize} evaluated)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{Number(r.target).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{Number(r.actual).toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      {formatPercent(Number(r.achievement))}
                    </TableCell>
                    <TableCell className="text-right">{formatScore(Number(r.score))}</TableCell>
                    <TableCell>
                      <RatingBadge rating={r.rating as Rating} />
                    </TableCell>
                    <TableCell className="text-right">{Number(r.weight).toFixed(0)}%</TableCell>
                    <TableCell className="text-right">
                      {Number(r.weightedScore).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

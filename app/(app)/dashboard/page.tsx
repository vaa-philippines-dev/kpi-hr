import {
  getAllEmployeeScores,
  getDemandSummary,
  getRecruitmentHeadlineMetrics,
  getTeamOverallScore,
} from "@/lib/dashboard-queries";
import { RATING_STYLES } from "@/lib/ratings";
import { ScoreTile, MetricTile } from "@/components/dashboard/metric-tile";
import { EmployeeCard } from "@/components/dashboard/employee-card";
import { formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [hrScore, recruitmentScore, employees, demand, recruitmentMetrics] = await Promise.all([
    getTeamOverallScore("HR"),
    getTeamOverallScore("RECRUITMENT"),
    getAllEmployeeScores(),
    getDemandSummary(),
    getRecruitmentHeadlineMetrics(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Team and individual performance, derived automatically from operational data.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ScoreTile
          label="HR Overall Score"
          score={hrScore.score}
          rating={hrScore.rating}
          ratingBadgeClass={RATING_STYLES[hrScore.rating].badgeClass}
        />
        <ScoreTile
          label="Recruitment Overall Score"
          score={recruitmentScore.score}
          rating={recruitmentScore.rating}
          ratingBadgeClass={RATING_STYLES[recruitmentScore.rating].badgeClass}
        />
        <MetricTile
          label="Open Recruitment Demand"
          value={String(demand.openDemand)}
          subtext="Incoming demand not yet client-ready"
        />
        <MetricTile
          label="Pipeline Coverage"
          value={formatPercent(demand.coveragePct, 0)}
          subtext="Client-ready ÷ incoming demand"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricTile
          label="Hires This Month vs Target"
          value={`${recruitmentMetrics.hiresActual} / ${recruitmentMetrics.hiresTarget}`}
          subtext="Sum across all recruiters, current period"
        />
        <MetricTile
          label="Time-to-Fill SLA"
          value={
            recruitmentMetrics.ttfSlaPct !== null
              ? formatPercent(recruitmentMetrics.ttfSlaPct, 0)
              : "—"
          }
          subtext="Average achievement vs days-to-fill target"
        />
        <MetricTile
          label="Quality of Hire"
          value={
            recruitmentMetrics.qualityPct !== null
              ? formatPercent(recruitmentMetrics.qualityPct, 0)
              : "—"
          }
          subtext={
            recruitmentMetrics.qualitySampleSize > 0
              ? `${recruitmentMetrics.qualitySampleSize} hires evaluated`
              : "No hires evaluated yet"
          }
        />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Employees</h2>
        {employees.length === 0 ? (
          <p className="text-sm text-muted-foreground">No employees yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {employees.map((emp) => (
              <EmployeeCard key={emp.employeeId} employee={emp} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

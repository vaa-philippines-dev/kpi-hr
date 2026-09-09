import { prisma } from "@/lib/prisma";
import { calculateKpiResult, type Direction } from "@/lib/scoring";
import type { KPIConfig, Period } from "@prisma/client";

/**
 * Turns operational records into an "actual" number for one employee/period/KPI.
 * This is the only layer allowed to read HRActivityLog / RecruitmentCandidate /
 * RecruitmentHire and compute a metric — every KPIResult.actual in the system
 * must come from here, never from manual entry.
 *
 * KPIConfig.dataSource/calculationType are the human-readable description of
 * what a KPI measures; this registry (keyed by kpiName) is that description's
 * executable counterpart. Add a new KPI by adding a config row *and* a matching
 * entry here.
 */
// null means "nothing to measure this period" (e.g. an average over zero
// events) — distinct from a real actual of 0, which is scored normally. The
// engine skips writing a KPIResult for that employee/period/KPI rather than
// inventing a perfect or zero score for data that doesn't exist.
type MetricResult = { actual: number; sampleSize?: number } | null;
type MetricFn = (employeeId: string, period: Period) => Promise<MetricResult>;

export const KPI_METRICS: Record<string, MetricFn> = {
  "HR Activity Volume": async (employeeId, period) => {
    const count = await prisma.hRActivityLog.count({
      where: { employeeId, receivedDate: { gte: period.startDate, lte: period.endDate } },
    });
    return { actual: count };
  },

  "HR Request SLA Compliance": async (employeeId, period) => {
    const completed = await prisma.hRActivityLog.findMany({
      where: {
        employeeId,
        completedDate: { gte: period.startDate, lte: period.endDate },
        slaStatus: { in: ["ON_TIME", "LATE"] },
      },
      select: { slaStatus: true },
    });
    if (completed.length === 0) return { actual: 1 }; // nothing due — treat as fully compliant
    const onTime = completed.filter((c) => c.slaStatus === "ON_TIME").length;
    return { actual: onTime / completed.length };
  },

  "Average COE Turnaround (Days)": async (employeeId, period) => {
    const rows = await prisma.hRActivityLog.findMany({
      where: {
        employeeId,
        activityType: "COE",
        completedDate: { gte: period.startDate, lte: period.endDate },
      },
      select: { receivedDate: true, completedDate: true },
    });
    if (rows.length === 0) return null; // nothing completed this period — not "0-day turnaround"
    const totalDays = rows.reduce((sum, r) => {
      const days = (r.completedDate!.getTime() - r.receivedDate.getTime()) / 86_400_000;
      return sum + days;
    }, 0);
    return { actual: totalDays / rows.length };
  },

  "Sourcing Activity": async (employeeId, period) => {
    const count = await prisma.recruitmentCandidate.count({
      where: { recruiterId: employeeId, dateSourced: { gte: period.startDate, lte: period.endDate } },
    });
    return { actual: count };
  },

  "Hires vs Target": async (employeeId, period) => {
    const count = await prisma.recruitmentHire.count({
      where: { recruiterId: employeeId, hireDate: { gte: period.startDate, lte: period.endDate } },
    });
    return { actual: count };
  },

  "Time to Fill (Days)": async (employeeId, period) => {
    const hires = await prisma.recruitmentHire.findMany({
      where: { recruiterId: employeeId, hireDate: { gte: period.startDate, lte: period.endDate } },
      include: { candidate: { select: { applicationDate: true } } },
    });
    if (hires.length === 0) return null; // no hires this period — not "0-day time-to-fill"
    const totalDays = hires.reduce((sum, h) => {
      const days = (h.hireDate.getTime() - h.candidate.applicationDate.getTime()) / 86_400_000;
      return sum + days;
    }, 0);
    return { actual: totalDays / hires.length };
  },

  "Quality of Hire": async (employeeId, period) => {
    // Rolling cohort: only hires whose evaluation milestone is actually due or
    // complete count. Attribution-cleared outcomes (NOT_ATTRIBUTABLE) are
    // excluded from the denominator entirely — they were never the recruiter's
    // fault to begin with, so they neither help nor hurt the score.
    const hires = await prisma.recruitmentHire.findMany({
      where: {
        recruiterId: employeeId,
        OR: [
          { day30Status: { in: ["DUE", "COMPLETED", "OVERDUE"] } },
          { day60Status: { in: ["DUE", "COMPLETED", "OVERDUE"] } },
          { day90Status: { in: ["DUE", "COMPLETED", "OVERDUE"] } },
        ],
        attributionStatus: { not: "PENDING_REVIEW" },
        qualityScore: { not: null },
      },
      select: { qualityScore: true, attributionStatus: true },
    });

    const evaluable = hires.filter((h) => h.attributionStatus !== "NOT_ATTRIBUTABLE");
    if (evaluable.length === 0) return { actual: 1, sampleSize: 0 };

    const avg =
      evaluable.reduce((sum, h) => sum + Number(h.qualityScore), 0) / evaluable.length / 100;
    return { actual: avg, sampleSize: evaluable.length };
  },
};

export interface RecomputeResult {
  employeeId: string;
  kpiName: string;
  skipped?: string;
}

/** Recomputes and persists KPIResult rows for one employee/period, across all
 * of that employee's active KPIConfigs whose frequency matches the period. */
export async function recomputeKpiResultsForEmployee(
  employeeId: string,
  period: Period
): Promise<RecomputeResult[]> {
  const configs = await prisma.kPIConfig.findMany({
    where: { employeeId, active: true, effectiveDate: { lte: period.endDate } },
  });

  const results: RecomputeResult[] = [];

  for (const config of configs) {
    if (config.endDate && config.endDate < period.startDate) continue;
    if (!frequencyMatchesPeriod(config, period)) continue;

    const metric = KPI_METRICS[config.kpiName];
    if (!metric) {
      results.push({ employeeId, kpiName: config.kpiName, skipped: "no metric registered" });
      continue;
    }

    const metricResult = await metric(employeeId, period);
    if (metricResult === null) {
      results.push({ employeeId, kpiName: config.kpiName, skipped: "no underlying data this period" });
      continue;
    }
    const { actual, sampleSize } = metricResult;

    const scored = calculateKpiResult({
      actual,
      target: Number(config.target),
      weight: Number(config.weight),
      direction: config.direction as Direction,
    });

    await prisma.kPIResult.upsert({
      where: { periodId_employeeId_kpiName: { periodId: period.id, employeeId, kpiName: config.kpiName } },
      create: {
        period: { connect: { id: period.id } },
        employee: { connect: { id: employeeId } },
        kpiName: config.kpiName,
        target: scored.target,
        actual: scored.actual,
        achievement: scored.achievement,
        score: scored.score,
        rating: scored.rating,
        weight: scored.weight,
        weightedScore: scored.weightedScore,
        sampleSize,
      },
      update: {
        target: scored.target,
        actual: scored.actual,
        achievement: scored.achievement,
        score: scored.score,
        rating: scored.rating,
        weight: scored.weight,
        weightedScore: scored.weightedScore,
        sampleSize,
        calculatedAt: new Date(),
      },
    });

    results.push({ employeeId, kpiName: config.kpiName });
  }

  return results;
}

function frequencyMatchesPeriod(config: KPIConfig, period: Period): boolean {
  if (config.frequency === "WEEKLY") return period.periodType === "WEEK";
  if (config.frequency === "MONTHLY") return period.periodType === "MONTH";
  if (config.frequency === "COHORT") return period.periodType === "ROLLING_90";
  return false;
}

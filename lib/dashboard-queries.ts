import { prisma } from "@/lib/prisma";
import { calculateRating, sumWeightedScores, type Rating } from "@/lib/scoring";

export interface EmployeeOverallScore {
  employeeId: string;
  name: string;
  team: "HR" | "RECRUITMENT";
  role: string;
  score: number;
  rating: Rating;
}

/** Latest KPIResult per kpiName for an employee — "current" value of every KPI
 * regardless of which clock (weekly/monthly/cohort) it runs on. */
export async function getLatestResultsForEmployee(employeeId: string) {
  return prisma.kPIResult.findMany({
    where: { employeeId },
    orderBy: { calculatedAt: "desc" },
    distinct: ["kpiName"],
  });
}

export async function getEmployeeOverallScore(employeeId: string): Promise<{
  score: number;
  rating: Rating;
} | null> {
  const results = await getLatestResultsForEmployee(employeeId);
  if (results.length === 0) return null;
  const totalWeightedScore = sumWeightedScores(
    results.map((r) => ({ weightedScore: Number(r.weightedScore) }))
  );
  const totalWeight = results.reduce((sum, r) => sum + Number(r.weight), 0);
  const score = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  return { score, rating: calculateRating(score) };
}

export async function getAllEmployeeScores(): Promise<EmployeeOverallScore[]> {
  const employees = await prisma.employee.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  const scored = await Promise.all(
    employees.map(async (emp) => {
      const overall = await getEmployeeOverallScore(emp.id);
      return {
        employeeId: emp.id,
        name: emp.name,
        team: emp.team,
        role: emp.role,
        score: overall?.score ?? 0,
        rating: overall?.rating ?? calculateRating(0),
      };
    })
  );

  return scored;
}

export async function getTeamOverallScore(team: "HR" | "RECRUITMENT") {
  const scores = await getAllEmployeeScores();
  const teamScores = scores.filter((s) => s.team === team);
  if (teamScores.length === 0) return { score: 0, rating: calculateRating(0) };
  const avg = teamScores.reduce((sum, s) => sum + s.score, 0) / teamScores.length;
  return { score: avg, rating: calculateRating(avg) };
}

export async function getDemandSummary() {
  const rows = await prisma.demandPlanning.findMany({ orderBy: { role: "asc" } });
  const totals = rows.reduce(
    (acc, r) => {
      acc.available += r.available;
      acc.clientReady += r.clientReady;
      acc.incomingDemand += r.incomingDemand;
      return acc;
    },
    { available: 0, clientReady: 0, incomingDemand: 0 }
  );
  const openDemand = Math.max(0, totals.incomingDemand - totals.clientReady);
  const coveragePct = totals.incomingDemand > 0 ? totals.clientReady / totals.incomingDemand : 1;
  return { rows, totals, openDemand, coveragePct };
}

export async function getRecruitmentHeadlineMetrics() {
  const recruiters = await prisma.employee.findMany({
    where: { team: "RECRUITMENT", active: true },
  });

  const hiresResults = await Promise.all(
    recruiters.map((r) =>
      prisma.kPIResult.findFirst({
        where: { employeeId: r.id, kpiName: "Hires vs Target" },
        orderBy: { calculatedAt: "desc" },
      })
    )
  );
  const timeToFillResults = await Promise.all(
    recruiters.map((r) =>
      prisma.kPIResult.findFirst({
        where: { employeeId: r.id, kpiName: "Time to Fill (Days)" },
        orderBy: { calculatedAt: "desc" },
      })
    )
  );
  const qualityResults = await Promise.all(
    recruiters.map((r) =>
      prisma.kPIResult.findFirst({
        where: { employeeId: r.id, kpiName: "Quality of Hire" },
        orderBy: { calculatedAt: "desc" },
      })
    )
  );

  const validHires = hiresResults.filter((r): r is NonNullable<typeof r> => !!r);
  const hiresActual = validHires.reduce((sum, r) => sum + Number(r.actual), 0);
  const hiresTarget = validHires.reduce((sum, r) => sum + Number(r.target), 0);

  const validTtf = timeToFillResults.filter((r): r is NonNullable<typeof r> => !!r);
  const ttfSlaPct =
    validTtf.length > 0
      ? validTtf.reduce((sum, r) => sum + Math.min(1, Number(r.achievement)), 0) / validTtf.length
      : null;

  const validQuality = qualityResults.filter((r): r is NonNullable<typeof r> => !!r);
  const qualitySampleSize = validQuality.reduce((sum, r) => sum + (r.sampleSize ?? 0), 0);
  const qualityPct =
    qualitySampleSize > 0
      ? validQuality.reduce((sum, r) => sum + Number(r.actual) * (r.sampleSize ?? 0), 0) /
        qualitySampleSize
      : null;

  return { hiresActual, hiresTarget, ttfSlaPct, qualityPct, qualitySampleSize };
}

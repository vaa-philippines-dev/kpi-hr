/**
 * Seeds Employees, KPIConfigs, Periods, and enough realistic underlying
 * operational data (HRActivityLog / RecruitmentCandidate / RecruitmentHire) for
 * the KPI engine (lib/kpi-engine.ts) to derive real KPIResult rows — nothing in
 * here writes a KPI percentage directly.
 */
import { PrismaClient } from "@prisma/client";
import {
  startOfWeek,
  subWeeks,
  startOfMonth,
  subMonths,
  endOfMonth,
  subDays,
  addDays,
  format,
} from "date-fns";
import { recomputeKpiResultsForEmployee } from "../lib/kpi-engine";

const prisma = new PrismaClient();
const now = new Date();

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function randInt(min: number, max: number) {
  return Math.floor(rand(min, max + 1));
}
function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

const HR_ACTIVITY_TYPES = [
  "ONBOARDING",
  "OFFBOARDING",
  "COE",
  "PAYSTUB",
  "EMPLOYEE_RELATIONS",
  "PAYONEER",
  "REFERRAL",
  "FINANCIAL_ASSISTANCE",
  "BENEFITS",
  "LOAN",
  "TIMEKEEPING",
  "DOCUMENTATION",
  "QA",
];

async function main() {
  console.log("Seeding…");

  // --- Employees -----------------------------------------------------------
  const hrEmployees = await Promise.all(
    [
      { name: "Maria Santos", role: "HR Manager", email: "maria.santos@vaaphilippines.com" },
      { name: "Liza Cruz", role: "HR Staff", email: "liza.cruz@vaaphilippines.com" },
      { name: "Noel Reyes", role: "HR Staff", email: "noel.reyes@vaaphilippines.com" },
    ].map((e) =>
      prisma.employee.upsert({
        where: { email: e.email },
        create: { ...e, team: "HR" },
        update: {},
      })
    )
  );

  const recruitmentEmployees = await Promise.all(
    [
      {
        name: "Carlo Dimaguila",
        role: "Recruitment Team Lead",
        email: "carlo.dimaguila@vaaphilippines.com",
      },
      { name: "Anna Villamor", role: "Recruiter", email: "anna.villamor@vaaphilippines.com" },
      { name: "Jared Tan", role: "Recruiter", email: "jared.tan@vaaphilippines.com" },
    ].map((e) =>
      prisma.employee.upsert({
        where: { email: e.email },
        create: { ...e, team: "RECRUITMENT" },
        update: {},
      })
    )
  );

  // The signed-in operator's own employee record, so their first Google login
  // resolves to a real Employee. Role defaults to VIEWER on first login —
  // promote to ADMIN with: npm run promote-admin -- system-admin@vaaphilippines.com
  await prisma.employee.upsert({
    where: { email: "system-admin@vaaphilippines.com" },
    create: {
      name: "System Admin",
      role: "Administrator",
      email: "system-admin@vaaphilippines.com",
      team: "HR",
    },
    update: {},
  });

  // --- KPI Configs -----------------------------------------------------------
  const effectiveDate = startOfMonth(subMonths(now, 3));

  for (const emp of hrEmployees) {
    await upsertConfig(emp.id, {
      kpiName: "HR Activity Volume",
      weight: 30,
      target: 40,
      unit: "count",
      frequency: "WEEKLY",
      direction: "HIGHER_IS_BETTER",
      calculationType: "Count of HRActivityLog rows received in the week",
      dataSource: "HRActivityLog.receivedDate",
    });
    await upsertConfig(emp.id, {
      kpiName: "HR Request SLA Compliance",
      weight: 40,
      target: 0.95,
      unit: "%",
      frequency: "MONTHLY",
      direction: "HIGHER_IS_BETTER",
      calculationType: "On-time completions / total completions in the month",
      dataSource: "HRActivityLog.completedDate, HRActivityLog.slaStatus",
    });
    await upsertConfig(emp.id, {
      kpiName: "Average COE Turnaround (Days)",
      weight: 30,
      target: 3,
      unit: "days",
      frequency: "MONTHLY",
      direction: "LOWER_IS_BETTER",
      calculationType: "Average(completedDate - receivedDate) for COE requests completed in the month",
      dataSource: "HRActivityLog (activityType = COE)",
    });
  }

  for (const emp of recruitmentEmployees) {
    await upsertConfig(emp.id, {
      kpiName: "Sourcing Activity",
      weight: 20,
      target: 15,
      unit: "count",
      frequency: "WEEKLY",
      direction: "HIGHER_IS_BETTER",
      calculationType: "Count of candidates sourced in the week",
      dataSource: "RecruitmentCandidate.dateSourced",
    });
    await upsertConfig(emp.id, {
      kpiName: "Hires vs Target",
      weight: 35,
      target: 4,
      unit: "hires",
      frequency: "MONTHLY",
      direction: "HIGHER_IS_BETTER",
      calculationType: "Count of RecruitmentHire rows whose hireDate falls in the month",
      dataSource: "RecruitmentHire.hireDate",
    });
    await upsertConfig(emp.id, {
      kpiName: "Time to Fill (Days)",
      weight: 25,
      target: 30,
      unit: "days",
      frequency: "MONTHLY",
      direction: "LOWER_IS_BETTER",
      calculationType: "Average(hireDate - applicationDate) for hires in the month",
      dataSource: "RecruitmentHire.hireDate, RecruitmentCandidate.applicationDate",
    });
    await upsertConfig(emp.id, {
      kpiName: "Quality of Hire",
      weight: 20,
      target: 0.85,
      unit: "%",
      frequency: "COHORT",
      direction: "HIGHER_IS_BETTER",
      slaTargetDays: 90,
      calculationType:
        "Average qualityScore across hires with a due/completed Day30/60/90 milestone, excluding NOT_ATTRIBUTABLE outcomes",
      dataSource: "RecruitmentHire.qualityScore, RecruitmentHire.attributionStatus",
    });
  }

  async function upsertConfig(
    employeeId: string,
    cfg: {
      kpiName: string;
      weight: number;
      target: number;
      unit: string;
      frequency: "WEEKLY" | "MONTHLY" | "COHORT";
      direction: "HIGHER_IS_BETTER" | "LOWER_IS_BETTER";
      calculationType: string;
      dataSource: string;
      slaTargetDays?: number;
    }
  ) {
    const existing = await prisma.kPIConfig.findFirst({ where: { employeeId, kpiName: cfg.kpiName } });
    if (existing) {
      await prisma.kPIConfig.update({ where: { id: existing.id }, data: { ...cfg, effectiveDate } });
    } else {
      await prisma.kPIConfig.create({ data: { employeeId, ...cfg, effectiveDate } });
    }
  }

  // --- Periods -----------------------------------------------------------
  const weekPeriods = [];
  for (let i = 3; i >= 0; i--) {
    const start = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), i);
    const end = addDays(start, 6);
    const label = `${format(start, "RRRR")}-W${format(start, "II")}`;
    weekPeriods.push(
      await prisma.period.upsert({
        where: { periodType_label: { periodType: "WEEK", label } },
        create: {
          periodType: "WEEK",
          label,
          startDate: start,
          endDate: end,
          status: i === 0 ? "OPEN" : "CLOSED",
        },
        update: {},
      })
    );
  }

  const monthPeriods = [];
  for (let i = 2; i >= 0; i--) {
    const start = startOfMonth(subMonths(now, i));
    const end = endOfMonth(start);
    const label = format(start, "yyyy-MM");
    monthPeriods.push(
      await prisma.period.upsert({
        where: { periodType_label: { periodType: "MONTH", label } },
        create: {
          periodType: "MONTH",
          label,
          startDate: start,
          endDate: end,
          status: i === 0 ? "OPEN" : "CLOSED",
        },
        update: {},
      })
    );
  }

  const rollingLabel = "ROLLING-90-CURRENT";
  const rollingPeriod = await prisma.period.upsert({
    where: { periodType_label: { periodType: "ROLLING_90", label: rollingLabel } },
    create: {
      periodType: "ROLLING_90",
      label: rollingLabel,
      startDate: subDays(now, 90),
      endDate: now,
      status: "OPEN",
    },
    update: { endDate: now },
  });

  // --- Operational data: HR ------------------------------------------------
  for (const emp of hrEmployees) {
    await prisma.hRActivityLog.deleteMany({ where: { employeeId: emp.id } });
    const rows = [];
    for (let i = 0; i < 130; i++) {
      const receivedDate = subDays(now, randInt(0, 95));
      const activityType = pick(HR_ACTIVITY_TYPES);
      const turnaroundTarget = activityType === "COE" ? 3 : 5;
      const dueDate = addDays(receivedDate, turnaroundTarget);
      const isCompleted = receivedDate < subDays(now, 1) && Math.random() < 0.85;
      const completedDate = isCompleted
        ? addDays(receivedDate, randInt(0, turnaroundTarget + 3))
        : null;
      const slaStatus = !isCompleted
        ? "PENDING"
        : completedDate! <= dueDate
          ? "ON_TIME"
          : "LATE";
      rows.push({
        employeeId: emp.id,
        activityType,
        receivedDate,
        dueDate,
        completedDate,
        slaStatus: slaStatus as "PENDING" | "ON_TIME" | "LATE",
      });
    }
    await prisma.hRActivityLog.createMany({ data: rows });
  }

  // --- Operational data: Recruitment ---------------------------------------
  const roles = ["Customer Service Rep", "Technical Support", "Accounts Associate", "Team Lead"];
  const sources = ["Referral", "Job Board", "Agency", "Career Site", "Social Media"];
  let applicationCounter = 1;

  for (const emp of recruitmentEmployees) {
    await prisma.recruitmentHire.deleteMany({ where: { recruiterId: emp.id } });
    await prisma.recruitmentCandidate.deleteMany({ where: { recruiterId: emp.id } });

    for (let i = 0; i < 40; i++) {
      const applicationDate = subDays(now, randInt(5, 150));
      const dateSourced = subDays(applicationDate, randInt(0, 3));
      const willHire = Math.random() < 0.4;
      const applicationId = `APP-${String(applicationCounter++).padStart(5, "0")}`;

      const candidate = await prisma.recruitmentCandidate.create({
        data: {
          applicationId,
          fullName: `Candidate ${applicationId}`,
          recruiterId: emp.id,
          role: pick(roles),
          source: pick(sources),
          dateSourced,
          applicationDate,
          screeningDate: addDays(applicationDate, 2),
          interviewDate: addDays(applicationDate, 5),
          endorsementDate: willHire ? addDays(applicationDate, 8) : null,
          offerDate: willHire ? addDays(applicationDate, 12) : null,
          hireDate: willHire ? addDays(applicationDate, randInt(14, 40)) : null,
          startDate: willHire ? addDays(applicationDate, randInt(21, 47)) : null,
          stage: willHire
            ? "HIRED"
            : pick(["SCREENED", "INTERVIEWED", "REJECTED", "WITHDRAWN"] as const),
          status: willHire ? "Active" : "Closed",
        },
      });

      if (willHire && candidate.hireDate && candidate.startDate && candidate.startDate <= now) {
        const startDate = candidate.startDate;
        const day30Due = addDays(startDate, 30);
        const day60Due = addDays(startDate, 60);
        const day90Due = addDays(startDate, 90);

        const milestoneStatus = (due: Date): "NOT_DUE" | "DUE" | "COMPLETED" | "OVERDUE" => {
          if (due > now) return "NOT_DUE";
          if (Math.random() < 0.85) return "COMPLETED";
          const daysOverdue = (now.getTime() - due.getTime()) / 86_400_000;
          return daysOverdue > 14 ? "OVERDUE" : "DUE";
        };

        const day30Status = milestoneStatus(day30Due);
        const day60Status = milestoneStatus(day60Due);
        const day90Status = milestoneStatus(day90Due);

        const anyEvaluated = [day30Status, day60Status, day90Status].includes("COMPLETED");
        const performanceScore = anyEvaluated ? rand(60, 98) : null;
        const clientSatisfaction = anyEvaluated ? rand(60, 98) : null;
        const attendanceScore = anyEvaluated ? rand(70, 100) : null;
        const trainingQAScore = anyEvaluated ? rand(65, 99) : null;
        const qualityScore = anyEvaluated
          ? (performanceScore! + clientSatisfaction! + attendanceScore! + trainingQAScore!) / 4
          : null;

        const attributionStatus: "PENDING_REVIEW" | "RECRUITER_ATTRIBUTABLE" | "NOT_ATTRIBUTABLE" =
          !anyEvaluated
            ? "PENDING_REVIEW"
            : qualityScore! < 75
              ? pick(["RECRUITER_ATTRIBUTABLE", "NOT_ATTRIBUTABLE"] as const)
              : "PENDING_REVIEW";

        await prisma.recruitmentHire.create({
          data: {
            candidateId: candidate.id,
            recruiterId: emp.id,
            role: candidate.role,
            hireDate: candidate.hireDate,
            startDate,
            hiringCohort: format(startDate, "yyyy-MM"),
            day30DueDate: day30Due,
            day60DueDate: day60Due,
            day90DueDate: day90Due,
            day30Status,
            day60Status,
            day90Status,
            performanceScore,
            clientSatisfaction,
            attendanceScore,
            trainingQAScore,
            qualityScore,
            attributionStatus,
            evaluationStatus: anyEvaluated ? "Evaluated" : "Pending",
          },
        });
      }
    }
  }

  // --- Demand planning sample rows -----------------------------------------
  await prisma.demandPlanning.deleteMany();
  await prisma.demandPlanning.createMany({
    data: [
      { role: "Customer Service Rep", available: 6, clientReady: 4, incomingDemand: 10 },
      { role: "Technical Support", available: 3, clientReady: 3, incomingDemand: 4 },
      { role: "Accounts Associate", available: 2, clientReady: 1, incomingDemand: 6 },
      { role: "Team Lead", available: 1, clientReady: 1, incomingDemand: 1 },
    ],
  });

  // --- Compute KPIResult rows via the real scoring engine -------------------
  const allEmployees = [...hrEmployees, ...recruitmentEmployees];
  for (const emp of allEmployees) {
    for (const period of weekPeriods) {
      await recomputeKpiResultsForEmployee(emp.id, period);
    }
    for (const period of monthPeriods) {
      await recomputeKpiResultsForEmployee(emp.id, period);
    }
    await recomputeKpiResultsForEmployee(emp.id, rollingPeriod);
  }

  // --- One snapshot per closed period, demonstrating the append-only history
  const closedPeriods = [...weekPeriods, ...monthPeriods].filter((p) => p.status === "CLOSED");
  for (const period of closedPeriods) {
    const results = await prisma.kPIResult.findMany({ where: { periodId: period.id } });
    for (const r of results) {
      await prisma.kPISnapshot.create({
        data: {
          periodId: r.periodId,
          employeeId: r.employeeId,
          kpiName: r.kpiName,
          actual: r.actual,
          target: r.target,
          achievement: r.achievement,
          score: r.score,
          rating: r.rating,
          weightedScore: r.weightedScore,
          sampleSize: r.sampleSize,
        },
      });
    }
  }

  console.log(
    `Seeded ${allEmployees.length} employees, ${weekPeriods.length + monthPeriods.length + 1} periods.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, type CurrentUser } from "@/lib/auth";
import type { Direction, Frequency } from "@prisma/client";

export interface KpiConfigInput {
  employeeId: string;
  kpiName: string;
  weight: number;
  target: number;
  unit: string;
  frequency: Frequency;
  direction: Direction;
  calculationType: string;
  dataSource: string;
  slaTargetDays: number | null;
  active: boolean;
  effectiveDate: string;
  endDate: string | null;
}

async function assertCanManage(user: CurrentUser, employeeTeam: "HR" | "RECRUITMENT") {
  if (user.role === "ADMIN") return;
  if (user.role === "HR_MANAGER" && employeeTeam === "HR") return;
  if (user.role === "RECRUITMENT_MANAGER" && employeeTeam === "RECRUITMENT") return;
  throw new Error("Not authorized to manage KPI configs for this team.");
}

async function writeAudit(
  userId: string,
  action: "CREATE" | "UPDATE" | "DELETE",
  recordId: string,
  oldValue: unknown,
  newValue: unknown
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      recordType: "KPIConfig",
      recordId,
      oldValue: oldValue ? JSON.parse(JSON.stringify(oldValue)) : undefined,
      newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : undefined,
      source: "admin/kpi-config",
    },
  });
}

export async function createKpiConfig(input: KpiConfigInput) {
  const user = await requireRole("ADMIN", "HR_MANAGER", "RECRUITMENT_MANAGER");
  const employee = await prisma.employee.findUniqueOrThrow({ where: { id: input.employeeId } });
  await assertCanManage(user, employee.team);

  const created = await prisma.kPIConfig.create({
    data: {
      employeeId: input.employeeId,
      kpiName: input.kpiName,
      weight: input.weight,
      target: input.target,
      unit: input.unit,
      frequency: input.frequency,
      direction: input.direction,
      calculationType: input.calculationType,
      dataSource: input.dataSource,
      slaTargetDays: input.slaTargetDays,
      active: input.active,
      effectiveDate: new Date(input.effectiveDate),
      endDate: input.endDate ? new Date(input.endDate) : null,
    },
  });

  await writeAudit(user.id, "CREATE", created.id, null, created);
  revalidatePath("/admin/kpi-config");
}

export async function updateKpiConfig(id: string, input: KpiConfigInput) {
  const user = await requireRole("ADMIN", "HR_MANAGER", "RECRUITMENT_MANAGER");
  const existing = await prisma.kPIConfig.findUniqueOrThrow({
    where: { id },
    include: { employee: true },
  });
  await assertCanManage(user, existing.employee.team);

  const updated = await prisma.kPIConfig.update({
    where: { id },
    data: {
      kpiName: input.kpiName,
      weight: input.weight,
      target: input.target,
      unit: input.unit,
      frequency: input.frequency,
      direction: input.direction,
      calculationType: input.calculationType,
      dataSource: input.dataSource,
      slaTargetDays: input.slaTargetDays,
      active: input.active,
      effectiveDate: new Date(input.effectiveDate),
      endDate: input.endDate ? new Date(input.endDate) : null,
    },
  });

  await writeAudit(user.id, "UPDATE", id, existing, updated);
  revalidatePath("/admin/kpi-config");
}

export async function deleteKpiConfig(id: string) {
  const user = await requireRole("ADMIN", "HR_MANAGER", "RECRUITMENT_MANAGER");
  const existing = await prisma.kPIConfig.findUniqueOrThrow({
    where: { id },
    include: { employee: true },
  });
  await assertCanManage(user, existing.employee.team);

  await prisma.kPIConfig.delete({ where: { id } });
  await writeAudit(user.id, "DELETE", id, existing, null);
  revalidatePath("/admin/kpi-config");
}

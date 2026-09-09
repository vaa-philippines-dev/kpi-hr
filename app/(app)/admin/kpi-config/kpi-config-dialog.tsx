"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createKpiConfig, updateKpiConfig, type KpiConfigInput } from "./actions";
import type { KPIConfig } from "@prisma/client";

interface EmployeeOption {
  id: string;
  name: string;
  team: string;
}

function toDateInputValue(date: Date | null | undefined) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

function emptyForm(employees: EmployeeOption[]): KpiConfigInput {
  return {
    employeeId: employees[0]?.id ?? "",
    kpiName: "",
    weight: 10,
    target: 0,
    unit: "%",
    frequency: "MONTHLY",
    direction: "HIGHER_IS_BETTER",
    calculationType: "",
    dataSource: "",
    slaTargetDays: null,
    active: true,
    effectiveDate: toDateInputValue(new Date()),
    endDate: null,
  };
}

export function KpiConfigDialog({
  employees,
  config,
  trigger,
}: {
  employees: EmployeeOption[];
  config?: KPIConfig;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<KpiConfigInput>(
    config
      ? {
          employeeId: config.employeeId,
          kpiName: config.kpiName,
          weight: Number(config.weight),
          target: Number(config.target),
          unit: config.unit,
          frequency: config.frequency,
          direction: config.direction,
          calculationType: config.calculationType,
          dataSource: config.dataSource,
          slaTargetDays: config.slaTargetDays,
          active: config.active,
          effectiveDate: toDateInputValue(config.effectiveDate),
          endDate: toDateInputValue(config.endDate),
        }
      : emptyForm(employees)
  );

  function update<K extends keyof KpiConfigInput>(key: K, value: KpiConfigInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const payload: KpiConfigInput = { ...form, endDate: form.endDate || null };
        if (config) {
          await updateKpiConfig(config.id, payload);
        } else {
          await createKpiConfig(payload);
        }
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{config ? "Edit KPI" : "Add KPI"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="employeeId">Employee</Label>
            <Select
              value={form.employeeId}
              onValueChange={(v) => update("employeeId", v)}
              disabled={!!config}
            >
              <SelectTrigger id="employeeId">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} ({e.team})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kpiName">KPI name</Label>
            <Input
              id="kpiName"
              value={form.kpiName}
              onChange={(e) => update("kpiName", e.target.value)}
              placeholder="e.g. Hires vs Target"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="weight">Weight (%)</Label>
              <Input
                id="weight"
                type="number"
                step="0.01"
                value={form.weight}
                onChange={(e) => update("weight", Number(e.target.value))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="target">Target</Label>
              <Input
                id="target"
                type="number"
                step="0.01"
                value={form.target}
                onChange={(e) => update("target", Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={form.unit}
                onChange={(e) => update("unit", e.target.value)}
                placeholder="%, days, count…"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slaTargetDays">SLA target (days, optional)</Label>
              <Input
                id="slaTargetDays"
                type="number"
                value={form.slaTargetDays ?? ""}
                onChange={(e) =>
                  update("slaTargetDays", e.target.value === "" ? null : Number(e.target.value))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <Select
                value={form.frequency}
                onValueChange={(v) => update("frequency", v as KpiConfigInput["frequency"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEEKLY">Weekly (Activity)</SelectItem>
                  <SelectItem value="MONTHLY">Monthly (Output)</SelectItem>
                  <SelectItem value="COHORT">Cohort (Quality)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Direction</Label>
              <Select
                value={form.direction}
                onValueChange={(v) => update("direction", v as KpiConfigInput["direction"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HIGHER_IS_BETTER">Higher is better</SelectItem>
                  <SelectItem value="LOWER_IS_BETTER">Lower is better</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="calculationType">Calculation description</Label>
            <Input
              id="calculationType"
              value={form.calculationType}
              onChange={(e) => update("calculationType", e.target.value)}
              placeholder="Numerator / denominator logic"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dataSource">Data source</Label>
            <Input
              id="dataSource"
              value={form.dataSource}
              onChange={(e) => update("dataSource", e.target.value)}
              placeholder="Which table/field this is computed from"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="effectiveDate">Effective date</Label>
              <Input
                id="effectiveDate"
                type="date"
                value={form.effectiveDate}
                onChange={(e) => update("effectiveDate", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">End date (optional)</Label>
              <Input
                id="endDate"
                type="date"
                value={form.endDate ?? ""}
                onChange={(e) => update("endDate", e.target.value || null)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="active"
              checked={form.active}
              onCheckedChange={(v) => update("active", v)}
            />
            <Label htmlFor="active">Active</Label>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : config ? "Save changes" : "Create KPI"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

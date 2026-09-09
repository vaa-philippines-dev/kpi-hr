import { Plus, Pencil } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiConfigDialog } from "./kpi-config-dialog";
import { DeleteKpiConfigButton } from "./delete-button";

export const dynamic = "force-dynamic";

export default async function KpiConfigPage() {
  const user = await requireRole("ADMIN", "HR_MANAGER", "RECRUITMENT_MANAGER");

  const teamFilter =
    user.role === "HR_MANAGER" ? "HR" : user.role === "RECRUITMENT_MANAGER" ? "RECRUITMENT" : null;

  const employees = await prisma.employee.findMany({
    where: { active: true, ...(teamFilter ? { team: teamFilter } : {}) },
    orderBy: { name: "asc" },
  });

  const configs = await prisma.kPIConfig.findMany({
    where: teamFilter ? { employee: { team: teamFilter } } : {},
    include: { employee: true },
    orderBy: [{ employee: { name: "asc" } }, { kpiName: "asc" }],
  });

  const employeeOptions = employees.map((e) => ({ id: e.id, name: e.name, team: e.team }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">KPI Configuration</h1>
          <p className="text-sm text-muted-foreground">
            Weights, targets, and frequency for every KPI. This is the only place these change —
            never in code.
          </p>
        </div>
        <KpiConfigDialog
          employees={employeeOptions}
          trigger={
            <Button>
              <Plus className="h-4 w-4" /> Add KPI
            </Button>
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All KPI Configs</CardTitle>
        </CardHeader>
        <CardContent>
          {configs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No KPI configs yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>KPI</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead className="text-right">Weight</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((cfg) => (
                  <TableRow key={cfg.id}>
                    <TableCell className="font-medium">{cfg.employee.name}</TableCell>
                    <TableCell>{cfg.kpiName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{cfg.frequency}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {cfg.direction === "HIGHER_IS_BETTER" ? "Higher is better" : "Lower is better"}
                    </TableCell>
                    <TableCell className="text-right">{Number(cfg.weight)}%</TableCell>
                    <TableCell className="text-right">
                      {Number(cfg.target)} {cfg.unit}
                    </TableCell>
                    <TableCell>
                      {cfg.active ? (
                        <Badge className="border-transparent bg-rating-meets/15 text-rating-meets">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <KpiConfigDialog
                          employees={employeeOptions}
                          config={cfg}
                          trigger={
                            <Button variant="ghost" size="icon" aria-label="Edit">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <DeleteKpiConfigButton id={cfg.id} kpiName={cfg.kpiName} />
                      </div>
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

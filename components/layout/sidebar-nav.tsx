"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  ClipboardList,
  KanbanSquare,
  ListChecks,
  Gauge,
  LineChart,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppRole } from "@prisma/client";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: AppRole[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/hr/activity", label: "HR Activity Log", icon: ClipboardList },
  { href: "/recruitment/pipeline", label: "Recruitment Pipeline", icon: KanbanSquare },
  { href: "/recruitment/quality-queue", label: "Quality Evaluation Queue", icon: ListChecks },
  { href: "/recruitment/demand", label: "Demand Planning", icon: Gauge },
  { href: "/reports/trends", label: "Historical Trends", icon: LineChart },
  {
    href: "/admin/kpi-config",
    label: "KPI Config",
    icon: Settings,
    roles: ["ADMIN", "HR_MANAGER", "RECRUITMENT_MANAGER"],
  },
  { href: "/admin/audit-log", label: "Audit Log", icon: ShieldCheck, roles: ["ADMIN"] },
];

export function SidebarNav({ role }: { role: AppRole }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role)).map((item) => {
        const active = pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

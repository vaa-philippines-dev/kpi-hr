import { requireRole } from "@/lib/auth";
import { ComingSoon } from "@/components/coming-soon";

export default async function AuditLogPage() {
  await requireRole("ADMIN");
  return (
    <ComingSoon
      title="Audit Log"
      phase="Phase 4"
      description="Read-only, filterable view over every CREATE/UPDATE/DELETE/RECLASSIFY action in the system."
    />
  );
}

import { requireUser } from "@/lib/auth";
import { ComingSoon } from "@/components/coming-soon";

export default async function DemandPlanningPage() {
  await requireUser();
  return (
    <ComingSoon
      title="Demand Planning"
      phase="Phase 3"
      description="Roles with Available / Client Ready / Incoming Demand / Gap / Coverage %, with a visual risk flag when coverage is low."
    />
  );
}

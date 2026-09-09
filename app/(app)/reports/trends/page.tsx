import { requireUser } from "@/lib/auth";
import { ComingSoon } from "@/components/coming-soon";

export default async function TrendsPage() {
  await requireUser();
  return (
    <ComingSoon
      title="Historical Trends"
      phase="Phase 4"
      description="Line/bar charts of score history per employee/team, built from KPISnapshot data."
    />
  );
}

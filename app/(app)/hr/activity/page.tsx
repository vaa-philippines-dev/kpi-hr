import { requireUser } from "@/lib/auth";
import { ComingSoon } from "@/components/coming-soon";

export default async function HrActivityPage() {
  await requireUser();
  return (
    <ComingSoon
      title="HR Activity Log"
      phase="Phase 2"
      description="Form to log HR operational events (COE requests, offboarding steps, etc.), filterable by activity type and employee."
    />
  );
}

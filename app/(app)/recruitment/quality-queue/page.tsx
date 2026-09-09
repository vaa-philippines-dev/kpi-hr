import { requireUser } from "@/lib/auth";
import { ComingSoon } from "@/components/coming-soon";

export default async function QualityQueuePage() {
  await requireUser();
  return (
    <ComingSoon
      title="Quality Evaluation Queue"
      phase="Phase 3"
      description="Hires with a Day 30/60/90 milestone due now or overdue, with an inline form to record performance/satisfaction/attendance/training scores."
    />
  );
}

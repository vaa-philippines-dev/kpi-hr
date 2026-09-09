import { requireUser } from "@/lib/auth";
import { ComingSoon } from "@/components/coming-soon";

export default async function RecruitmentPipelinePage() {
  await requireUser();
  return (
    <ComingSoon
      title="Recruitment Pipeline"
      phase="Phase 2"
      description="Kanban or table view of candidates by stage, filterable by recruiter."
    />
  );
}

-- Row Level Security policies for the KPI Management System.
--
-- IMPORTANT: the Next.js app talks to Postgres through Prisma using
-- DATABASE_URL/DIRECT_URL, which (per Supabase's default connection strings)
-- runs as a role that BYPASSES RLS. That means these policies are NOT the
-- primary authorization boundary for this app — lib/auth.ts (requireUser /
-- requireRole) is. These policies exist as defense-in-depth for anything that
-- talks to Postgres as the `anon` / `authenticated` role instead of through
-- Prisma: the Supabase dashboard's table editor, PostgREST, or any future
-- client-side Supabase queries.
--
-- Run this once against your Supabase project (SQL Editor, or `supabase db
-- push` if you adopt the Supabase CLI). Re-run safely — every statement is
-- guarded with DROP POLICY IF EXISTS first.

alter table "Profile" enable row level security;
alter table "Employee" enable row level security;
alter table "KPIConfig" enable row level security;
alter table "Period" enable row level security;
alter table "HRActivityLog" enable row level security;
alter table "RecruitmentCandidate" enable row level security;
alter table "RecruitmentHire" enable row level security;
alter table "DemandPlanning" enable row level security;
alter table "KPIResult" enable row level security;
alter table "KPISnapshot" enable row level security;
alter table "AuditLog" enable row level security;

-- Helper: the caller's Profile row, if any.
create or replace view current_profile as
select p.*
from "Profile" p
where p.id = auth.uid();

-- ---------------------------------------------------------------------------
-- Profile
-- ---------------------------------------------------------------------------
drop policy if exists "profile_select_own_or_admin" on "Profile";
create policy "profile_select_own_or_admin" on "Profile"
  for select using (
    id = auth.uid()
    or exists (select 1 from current_profile cp where cp.role = 'ADMIN')
  );

drop policy if exists "profile_update_admin_only" on "Profile";
create policy "profile_update_admin_only" on "Profile"
  for update using (exists (select 1 from current_profile cp where cp.role = 'ADMIN'));

-- ---------------------------------------------------------------------------
-- Employee
-- ---------------------------------------------------------------------------
drop policy if exists "employee_select" on "Employee";
create policy "employee_select" on "Employee"
  for select using (
    exists (
      select 1 from current_profile cp
      where cp.role in ('ADMIN', 'VIEWER')
         or (cp.role = 'HR_MANAGER' and "Employee".team = 'HR')
         or (cp.role = 'RECRUITMENT_MANAGER' and "Employee".team = 'RECRUITMENT')
         or (cp.role = 'EMPLOYEE' and cp."employeeId" = "Employee".id)
    )
  );

drop policy if exists "employee_write_managers" on "Employee";
create policy "employee_write_managers" on "Employee"
  for all using (
    exists (
      select 1 from current_profile cp
      where cp.role = 'ADMIN'
         or (cp.role = 'HR_MANAGER' and "Employee".team = 'HR')
         or (cp.role = 'RECRUITMENT_MANAGER' and "Employee".team = 'RECRUITMENT')
    )
  );

-- ---------------------------------------------------------------------------
-- KPIConfig (read your own team; only managers/admin write)
-- ---------------------------------------------------------------------------
drop policy if exists "kpiconfig_select" on "KPIConfig";
create policy "kpiconfig_select" on "KPIConfig"
  for select using (
    exists (
      select 1 from current_profile cp
      join "Employee" e on e.id = "KPIConfig"."employeeId"
      where cp.role in ('ADMIN', 'VIEWER')
         or (cp.role = 'HR_MANAGER' and e.team = 'HR')
         or (cp.role = 'RECRUITMENT_MANAGER' and e.team = 'RECRUITMENT')
         or (cp.role = 'EMPLOYEE' and cp."employeeId" = e.id)
    )
  );

drop policy if exists "kpiconfig_write" on "KPIConfig";
create policy "kpiconfig_write" on "KPIConfig"
  for all using (
    exists (
      select 1 from current_profile cp
      join "Employee" e on e.id = "KPIConfig"."employeeId"
      where cp.role = 'ADMIN'
         or (cp.role = 'HR_MANAGER' and e.team = 'HR')
         or (cp.role = 'RECRUITMENT_MANAGER' and e.team = 'RECRUITMENT')
    )
  );

-- ---------------------------------------------------------------------------
-- KPIResult / KPISnapshot (read-only reporting data)
-- ---------------------------------------------------------------------------
drop policy if exists "kpiresult_select" on "KPIResult";
create policy "kpiresult_select" on "KPIResult"
  for select using (
    exists (
      select 1 from current_profile cp
      join "Employee" e on e.id = "KPIResult"."employeeId"
      where cp.role in ('ADMIN', 'VIEWER')
         or (cp.role = 'HR_MANAGER' and e.team = 'HR')
         or (cp.role = 'RECRUITMENT_MANAGER' and e.team = 'RECRUITMENT')
         or (cp.role = 'EMPLOYEE' and cp."employeeId" = e.id)
    )
  );

drop policy if exists "kpisnapshot_select" on "KPISnapshot";
create policy "kpisnapshot_select" on "KPISnapshot"
  for select using (
    exists (
      select 1 from current_profile cp
      join "Employee" e on e.id = "KPISnapshot"."employeeId"
      where cp.role in ('ADMIN', 'VIEWER')
         or (cp.role = 'HR_MANAGER' and e.team = 'HR')
         or (cp.role = 'RECRUITMENT_MANAGER' and e.team = 'RECRUITMENT')
         or (cp.role = 'EMPLOYEE' and cp."employeeId" = e.id)
    )
  );

-- Only the server (Prisma, bypassing RLS) writes KPIResult/KPISnapshot — no
-- write policy is granted here on purpose.

-- ---------------------------------------------------------------------------
-- HRActivityLog / RecruitmentCandidate / RecruitmentHire (team-scoped)
-- ---------------------------------------------------------------------------
drop policy if exists "hractivitylog_select" on "HRActivityLog";
create policy "hractivitylog_select" on "HRActivityLog"
  for select using (
    exists (
      select 1 from current_profile cp
      where cp.role in ('ADMIN', 'VIEWER', 'HR_MANAGER')
         or (cp.role = 'EMPLOYEE' and cp."employeeId" = "HRActivityLog"."employeeId")
    )
  );

drop policy if exists "hractivitylog_write" on "HRActivityLog";
create policy "hractivitylog_write" on "HRActivityLog"
  for all using (
    exists (select 1 from current_profile cp where cp.role in ('ADMIN', 'HR_MANAGER'))
  );

drop policy if exists "recruitmentcandidate_select" on "RecruitmentCandidate";
create policy "recruitmentcandidate_select" on "RecruitmentCandidate"
  for select using (
    exists (
      select 1 from current_profile cp
      where cp.role in ('ADMIN', 'VIEWER', 'RECRUITMENT_MANAGER')
         or (cp.role = 'EMPLOYEE' and cp."employeeId" = "RecruitmentCandidate"."recruiterId")
    )
  );

drop policy if exists "recruitmentcandidate_write" on "RecruitmentCandidate";
create policy "recruitmentcandidate_write" on "RecruitmentCandidate"
  for all using (
    exists (select 1 from current_profile cp where cp.role in ('ADMIN', 'RECRUITMENT_MANAGER'))
  );

drop policy if exists "recruitmenthire_select" on "RecruitmentHire";
create policy "recruitmenthire_select" on "RecruitmentHire"
  for select using (
    exists (
      select 1 from current_profile cp
      where cp.role in ('ADMIN', 'VIEWER', 'RECRUITMENT_MANAGER')
         or (cp.role = 'EMPLOYEE' and cp."employeeId" = "RecruitmentHire"."recruiterId")
    )
  );

drop policy if exists "recruitmenthire_write" on "RecruitmentHire";
create policy "recruitmenthire_write" on "RecruitmentHire"
  for all using (
    exists (select 1 from current_profile cp where cp.role in ('ADMIN', 'RECRUITMENT_MANAGER'))
  );

-- ---------------------------------------------------------------------------
-- DemandPlanning, Period (read-all for signed-in users; admin/manager write)
-- ---------------------------------------------------------------------------
drop policy if exists "demandplanning_select" on "DemandPlanning";
create policy "demandplanning_select" on "DemandPlanning"
  for select using (auth.uid() is not null);

drop policy if exists "demandplanning_write" on "DemandPlanning";
create policy "demandplanning_write" on "DemandPlanning"
  for all using (
    exists (select 1 from current_profile cp where cp.role in ('ADMIN', 'RECRUITMENT_MANAGER'))
  );

drop policy if exists "period_select" on "Period";
create policy "period_select" on "Period"
  for select using (auth.uid() is not null);

-- ---------------------------------------------------------------------------
-- AuditLog (admin only)
-- ---------------------------------------------------------------------------
drop policy if exists "auditlog_select_admin" on "AuditLog";
create policy "auditlog_select_admin" on "AuditLog"
  for select using (
    exists (select 1 from current_profile cp where cp.role = 'ADMIN')
  );

# CLAUDE.md

Guidance for Claude Code (or any assistant) working in this repository.

## What this is

A KPI management system for an HR and Recruitment team. The entire point of
the system: **nobody ever types in a KPI percentage.** Every score is derived
from underlying operational records by a fixed scoring engine. If a change
would let a user manually set an achievement/score/rating anywhere outside
`lib/scoring.ts` + `lib/kpi-engine.ts`, it's wrong — stop and reconsider.

## Business logic — do not change without explicit sign-off

### Scoring formula (`lib/scoring.ts`)

```
Achievement = Actual / Target
Score = 3 + ((Achievement - 1) × 3), capped to [1.00, 5.00]
```

For `LOWER_IS_BETTER` KPIs (days-to-fill, error counts), invert first:
`Achievement = Target / Actual`.

### Rating bands (fixed)

| Score | Rating |
|---|---|
| 4.50–5.00 | Outstanding |
| 4.00–4.49 | Exceeds Expectation |
| 3.00–3.99 | Meets Expectation |
| 2.00–2.99 | Needs Improvement |
| 1.00–1.99 | Unsatisfactory |

`Weighted Score = Score × Weight`. `Employee Total Score` = sum of weighted
scores across that employee's currently-active KPIs (see
`getEmployeeOverallScore` in `lib/dashboard-queries.ts` — it normalizes by
total weight rather than assuming weights sum to exactly 100, but the seed
data always keeps each employee's weights summing to 100).

### The three-layer measurement model

Every `KPIConfig.frequency` says which clock a KPI runs on:

1. **`WEEKLY` (Activity)** — operational effort. Attributed to the week the
   event occurred (`receivedDate`, `dateSourced`, etc.). Never revised
   retroactively once the week has passed.
2. **`MONTHLY` (Output)** — completed results. Attributed to the month the
   *completion* event occurred — a hire belongs to the month of `hireDate`,
   regardless of when sourcing/screening started.
3. **`COHORT` (Quality)** — outcome quality on a lag: Day 30/60/90 after
   `RecruitmentHire.startDate`. A hire is **excluded** from quality scoring
   (not zeroed, not penalized) until its milestone is actually due —
   see `day30Status`/`day60Status`/`day90Status` (`NOT_DUE` until then). Any
   aggregated quality percentage shown in the UI must carry its sample size
   (`KPIResult.sampleSize` / `KPISnapshot.sampleSize`) alongside the number —
   never a bare percentage.

Adding a new KPI means two things, not one: a `KPIConfig` row (weight, target,
unit, frequency, direction, human-readable `calculationType`/`dataSource`) //
*and* a matching entry in the `KPI_METRICS` registry in `lib/kpi-engine.ts`
whose key is that KPI's `kpiName`. The config's `calculationType`/`dataSource`
fields are the human-readable description of what the registry function
actually does — keep them in sync.

### Quality-of-hire attribution

Every `RecruitmentHire.attributionStatus` starts `PENDING_REVIEW`. Only
`RECRUITER_ATTRIBUTABLE` outcomes should count against a recruiter's score;
`NOT_ATTRIBUTABLE` ones are excluded from both numerator and denominator
entirely (see the `"Quality of Hire"` handler in `lib/kpi-engine.ts`).
Reclassifying one is a write that must be audit-logged (`AuditLog`, action
`RECLASSIFY`) — this UI doesn't exist yet (Phase 3).

## Auth model — read this before touching anything auth-related

- **Google OAuth only.** No email/password, no magic link, no public sign-up.
  Don't add one even if asked to "make login easier" without checking first.
- **Invite-only.** A `Profile` row is only ever created in
  `app/auth/callback/route.ts`, and only when the signed-in email matches an
  existing, active `Employee.email`. No match → sign the session back out,
  redirect to `/not-authorized`. Never relax this to auto-create an Employee.
- **`Profile.id` == Supabase `auth.users.id`.** This means an admin *cannot*
  pre-create a Profile for someone who hasn't logged in yet (the id doesn't
  exist). New Profiles default to `AppRole.VIEWER`; someone is promoted to a
  real role afterwards (`npm run promote-admin -- <email>` for the bootstrap
  case, an admin UI for everyone else — not built yet).
- **RLS is defense-in-depth, not the enforcement layer.** The Next.js app
  talks to Postgres through Prisma using `DATABASE_URL`, which — per
  Supabase's own connection strings — runs as a role that bypasses RLS.
  Real authorization happens in `lib/auth.ts` (`requireUser`, `requireRole`)
  called at the top of every Server Component/action. `supabase/rls.sql`
  exists for anything that queries Postgres as `anon`/`authenticated`
  directly (dashboard, PostgREST, future client-side Supabase calls) — keep
  both in sync when you change the permission model, but don't assume editing
  one is enough.

## Phasing

Only Phase 1 is built. **Do not start Phase 2 without the user confirming
first** — this was an explicit condition of the original build.

- **Phase 1 (done):** full schema (all phases) + migrations, Google auth +
  RLS, KPI Config CRUD, scoring engine, Dashboard + Employee Scorecard, seeded
  data.
- **Phase 2:** HR Activity Log entry form + list; Recruitment Candidate
  pipeline (Kanban/table by stage).
- **Phase 3:** Quality Evaluation Queue (Day 30/60/90, inline scoring form) +
  attribution reclassification UI; Demand Planning table with coverage-gap
  flagging.
- **Phase 4:** Historical trend charts (Recharts, off `KPISnapshot`), Audit
  Log viewer, alerting.

Routes for Phase 2–4 screens already exist (see `app/(app)/**`) as
`<ComingSoon>` stubs so nav links resolve — replace the stub, don't restructure
the route.

## Conventions worth knowing

- **Rating colors are defined once**, in `lib/ratings.ts`
  (`RATING_STYLES`) + the `--rating-*` CSS variables in `app/globals.css`.
  Every badge/chart/tile pulls from there — never hardcode a rating color.
- **Dark mode** uses next-themes' `class` strategy (`.dark` on `<html>`),
  matching Tailwind's `darkMode: ["class"]` — not `data-theme`.
- **shadcn/ui components are hand-written**, not generated by the CLI (no
  Node.js was available in the environment that scaffolded this project —
  see below). They follow the standard shadcn output shape, so the CLI can
  safely regenerate/add to them later if you have `npx` available.
- **KPIResult vs KPISnapshot:** `KPIResult` is the current, recalculable value
  for an open period; `KPISnapshot` is append-only and must never be
  overwritten or deleted — it's the permanent historical record, written when
  a period closes.
- Prisma-generated enum types (e.g. `AppRole`, `Direction`) are plain string
  literal unions under the hood (Prisma's generation style), not TS `enum` —
  plain string literals like `"ADMIN"` are assignable to them directly, no
  cast needed.

## Known environment gap

This project was scaffolded on a machine with **no Node.js/npm installed** —
nothing here has been run, built, type-checked, or tested by a compiler.
Before trusting any change (yours or the original scaffold), run:

```bash
npm install
npm run typecheck
npm test
npm run build
```

and fix whatever surfaces. Treat the existing code as "should be correct by
inspection," not "verified."

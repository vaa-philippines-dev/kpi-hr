# KPI Management System

A KPI management system for an HR and Recruitment team. Employees never type in a
KPI percentage — every score is derived automatically from operational records
(activity logs, candidate/hire data, quality evaluations) by a fixed scoring
engine, then rolled up into scorecards and a team dashboard.

## Tech stack

- **Framework:** Next.js 14 (App Router, TypeScript, Server Components + Server Actions)
- **Database:** Supabase (PostgreSQL)
- **ORM:** Prisma
- **Auth:** Supabase Auth, Google OAuth only — invite-only, no public sign-up
- **Styling:** Tailwind CSS + shadcn/ui (Radix primitives)
- **Charts:** Recharts (wired up starting Phase 4)

## Prerequisites

- Node.js 20+
- A Supabase project (free tier is fine)
- A Google Cloud OAuth client (Web application type)

## Local setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project** at [supabase.com](https://supabase.com), then:
   - **Auth > Providers > Google**: enable it, paste in your Google OAuth Client
     ID/Secret. Set the authorized redirect URI in Google Cloud Console to the
     callback URL Supabase shows you (`https://<project>.supabase.co/auth/v1/callback`).
   - **Auth > Providers**: disable every other provider (email, magic link,
     etc.) — this app has no sign-up flow and expects Google to be the only
     option.
   - **Auth > URL Configuration**: add `http://localhost:3000/auth/callback`
     (and your production URL's equivalent) as a redirect URL.

3. **Copy environment variables**

   ```bash
   cp .env.example .env
   ```

   Fill in `DATABASE_URL` / `DIRECT_URL` (Project Settings > Database >
   Connection string — use the pooled connection for `DATABASE_URL` and the
   direct connection for `DIRECT_URL`), and `NEXT_PUBLIC_SUPABASE_URL` /
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` (Project
   Settings > API).

4. **Run migrations and (optionally) apply RLS**

   ```bash
   npx prisma migrate dev
   ```

   Then run [`supabase/rls.sql`](supabase/rls.sql) once against your database
   (Supabase Dashboard > SQL Editor). See the comment at the top of that file
   for why RLS is defense-in-depth here rather than the primary authorization
   layer (that's `lib/auth.ts`, enforced in the Next.js server).

5. **Seed sample data**

   ```bash
   npm run seed
   ```

   This creates a handful of HR and Recruitment employees, realistic
   operational records (activity logs, candidates, hires), and runs the real
   scoring engine over them to populate the dashboard — nothing is faked as a
   raw percentage.

6. **Run the app**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) and sign in with
   Google.

7. **Bootstrap your own admin account.** The very first login always lands as
   `VIEWER` (there's no way to pre-provision a Supabase auth id before you've
   signed in once). After your first Google sign-in, promote yourself:

   ```bash
   npm run promote-admin -- you@yourcompany.com
   ```

   The seed script also creates an Employee row for
   `system-admin@vaaphilippines.com` specifically so that email can sign in
   immediately without an admin manually creating it first.

## Architecture overview

### The three-layer measurement model

Every KPI belongs to one of three layers, declared on its `KPIConfig.frequency`:

1. **Activity (`WEEKLY`)** — operational effort: sourcing, screening,
   interviews, HR request intake. Attributed to the week the event happened,
   never revised retroactively.
2. **Output (`MONTHLY`)** — completed results: hires, onboarding completions,
   SLA closures. Attributed to the month the *completion* event happened (a
   hire belongs to the month of `hireDate`, not when sourcing started).
3. **Quality (`COHORT`)** — outcome quality, evaluated on a lag: Day 30 / 60 /
   90 after a hire's start date. A hire is excluded from quality scoring
   (never zeroed) until its milestone is actually due, and every aggregated
   quality percentage is shown with its sample size.

The engine that turns raw records into a number for each of these layers lives
in [`lib/kpi-engine.ts`](lib/kpi-engine.ts) — one function per KPI, keyed by
`KPIConfig.kpiName`, reading only the tables that `KPIConfig.dataSource`
documents.

### Scoring formula (fixed — see `lib/scoring.ts`)

```
Achievement = Actual / Target                     (or Target / Actual if LOWER_IS_BETTER)
Score       = 3 + ((Achievement - 1) × 3), capped to [1.00, 5.00]
Rating      = banded from Score (Outstanding / Exceeds / Meets / Needs Improvement / Unsatisfactory)
Weighted    = Score × Weight
```

This lives in pure, dependency-free functions in `lib/scoring.ts`, unit-tested
in `lib/__tests__/scoring.test.ts` (`npm test`). Nothing else in the codebase
is allowed to compute a score any other way.

### Invite-only auth

There is no sign-up page. `app/auth/callback/route.ts` is the only place a
`Profile` row is ever created, and only when the signed-in Google email
matches an existing, active `Employee` row — otherwise the user is signed back
out and shown `/not-authorized`. New profiles default to `VIEWER`; promote
people to a real role via SQL or (starting Phase 2) an admin UI.

## Folder structure

```
app/
  (app)/                 # Everything behind the sidebar — requires a session
    dashboard/
    employees/[id]/
    admin/kpi-config/    # KPI Config CRUD (Phase 1)
    admin/audit-log/     # stub — Phase 4
    hr/activity/         # stub — Phase 2
    recruitment/         # pipeline, quality-queue, demand — stubs, Phase 2/3
    reports/trends/      # stub — Phase 4
    layout.tsx           # sidebar + topbar shell, calls requireUser()
  auth/callback/         # Google OAuth redirect target
  login/                 # single "Sign in with Google" button
  not-authorized/
  logout/route.ts
components/
  ui/                    # shadcn-style primitives (button, card, table, …)
  dashboard/             # dashboard-specific tiles/cards
  layout/                # sidebar, topbar, theme toggle
  rating-badge.tsx        # single shared rating -> color mapping
lib/
  scoring.ts             # THE scoring formula — pure functions, unit-tested
  kpi-engine.ts          # turns operational records into KPIResult rows
  dashboard-queries.ts   # read-side aggregation for the dashboard/scorecard
  ratings.ts             # rating -> Tailwind class mapping
  auth.ts                # getCurrentUser / requireUser / requireRole
  supabase/              # server / browser / middleware Supabase clients
  prisma.ts              # Prisma client singleton
prisma/
  schema.prisma          # full data model (all phases scaffolded now)
  seed.ts                # sample employees + operational data + engine run
  promote-admin.ts        # bootstrap script for the first ADMIN
supabase/
  rls.sql                # Postgres RLS policies (defense-in-depth)
```

## Implementation phasing

Only Phase 1's UI is built right now (the full schema above is scaffolded for
all phases). See [`CLAUDE.md`](CLAUDE.md) for the complete phasing plan and
the business rules an assistant (or a new contributor) needs to know before
touching this codebase.

- **Phase 1 (this build):** schema + migrations, Google auth + RLS, KPI Config
  CRUD, scoring engine, Dashboard + Employee Scorecard, seeded data.
- **Phase 2:** HR Activity Log entry, Recruitment Candidate pipeline.
- **Phase 3:** Quality of Hire cohort engine (Day 30/60/90 queue + attribution
  workflow), Demand Planning.
- **Phase 4:** Historical snapshots, trend charts, audit log viewer, alerting.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / start |
| `npm test` | Run the scoring-engine unit tests (Vitest) |
| `npm run prisma:migrate` | Create/apply a migration |
| `npm run seed` | Seed sample data |
| `npm run promote-admin -- <email>` | Promote a signed-in user to ADMIN |

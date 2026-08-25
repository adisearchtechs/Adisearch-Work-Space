# Adisearch Workspace — AI Guide

> Production note: the repository now includes Supabase authentication, organization membership
> enforcement, PostgreSQL row-level security, and a persistent issue vertical slice. Sections
> below that describe fake tenancy or entirely local state document the inherited demo dataset.
> See `README.md`, `lib/supabase/`, `app/api/issues/`, and `supabase/schema.sql` for the production
> boundary.

> This document is written for AI assistants (and humans) working on this codebase.
> It explains how the project is structured, where every kind of logic lives, how to
> plug a real API behind the UI, and how to extract a single feature into another project.

Adisearch Workspace is a **Linear-inspired project management SaaS**: issues, projects, teams,
cycles, members, documents and notifications. Supabase-backed deployments authenticate users,
enforce organization isolation in PostgreSQL, and persist issue CRUD. Without Supabase variables,
the inherited TypeScript dataset under `mock-data/` remains available as a development demo.

## Tech stack

| Concern     | Choice                           | Notes                                                                            |
| ----------- | -------------------------------- | -------------------------------------------------------------------------------- |
| Framework   | Next.js 16 (App Router)          | `app/` directory, React 19, Turbopack in dev                                     |
| Language    | TypeScript (strict)              | Path alias `@/*` → repo root (see `tsconfig.json`)                               |
| Styling     | Tailwind CSS v4                  | Theme tokens in `app/globals.css` (`--background`, `--container`, …)             |
| UI kit      | shadcn/ui (Radix primitives)     | Generated components in `components/ui/` — treat as vendored                     |
| State       | Zustand 5 + nuqs                 | UI state in Zustand (`store/`), filters/sorting synced to the URL via nuqs hooks |
| Charts      | Recharts                         | Burn-up chart + insights bar chart                                               |
| Drag & drop | react-dnd (HTML5 backend)        | Board view, drop = change status                                                 |
| Animation   | motion (Framer Motion)           | Layout animations on issue lines/cards                                           |
| Dates       | date-fns                         | Formatting only                                                                  |
| Ordering    | LexoRank (`@kayron013/lexorank`) | Issue `rank` field, re-exported from `lib/utils.ts`                              |
| Icons       | lucide-react, @remixicon/react   | Plus hand-written SVGs for statuses/priorities                                   |
| Toasts      | sonner                           | `<Toaster />` mounted in `app/layout.tsx`                                        |
| URL state   | nuqs 2                           | `NuqsAdapter` wraps the app in `app/layout.tsx`; filter "stores" are nuqs hooks  |

Formatting: Prettier with **3-space indentation**, single quotes, 100-col width
(`.prettierrc`). Husky + lint-staged run Prettier/ESLint on commit.

## Repository map

```
app/                          # Next.js routes (thin wrappers around components)
  layout.tsx                  # Root layout: fonts, ThemeProvider (dark default), Toaster
  page.tsx                    # Redirects to /lndev-ui/team/CORE/all
  [orgId]/                    # Fake multi-tenant segment (always "lndev-ui" in mock data)
    inbox/  projects/  teams/  members/  settings/
    agent/                                    # Agent chat page (mock, fully client-side)
    issue/[issueId]/                          # Issue detail page (issueId = identifier, e.g. LNUI-703)
    profiles/[memberId]/                      # Member profile (memberId = User.id, e.g. "mason")
    project/[projectId]/
      overview/  activity/  issues/           # Project detail tabs
    team/[teamId]/
      all/       active/      backlog/          # Issue views (tabs)
      cycle/active/  cycle/upcoming/            # Current / upcoming cycle issues
      cycles/                                   # Cycles timeline + burn-up chart
      overview/  documents/  members/           # Team Home tabs
components/
  common/                     # Feature components (the real UI)
    issues/    inbox/    projects/    teams/    members/    settings/    cycles/    agent/
    projects/details/         # Project detail tabs (overview / activity / issues) + properties panel
  layout/
    main-layout.tsx           # Sidebar + rounded content shell used by every page
    sidebar/                  # App sidebar (nav, org switcher, create-issue modal)
    headers/                  # Per-page headers (nav row + options row)
  ui/                         # shadcn/ui primitives (button, dialog, table, …)
mock-data/                    # ALL data + domain types (issues, users, teams, …)
store/                        # Zustand stores (state + mutations + filtering)
lib/                          # cn(), LexoRank re-export, status/notification helpers
hooks/                        # use-mobile.ts (responsive breakpoint hook)
```

### Page pattern

Every route follows the same composition — copy it when adding a page:

```tsx
// app/[orgId]/team/[teamId]/example/page.tsx
import MainLayout from '@/components/layout/main-layout';
import Header from '@/components/layout/headers/example/header';
import Example from '@/components/common/example/example';

export default function ExamplePage() {
   return (
      <MainLayout header={<Header />}>
         {' '}
         {/* headersNumber={1|2} = header row count */}
         <Example />
      </MainLayout>
   );
}
```

`MainLayout` renders the sidebar, the `CreateIssueModalProvider` and a scrollable
content area whose height depends on `headersNumber` (1 or 2 header rows of 40px).

## Data model (single source of truth: `mock-data/`)

All domain **interfaces live next to their fake data**. Import types from these files.

| File                           | Types                                                                                           | Notable fields                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `mock-data/status.tsx`         | `Status`, `StatusCategory`                                                                      | 13 workflow statuses with SVG icon components and a `category` (`triage` \| `backlog` \| `unstarted` \| `started` \| `completed` \| `canceled`). Also exports `workflowOrderedStatus`, `displayOrderedStatus`, `getStatusesByCategory()`, `StatusIcon`, and reusable icon builders (`StatusPieIcon`, `StatusGearIcon`, …). ⚠️ The first six entries keep historical array indexes — `inbox.ts` and `projects.ts` reference `status[0..5]`. |
| `mock-data/issues.ts`          | `Issue`                                                                                         | Generated from a compact `seeds` array (**291 unique issues**). `cycleId` links to a cycle ('' = no cycle). `rank` uses LexoRank. Helpers: `groupIssuesByStatus`, `sortIssuesByPriority`, `filterIssuesByCycle`, `filterIssuesByCategories`, `issueCreatorIndex` (deterministic pseudo-author for the profile "Created" tab).                                                                                                              |
| `mock-data/cycles.ts`          | `Cycle`, `CycleStatus`, `CycleBurnupPoint`                                                      | `status` (`planned`/`upcoming`/`current`/`completed`), capacity, scope/started/completed, `burnup` chart points (deterministically generated). Helpers: `getCurrentCycle`, `getUpcomingCycle`, `getCyclesByTeam`, `formatCycleDateRange`.                                                                                                                                                                                                  |
| `mock-data/priorities.tsx`     | `Priority`                                                                                      | 5 levels with SVG icon components                                                                                                                                                                                                                                                                                                                                                                                                          |
| `mock-data/labels.ts`          | `LabelInterface`                                                                                | id, name, CSS color keyword                                                                                                                                                                                                                                                                                                                                                                                                                |
| `mock-data/projects.ts`        | `Project`, `Health`                                                                             | percentComplete, startDate/`targetDate`, lead (User), priority, health (gray/green/yellow/red palette), `teamId`, `labels`, `initiative`, `healthUpdatedAgoDays`. Base entries are enriched deterministically at module load. Helpers: `getProjectById`, `getProjectsByTeam`.                                                                                                                                                              |
| `mock-data/teams.ts`           | `Team`                                                                                          | members (User[]), projects (Project[]), `joined`                                                                                                                                                                                                                                                                                                                                                                                           |
| `mock-data/users.ts`           | `User`                                                                                          | status (online/offline/away), role, teamIds, `timezone` (IANA — powers "Local time" on member profiles)                                                                                                                                                                                                                                                                                                                                    |
| `mock-data/documents.ts`       | `TeamDocument`, `DocumentFolder`                                                                | Docs grouped in folders, creator, timestamps, `pinned`                                                                                                                                                                                                                                                                                                                                                                                     |
| `mock-data/issue-details.ts`   | `IssueDetail`, `ContentBlock`, `ActivityItem`, `PrLink`                                         | Rich issue-page content: structured description blocks (headings, lists, checklists, code, image/video placeholders, quotes, issue refs), activity events + comments, relations, PR links. ~12 handcrafted details + a **deterministic fallback generator** (`getIssueDetail(issue)`) for every other issue.                                                                                                                               |
| `mock-data/project-details.ts` | `ProjectDetail`, `ProjectUpdate`, `ProjectMilestone`, `ProjectActivityEvent`, `ProjectResource` | Rich project-page content: summary, `ContentBlock[]` description (reuses the issue-details block types), resources, milestones, health-tagged updates and an activity feed. 3 handcrafted details + `getProjectDetail(projectId)` deterministic fallback.                                                                                                                                                                                  |
| `mock-data/agent.ts`           | `AgentExample`                                                                                  | Agent page mock: example prompt cards, skills list, `getAgentReply(input)` (deterministic keyword-matched canned answers) and `chatTitleFrom(input)`.                                                                                                                                                                                                                                                                                      |
| `mock-data/inbox.ts`           | `InboxItem`, `NotificationType`                                                                 | Issue-shaped + notification fields (read, user, content)                                                                                                                                                                                                                                                                                                                                                                                   |
| `mock-data/side-bar-nav.ts`    | —                                                                                               | Static nav items for sidebar/settings                                                                                                                                                                                                                                                                                                                                                                                                      |

## State management (`store/`)

Two flavors live side by side and expose hook-shaped APIs:

- **Zustand stores** (in-memory, some persisted to localStorage)
- **nuqs hooks** (state lives in the URL query string) — they kept the historical
  `useXxxStore()` names so consumers didn't change when they were migrated

| Store                                                                         | Kind                | Role                                                                                                                                                                                                                                                                                                                                   | Mutates data?             |
| ----------------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------
# Adisearch Workspace

Adisearch Workspace is a multi-tenant project and issue management SaaS built with Next.js,
Supabase Auth, PostgreSQL row-level security, and Tailwind CSS. It is based on the original
[Circle](https://github.com/ln-dev7/circle) interface and retains the upstream license and
attribution.

## Production architecture

- Next.js 16 App Router on Node.js 22
- Supabase authentication with server-side cookie refresh and verified JWT claims
- PostgreSQL organizations, memberships, teams, workflows, projects, cycles, labels, and issues
- Row-level security on every public application table
- Transactional, per-team issue numbering to prevent concurrent identifier collisions
- Same-origin, authenticated issue API with strict Zod validation and request-size limits
- Vercel-ready response hardening, including CSP, HSTS, and cross-origin policies
- Demo-only fallback when Supabase variables are absent; no private data is stored in demo mode

## Local development

Requirements: Node.js 22 or newer and pnpm 11.

```shell
git clone https://github.com/adisearchtechs/circle.git
cd circle
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Create a dedicated Supabase project and apply [`supabase/schema.sql`](supabase/schema.sql). Then
set these variables locally and in Vercel:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Do not expose or prefix a Supabase service-role key with `NEXT_PUBLIC_`.

In Supabase Auth URL Configuration, set the site URL to the production domain and allow the local
and Vercel preview callback origins that you intend to test.

## Verification

```shell
pnpm check
pnpm build
```

`pnpm check` runs ESLint, strict TypeScript compilation, and the source/security regression tests.

## Deployment

1. Import `adisearchtechs/circle` into Vercel.
2. Add the three environment variables above for Production, Preview, and Development as needed.
3. Deploy from a reviewed, green commit.
4. Verify sign-up, email confirmation, workspace onboarding, organization isolation, issue create,
   issue update, issue delete, sign-out, and security headers.

The database service-role secret is not required by the application runtime.

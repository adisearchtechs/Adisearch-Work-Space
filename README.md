# Adisearch Workspace

Adisearch Workspace is a multi-tenant project and issue tracker built with Next.js and Supabase. It supports organizations, teams, projects, cycles, issue workflows, labels, status reporting, and saved snapshots.

The interface is based on the original [Circle](https://github.com/ln-dev7/circle) project. The upstream license and attribution are retained.

## Stack

- Next.js 16
- Supabase Auth
- PostgreSQL with row-level security
- Tailwind CSS
- Zod
- Vercel

## Local development

Requirements: Node.js 22 or newer and pnpm 11.

```bash
git clone https://github.com/adisearchtechs/Adisearch-Work-Space.git
cd Adisearch-Work-Space
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Create a Supabase project, link it with the Supabase CLI, and apply the tracked migrations:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

Set the following variables in `.env.local` and in your deployment environment:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Do not expose a Supabase service-role key through a `NEXT_PUBLIC_` variable.

For email confirmation, configure the Supabase Auth confirmation template to send users through the application callback:

```html
<a href="{{ .RedirectTo }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">
  Confirm email address
</a>
```

## Checks

```bash
pnpm check
pnpm build
```

`pnpm check` runs linting, TypeScript checks, and the repository test suite.

## Deployment

The application is designed to run on Vercel with Supabase providing authentication and PostgreSQL storage.

Before promoting a deployment, verify sign-up and email confirmation, workspace onboarding, organization isolation, issue and project CRUD, sign-out, and security headers.

## License

See [LICENSE.md](LICENSE.md). Upstream attribution is preserved for the original Circle interface.

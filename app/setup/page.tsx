import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { brand } from '@/lib/brand';

export const metadata: Metadata = { title: 'Deployment setup' };

type SetupPageProps = {
   searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
   return Array.isArray(value) ? value[0] : value;
}

export default async function SetupPage({ searchParams }: SetupPageProps) {
   const params = await searchParams;
   const installationId = firstValue(params.installation_id);
   const state = firstValue(params.state);

   // GitHub installations created before the canonical integration Setup URL was
   // corrected can still return to /setup. Preserve only the provider parameters
   // understood by the verified handler; that handler remains responsible for
   // state, PKCE, installation, membership, and authorization validation.
   if (installationId && state) {
      const integrationParams = new URLSearchParams({
         installation_id: installationId,
         state,
      });
      const setupAction = firstValue(params.setup_action);
      if (setupAction) integrationParams.set('setup_action', setupAction);
      redirect(`/api/integrations/github/setup?${integrationParams.toString()}`);
   }

   return (
      <main className="mx-auto flex min-h-svh max-w-3xl flex-col justify-center px-6 py-16">
         <p className="text-sm font-medium text-primary">{brand.name}</p>
         <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Supabase configuration required
         </h1>
         <p className="mt-3 max-w-2xl text-muted-foreground">
            Add the following variables to local development and to each Vercel environment. Use the
            publishable browser key, never the service-role secret.
         </p>
         <pre className="mt-6 overflow-x-auto rounded-xl border bg-card p-5 text-sm">
            <code>{`NEXT_PUBLIC_SUPABASE_URL=https://…supabase.co\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…\nNEXT_PUBLIC_SITE_URL=https://your-domain.example`}</code>
         </pre>
      </main>
   );
}

import type { Metadata } from 'next';
import { brand } from '@/lib/brand';

export const metadata: Metadata = { title: 'Deployment setup' };

export default function SetupPage() {
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

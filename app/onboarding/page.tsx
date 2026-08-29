import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { OnboardingForm } from '@/app/onboarding/onboarding-form';
import { brand } from '@/lib/brand';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';
import { getFirstWorkspaceSlug } from '@/lib/workspace';

export const metadata: Metadata = { title: 'Create a workspace' };

export default async function OnboardingPage() {
   if (!isSupabaseConfigured()) {
      redirect('/setup');
   }

   const supabase = await createClient();
   const { data: claimsData } = await supabase.auth.getClaims();
   const claims = claimsData?.claims;

   if (!claims?.sub) {
      redirect('/login');
   }

   const existingSlug = await getFirstWorkspaceSlug(claims.sub);
   if (existingSlug) {
      redirect(`/${existingSlug}/team/CORE/all`);
   }

   return (
      <main className="flex min-h-svh items-center justify-center px-4 py-12">
         <section className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-xl sm:p-8">
            <p className="text-sm font-medium text-primary">{brand.name}</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Create your workspace</h1>
            <p className="mb-6 mt-2 text-sm text-muted-foreground">
               You will become the owner. A Core team and secure default workflow are created
               automatically.
            </p>
            <OnboardingForm />
         </section>
      </main>
   );
}

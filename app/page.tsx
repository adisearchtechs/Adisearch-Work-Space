import { redirect } from 'next/navigation';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';
import { getFirstWorkspaceSlug } from '@/lib/workspace';

export default async function Home() {
   if (!isSupabaseConfigured()) {
      redirect('/demo/team/CORE/all');
   }

   const supabase = await createClient();
   const { data: claimsData } = await supabase.auth.getClaims();
   const claims = claimsData?.claims;

   if (!claims?.sub) {
      redirect('/login');
   }

   const workspaceSlug = await getFirstWorkspaceSlug(claims.sub);
   redirect(workspaceSlug ? `/${workspaceSlug}/team/CORE/all` : '/onboarding');
}

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { requireSupabaseConfig } from '@/lib/supabase/env';
import type { DatabaseWithIssueMilestones } from '@/lib/supabase/database-with-issue-milestones';

export async function createClient() {
   const cookieStore = await cookies();
   const { url, publishableKey } = requireSupabaseConfig();

   return createServerClient<DatabaseWithIssueMilestones>(url, publishableKey, {
      cookies: {
         getAll() {
            return cookieStore.getAll();
         },
         setAll(cookiesToSet) {
            try {
               cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
            } catch {
               // Server Components cannot write cookies. The proxy refreshes them.
            }
         },
      },
   });
}

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { requireSupabaseConfig } from '@/lib/supabase/env';
import type { DatabaseWithPreferences } from '@/lib/supabase/database-with-preferences';
import type { DatabaseWithStatusReportSnapshots } from '@/lib/supabase/database-with-status-report-snapshots';

type ServerDatabase = DatabaseWithStatusReportSnapshots & DatabaseWithPreferences;

export async function createClient() {
   const cookieStore = await cookies();
   const { url, publishableKey } = requireSupabaseConfig();

   return createServerClient<ServerDatabase>(url, publishableKey, {
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

import { createBrowserClient } from '@supabase/ssr';
import { requireSupabaseConfig } from '@/lib/supabase/env';
import type { Database } from '@/lib/supabase/database.types';

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createClient() {
   if (browserClient) {
      return browserClient;
   }

   const { url, publishableKey } = requireSupabaseConfig();
   browserClient = createBrowserClient<Database>(url, publishableKey);
   return browserClient;
}

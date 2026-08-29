const SUPABASE_URL_PATTERN = /^https:\/\/[a-z0-9-]+\.supabase\.co$/;

export function getSupabaseConfig() {
   const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
   const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

   if (!url || !publishableKey) {
      return null;
   }

   if (!SUPABASE_URL_PATTERN.test(url)) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL must be a valid Supabase project URL.');
   }

   return { url, publishableKey };
}

export function requireSupabaseConfig() {
   const config = getSupabaseConfig();

   if (!config) {
      throw new Error(
         'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
      );
   }

   return config;
}

export function isSupabaseConfigured() {
   return getSupabaseConfig() !== null;
}

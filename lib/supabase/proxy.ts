import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseConfig } from '@/lib/supabase/env';
import type { Database } from '@/lib/supabase/database.types';

const PUBLIC_PATHS = ['/login', '/auth/confirm', '/setup'];

function isPublicPath(pathname: string) {
   return (
      pathname.startsWith('/api/') ||
      PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
   );
}

export async function updateSession(request: NextRequest) {
   const config = getSupabaseConfig();

   if (!config) {
      return NextResponse.next({ request });
   }

   let response = NextResponse.next({ request });
   const supabase = createServerClient<Database>(config.url, config.publishableKey, {
      cookies: {
         getAll: () => request.cookies.getAll(),
         setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
               response.cookies.set(name, value, options)
            );
         },
      },
   });

   const { data: claimsData } = await supabase.auth.getClaims();
   const claims = claimsData?.claims;
   const pathname = request.nextUrl.pathname;

   if (!claims?.sub && !isPublicPath(pathname)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(loginUrl);
   }

   if (claims?.sub && pathname === '/login') {
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = '/';
      homeUrl.search = '';
      return NextResponse.redirect(homeUrl);
   }

   response.headers.set('Cache-Control', 'private, no-store');
   response.headers.set('Vary', 'Cookie');
   return response;
}

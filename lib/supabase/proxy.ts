import { createServerClient, type CookieOptions } from '@supabase/ssr';
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
   let refreshedCookies: { name: string; value: string; options: CookieOptions }[] = [];
   let refreshHeaders: Record<string, string> = {};
   const supabase = createServerClient<Database>(config.url, config.publishableKey, {
      cookies: {
         getAll: () => request.cookies.getAll(),
         setAll(cookiesToSet, headers) {
            refreshedCookies = cookiesToSet;
            refreshHeaders = headers;
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
               response.cookies.set(name, value, options)
            );
            Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
         },
      },
   });

   function finalize(nextResponse: NextResponse) {
      refreshedCookies.forEach(({ name, value, options }) =>
         nextResponse.cookies.set(name, value, options)
      );
      Object.entries(refreshHeaders).forEach(([name, value]) =>
         nextResponse.headers.set(name, value)
      );

      if (!nextResponse.headers.has('Cache-Control')) {
         nextResponse.headers.set('Cache-Control', 'private, no-store');
      }

      const vary = nextResponse.headers.get('Vary');
      if (!vary?.split(',').some((value) => value.trim().toLowerCase() === 'cookie')) {
         nextResponse.headers.set('Vary', vary ? `${vary}, Cookie` : 'Cookie');
      }

      return nextResponse;
   }

   const { data: claimsData } = await supabase.auth.getClaims();
   const claims = claimsData?.claims;
   const pathname = request.nextUrl.pathname;

   if (!claims?.sub && !isPublicPath(pathname)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
      return finalize(NextResponse.redirect(loginUrl));
   }

   if (claims?.sub && pathname === '/login') {
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = '/';
      homeUrl.search = '';
      return finalize(NextResponse.redirect(homeUrl));
   }

   return finalize(response);
}

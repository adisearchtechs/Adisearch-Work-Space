import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { safeRedirectPath } from '@/lib/auth/redirect';
import { getSiteUrl } from '@/lib/brand';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';

const OTP_TYPES: EmailOtpType[] = [
   'signup',
   'invite',
   'magiclink',
   'recovery',
   'email_change',
   'email',
];

function safeConfirmationRedirect(value: string | null) {
   if (!value) return '/';
   if (value.startsWith('/') && !value.startsWith('//')) return safeRedirectPath(value);

   try {
      const candidate = new URL(value);
      const site = new URL(getSiteUrl());
      if (candidate.origin !== site.origin) return '/';
      return safeRedirectPath(`${candidate.pathname}${candidate.search}${candidate.hash}`);
   } catch {
      return '/';
   }
}

export async function GET(request: NextRequest) {
   const tokenHash = request.nextUrl.searchParams.get('token_hash');
   const type = request.nextUrl.searchParams.get('type') as EmailOtpType | null;
   const next = safeConfirmationRedirect(request.nextUrl.searchParams.get('next'));

   if (!isSupabaseConfigured() || !tokenHash || !type || !OTP_TYPES.includes(type)) {
      return NextResponse.redirect(new URL('/login?error=invalid-confirmation', request.url));
   }

   const supabase = await createClient();
   const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

   if (error) {
      return NextResponse.redirect(new URL('/login?error=confirmation-failed', request.url));
   }

   return NextResponse.redirect(new URL(next, request.url));
}

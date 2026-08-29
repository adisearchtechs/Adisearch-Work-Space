import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { safeRedirectPath } from '@/lib/auth/redirect';
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

export async function GET(request: NextRequest) {
   const tokenHash = request.nextUrl.searchParams.get('token_hash');
   const type = request.nextUrl.searchParams.get('type') as EmailOtpType | null;
   const next = safeRedirectPath(request.nextUrl.searchParams.get('next'));

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

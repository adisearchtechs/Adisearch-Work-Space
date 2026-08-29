import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
   const origin = request.headers.get('origin');
   if (origin && origin !== request.nextUrl.origin) {
      return new NextResponse('Invalid origin', { status: 403 });
   }

   if (isSupabaseConfigured()) {
      const supabase = await createClient();
      await supabase.auth.signOut({ scope: 'local' });
   }

   return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
}

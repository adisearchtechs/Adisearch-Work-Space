'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { safeRedirectPath } from '@/lib/auth/redirect';
import { getSiteUrl } from '@/lib/brand';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';

export type AuthActionState = {
   message: string | null;
};

const credentialsSchema = z.object({
   email: z.string().trim().email('Enter a valid email address.').max(254),
   password: z.string().min(8, 'Password must be at least 8 characters.').max(128),
   next: z.string().optional(),
});

function parseCredentials(formData: FormData) {
   return credentialsSchema.safeParse({
      email: formData.get('email'),
      password: formData.get('password'),
      next: formData.get('next') ?? undefined,
   });
}

export async function signInAction(
   _previousState: AuthActionState,
   formData: FormData
): Promise<AuthActionState> {
   if (!isSupabaseConfigured()) {
      return { message: 'Authentication is not configured for this deployment.' };
   }

   const parsed = parseCredentials(formData);
   if (!parsed.success) {
      return { message: parsed.error.issues[0]?.message ?? 'Check your credentials.' };
   }

   const supabase = await createClient();
   const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
   });

   if (error) {
      return { message: 'Email or password is incorrect.' };
   }

   redirect(safeRedirectPath(parsed.data.next));
}

export async function signUpAction(
   _previousState: AuthActionState,
   formData: FormData
): Promise<AuthActionState> {
   if (!isSupabaseConfigured()) {
      return { message: 'Authentication is not configured for this deployment.' };
   }

   const parsed = parseCredentials(formData);
   if (!parsed.success) {
      return { message: parsed.error.issues[0]?.message ?? 'Check your credentials.' };
   }

   const next = safeRedirectPath(parsed.data.next);
   const supabase = await createClient();
   const emailRedirectTo = new URL(next, `${getSiteUrl()}/`).toString();

   const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { emailRedirectTo },
   });

   if (error) {
      return { message: 'Unable to create the account. Try again in a moment.' };
   }

   const redirectParams = new URLSearchParams({ status: 'check-email' });

   if (next !== '/') {
      redirectParams.set('next', next);
   }

   redirect(`/login?${redirectParams.toString()}`);
}

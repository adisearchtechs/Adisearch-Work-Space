'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

export type OnboardingState = { message: string | null };

const workspaceSchema = z.object({
   name: z.string().trim().min(2).max(80),
   slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(2)
      .max(48)
      .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, 'Use lowercase letters, numbers, and hyphens.'),
});

export async function createWorkspaceAction(
   _previousState: OnboardingState,
   formData: FormData
): Promise<OnboardingState> {
   if (!isSupabaseConfigured()) {
      return { message: 'Supabase is not configured.' };
   }

   const parsed = workspaceSchema.safeParse({
      name: formData.get('name'),
      slug: formData.get('slug'),
   });
   if (!parsed.success) {
      return { message: parsed.error.issues[0]?.message ?? 'Check the workspace details.' };
   }

   const supabase = await createClient();
   const { data: claimsData } = await supabase.auth.getClaims();
   const claims = claimsData?.claims;

   if (!claims?.sub) {
      redirect('/login');
   }

   const { error } = await supabase.from('organizations').insert({
      name: parsed.data.name,
      slug: parsed.data.slug,
      created_by: claims.sub,
   });

   if (error) {
      return {
         message:
            error.code === '23505'
               ? 'That workspace address is already in use.'
               : 'Unable to create the workspace. Try again.',
      };
   }

   redirect(`/${parsed.data.slug}/team/CORE/all`);
}

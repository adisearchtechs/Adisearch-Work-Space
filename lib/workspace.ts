import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';

export type WorkspaceSession = {
   configured: boolean;
   organization: {
      id: string;
      name: string;
      slug: string;
   };
   user: {
      id: string;
      email: string;
      displayName: string;
      avatarUrl: string | null;
      timezone: string;
      role: 'owner' | 'admin' | 'member' | 'guest';
   };
};

export const demoWorkspace: WorkspaceSession = {
   configured: false,
   organization: {
      id: 'demo',
      name: 'Adisearch Workspace Demo',
      slug: 'demo',
   },
   user: {
      id: 'demo-user',
      email: 'demo@adisearchtech.com',
      displayName: 'Demo User',
      avatarUrl: null,
      timezone: 'UTC',
      role: 'owner',
   },
};

export async function getWorkspaceSession(slug: string): Promise<WorkspaceSession | null> {
   if (!isSupabaseConfigured()) {
      return slug === demoWorkspace.organization.slug ? demoWorkspace : null;
   }

   const supabase = await createClient();
   const { data: claimsData } = await supabase.auth.getClaims();
   const claims = claimsData?.claims;

   if (!claims?.sub) {
      return null;
   }

   const { data: organization } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('slug', slug)
      .maybeSingle();

   if (!organization) {
      return null;
   }

   const [{ data: membership }, { data: profile }] = await Promise.all([
      supabase
         .from('organization_members')
         .select('role')
         .eq('organization_id', organization.id)
         .eq('user_id', claims.sub)
         .maybeSingle(),
      supabase
         .from('profiles')
         .select('display_name, avatar_url, timezone')
         .eq('id', claims.sub)
         .maybeSingle(),
   ]);

   if (!membership) {
      return null;
   }

   const email = typeof claims.email === 'string' ? claims.email : '';
   return {
      configured: true,
      organization,
      user: {
         id: claims.sub,
         email,
         displayName: profile?.display_name || email.split('@')[0] || 'Workspace member',
         avatarUrl: profile?.avatar_url ?? null,
         timezone: profile?.timezone ?? 'UTC',
         role: membership.role,
      },
   };
}

export async function getFirstWorkspaceSlug(userId: string) {
   const supabase = await createClient();
   const { data: memberships } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .limit(1);

   const organizationId = memberships?.[0]?.organization_id;
   if (!organizationId) {
      return null;
   }

   const { data: organization } = await supabase
      .from('organizations')
      .select('slug')
      .eq('id', organizationId)
      .maybeSingle();

   return organization?.slug ?? null;
}

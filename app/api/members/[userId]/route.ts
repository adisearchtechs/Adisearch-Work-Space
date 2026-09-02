import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import { updateWorkspaceMemberRoleSchema } from '@/lib/workspace-members/contracts';
import { authorizeWorkspaceMemberAccess, isUuid } from '@/lib/workspace-members/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

async function loadTarget(
   request: NextRequest,
   userId: string,
   failureMessage: string
) {
   const context = await authorizeWorkspaceMemberAccess(request, true, failureMessage);
   if ('response' in context) return { ok: false, response: context.response } as const;

   const { data: target, error } = await context.supabase
      .from('organization_members')
      .select('user_id, role')
      .eq('organization_id', context.organizationId)
      .eq('user_id', userId)
      .maybeSingle();
   if (error) {
      return {
         ok: false,
         response: NextResponse.json({ error: failureMessage }, { status: 500 }),
      } as const;
   }
   if (!target) {
      return {
         ok: false,
         response: NextResponse.json({ error: 'Not found.' }, { status: 404 }),
      } as const;
   }
   return { ok: true, ...context, target } as const;
}

function roleGuard(
   actorId: string,
   actorRole: 'owner' | 'admin' | 'member' | 'guest',
   target: { user_id: string; role: 'owner' | 'admin' | 'member' | 'guest' },
   requestedRole?: 'admin' | 'member' | 'guest'
) {
   if (target.user_id === actorId) return 'You cannot change your own workspace membership here.';
   if (target.role === 'owner') return 'Workspace ownership is protected.';
   if (actorRole === 'admin' && target.role === 'admin') return 'Only the owner can modify another admin.';
   if (actorRole === 'admin' && requestedRole === 'admin') return 'Only the owner can promote workspace admins.';
   return null;
}

export async function PATCH(
   request: NextRequest,
   { params }: { params: Promise<{ userId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   const { userId } = await params;
   if (!isUuid(userId)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   let input: unknown;
   try {
      input = await readJsonBody(request);
   } catch (error) {
      const status = error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
      return NextResponse.json({ error: 'Invalid request body.' }, { status });
   }
   const parsed = updateWorkspaceMemberRoleSchema.safeParse(input);
   if (!parsed.success) return NextResponse.json({ error: 'Invalid workspace role.' }, { status: 400 });

   const context = await loadTarget(request, userId, 'Unable to update workspace member.');
   if (!context.ok) return context.response;
   const guard = roleGuard(context.userId, context.role, context.target, parsed.data.role);
   if (guard) return NextResponse.json({ error: guard }, { status: 403 });

   const { data, error } = await context.supabase
      .from('organization_members')
      .update({ role: parsed.data.role })
      .eq('organization_id', context.organizationId)
      .eq('user_id', userId)
      .select('user_id, role')
      .maybeSingle();
   if (error) return NextResponse.json({ error: 'Unable to update workspace member.' }, { status: 500 });
   if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   return NextResponse.json({ member: { id: data.user_id, role: data.role } });
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ userId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   const { userId } = await params;
   if (!isUuid(userId)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   const context = await loadTarget(request, userId, 'Unable to remove workspace member.');
   if (!context.ok) return context.response;
   const guard = roleGuard(context.userId, context.role, context.target);
   if (guard) return NextResponse.json({ error: guard }, { status: 403 });

   const { count, error: issueError } = await context.supabase
      .from('issues')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', context.organizationId)
      .eq('creator_id', userId);
   if (issueError) return NextResponse.json({ error: 'Unable to remove workspace member.' }, { status: 500 });
   if ((count ?? 0) > 0) {
      return NextResponse.json(
         { error: 'This member created historical issues. Reassignment support is required before removal.' },
         { status: 409 }
      );
   }

   const { data, error } = await context.supabase
      .from('organization_members')
      .delete()
      .eq('organization_id', context.organizationId)
      .eq('user_id', userId)
      .select('user_id')
      .maybeSingle();
   if (error) return NextResponse.json({ error: 'Unable to remove workspace member.' }, { status: 500 });
   if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   return new NextResponse(null, { status: 204 });
}

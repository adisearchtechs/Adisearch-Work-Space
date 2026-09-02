import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin } from '@/lib/api/security';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { ATTACHMENT_BUCKET, isAttachmentUuid } from '@/lib/attachments/contracts';
import { authorizeAttachmentAccess } from '@/lib/attachments/server';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

async function loadAttachment(request: NextRequest, attachmentId: string, requireWrite: boolean) {
   if (!isAttachmentUuid(attachmentId)) return { response: NextResponse.json({ error: 'Not found.' }, { status: 404 }) };
   const context = await authorizeAttachmentAccess(request, requireWrite);
   if (!context.ok) return { response: context.response };
   const { data, error } = await context.supabase.from('attachments').select('id, file_name, storage_path').eq('id', attachmentId).eq('organization_id', context.organizationId).maybeSingle();
   if (error) return { response: NextResponse.json({ error: 'Unable to load attachment.' }, { status: 500 }) };
   if (!data) return { response: NextResponse.json({ error: 'Not found.' }, { status: 404 }) };
   return { context, attachment: data };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ attachmentId: string }> }) {
   if (!isSupabaseConfigured()) return unavailable();
   const { attachmentId } = await params;
   const loaded = await loadAttachment(request, attachmentId, false);
   if ('response' in loaded) return loaded.response;
   const { data, error } = await loaded.context.supabase.storage.from(ATTACHMENT_BUCKET).createSignedUrl(loaded.attachment.storage_path, 60, { download: loaded.attachment.file_name });
   if (error || !data?.signedUrl) return NextResponse.json({ error: 'Unable to prepare attachment download.' }, { status: 500 });
   return NextResponse.json({ url: data.signedUrl }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ attachmentId: string }> }) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   const { attachmentId } = await params;
   const loaded = await loadAttachment(request, attachmentId, true);
   if ('response' in loaded) return loaded.response;
   const { error: storageError } = await loaded.context.supabase.storage.from(ATTACHMENT_BUCKET).remove([loaded.attachment.storage_path]);
   if (storageError) return NextResponse.json({ error: 'Unable to delete attachment file.' }, { status: 500 });
   const { error } = await loaded.context.supabase.from('attachments').delete().eq('id', attachmentId).eq('organization_id', loaded.context.organizationId);
   if (error) return NextResponse.json({ error: 'Unable to delete attachment record.' }, { status: 500 });
   return new NextResponse(null, { status: 204 });
}

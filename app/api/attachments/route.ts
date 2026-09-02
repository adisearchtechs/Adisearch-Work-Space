import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin } from '@/lib/api/security';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import {
   ATTACHMENT_BUCKET,
   MAX_ATTACHMENT_BYTES,
   allowedAttachmentMimeTypes,
   isAttachmentEntityType,
   isAttachmentUuid,
   sanitizeAttachmentName,
   type AttachmentDto,
} from '@/lib/attachments/contracts';
import { authorizeAttachmentAccess, entityExists } from '@/lib/attachments/server';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

function toDto(row: {
   id: string; issue_id: string | null; project_id: string | null; initiative_id: string | null;
   file_name: string; mime_type: string; byte_size: number; uploaded_by: string | null; created_at: string;
}): AttachmentDto {
   const entityType = row.issue_id ? 'issue' : row.project_id ? 'project' : 'initiative';
   const entityId = row.issue_id ?? row.project_id ?? row.initiative_id!;
   return { id: row.id, entityType, entityId, fileName: row.file_name, mimeType: row.mime_type, byteSize: row.byte_size, uploadedBy: row.uploaded_by, createdAt: row.created_at };
}

export async function GET(request: NextRequest) {
   if (!isSupabaseConfigured()) return unavailable();
   const entityType = request.nextUrl.searchParams.get('entityType');
   const entityId = request.nextUrl.searchParams.get('entityId') ?? '';
   if (!isAttachmentEntityType(entityType) || !isAttachmentUuid(entityId)) return NextResponse.json({ error: 'Invalid attachment target.' }, { status: 400 });
   const context = await authorizeAttachmentAccess(request, false);
   if (!context.ok) return context.response;
   if (!(await entityExists(context, entityType, entityId))) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   const column = entityType === 'issue' ? 'issue_id' : entityType === 'project' ? 'project_id' : 'initiative_id';
   const { data, error } = await context.supabase.from('attachments').select('id, issue_id, project_id, initiative_id, file_name, mime_type, byte_size, uploaded_by, created_at').eq('organization_id', context.organizationId).eq(column, entityId).order('created_at', { ascending: false });
   if (error) return NextResponse.json({ error: 'Unable to load attachments.' }, { status: 500 });
   return NextResponse.json({ attachments: (data ?? []).map(toDto), canWrite: context.role !== 'guest' }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: NextRequest) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   const entityType = request.nextUrl.searchParams.get('entityType');
   const entityId = request.nextUrl.searchParams.get('entityId') ?? '';
   if (!isAttachmentEntityType(entityType) || !isAttachmentUuid(entityId)) return NextResponse.json({ error: 'Invalid attachment target.' }, { status: 400 });
   const context = await authorizeAttachmentAccess(request, true);
   if (!context.ok) return context.response;
   if (!(await entityExists(context, entityType, entityId))) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   const form = await request.formData();
   const value = form.get('file');
   if (!(value instanceof File)) return NextResponse.json({ error: 'A file is required.' }, { status: 400 });
   if (value.size < 1 || value.size > MAX_ATTACHMENT_BYTES) return NextResponse.json({ error: 'File must be 25 MB or smaller.' }, { status: 413 });
   if (!allowedAttachmentMimeTypes.has(value.type)) return NextResponse.json({ error: 'This file type is not allowed.' }, { status: 415 });

   const fileName = sanitizeAttachmentName(value.name);
   const pathName = `${context.organizationId}/${context.userId}/${entityType}/${entityId}/${crypto.randomUUID()}-${fileName.replace(/\s+/g, '_')}`;
   const bytes = await value.arrayBuffer();
   const { error: uploadError } = await context.supabase.storage.from(ATTACHMENT_BUCKET).upload(pathName, bytes, { contentType: value.type, upsert: false });
   if (uploadError) return NextResponse.json({ error: 'Unable to upload attachment.' }, { status: 500 });

   const parent = entityType === 'issue' ? { issue_id: entityId } : entityType === 'project' ? { project_id: entityId } : { initiative_id: entityId };
   const { data, error } = await context.supabase.from('attachments').insert({ organization_id: context.organizationId, uploaded_by: context.userId, file_name: fileName, storage_path: pathName, mime_type: value.type, byte_size: value.size, ...parent }).select('id, issue_id, project_id, initiative_id, file_name, mime_type, byte_size, uploaded_by, created_at').single();
   if (error) {
      await context.supabase.storage.from(ATTACHMENT_BUCKET).remove([pathName]);
      return NextResponse.json({ error: 'Unable to save attachment.' }, { status: 500 });
   }
   return NextResponse.json({ attachment: toDto(data) }, { status: 201 });
}

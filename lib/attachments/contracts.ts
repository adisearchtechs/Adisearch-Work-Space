export const ATTACHMENT_BUCKET = 'workspace-attachments';
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

export const attachmentEntityTypes = ['issue', 'project', 'initiative'] as const;
export type AttachmentEntityType = (typeof attachmentEntityTypes)[number];

export const allowedAttachmentMimeTypes = new Set([
   'image/jpeg','image/png','image/webp','image/gif',
   'application/pdf','text/plain','text/csv','application/json','application/zip',
   'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
   'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
   'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

export type AttachmentDto = {
   id: string;
   entityType: AttachmentEntityType;
   entityId: string;
   fileName: string;
   mimeType: string;
   byteSize: number;
   uploadedBy: string | null;
   createdAt: string;
};

export function isAttachmentEntityType(value: string | null): value is AttachmentEntityType {
   return value !== null && attachmentEntityTypes.includes(value as AttachmentEntityType);
}

export function isAttachmentUuid(value: string) {
   return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function sanitizeAttachmentName(value: string) {
   const normalized = value.normalize('NFKC').replace(/[\\/\0]/g, '_').replace(/[^\p{L}\p{N}._ -]+/gu, '_').trim();
   return (normalized || 'attachment').slice(0, 255);
}

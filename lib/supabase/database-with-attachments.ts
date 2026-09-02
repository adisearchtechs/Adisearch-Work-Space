import type { DatabaseWithReviews } from '@/lib/supabase/database-with-reviews';

type AttachmentsTable = {
   Row: {
      id: string;
      organization_id: string;
      issue_id: string | null;
      project_id: string | null;
      initiative_id: string | null;
      uploaded_by: string | null;
      file_name: string;
      storage_path: string;
      mime_type: string;
      byte_size: number;
      created_at: string;
   };
   Insert: {
      id?: string;
      organization_id: string;
      issue_id?: string | null;
      project_id?: string | null;
      initiative_id?: string | null;
      uploaded_by?: string | null;
      file_name: string;
      storage_path: string;
      mime_type: string;
      byte_size: number;
      created_at?: string;
   };
   Update: Partial<AttachmentsTable['Insert']>;
   Relationships: [
      { foreignKeyName: 'attachments_issue_organization_fkey'; columns: ['issue_id','organization_id']; isOneToOne: false; referencedRelation: 'issues'; referencedColumns: ['id','organization_id'] },
      { foreignKeyName: 'attachments_project_organization_fkey'; columns: ['project_id','organization_id']; isOneToOne: false; referencedRelation: 'projects'; referencedColumns: ['id','organization_id'] },
      { foreignKeyName: 'attachments_initiative_organization_fkey'; columns: ['initiative_id','organization_id']; isOneToOne: false; referencedRelation: 'initiatives'; referencedColumns: ['id','organization_id'] },
      { foreignKeyName: 'attachments_uploaded_by_fkey'; columns: ['uploaded_by']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
   ];
};

export type DatabaseWithAttachments = Omit<DatabaseWithReviews, 'public'> & {
   public: Omit<DatabaseWithReviews['public'], 'Tables'> & {
      Tables: DatabaseWithReviews['public']['Tables'] & { attachments: AttachmentsTable };
   };
};

import type { Database } from '@/lib/supabase/database.types';

export type WorkspaceStatusCategory = Database['public']['Enums']['status_category'];

export type WorkspaceStatusDto = {
   id: string;
   name: string;
   slug: string;
   color: string;
   category: WorkspaceStatusCategory;
   position: number;
};

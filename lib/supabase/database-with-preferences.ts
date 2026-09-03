import type { DatabaseWithIntegrations } from '@/lib/supabase/database-with-integrations';

type Relationship = {
   foreignKeyName: string;
   columns: string[];
   isOneToOne: boolean;
   referencedRelation: string;
   referencedColumns: string[];
};

type UserPreferencesTable = {
   Row: {
      user_id: string;
      theme_mode: 'system' | 'light' | 'dark' | 'custom';
      light_variant: 'light' | 'pure-light';
      dark_variant: 'dark' | 'magic-blue' | 'classic-dark';
      custom_accent: string;
      custom_background: string;
      custom_contrast: number;
      custom_sidebar: boolean;
      custom_sidebar_accent: string;
      custom_sidebar_background: string;
      custom_sidebar_contrast: number;
      created_at: string;
      updated_at: string;
   };
   Insert: {
      user_id: string;
      theme_mode?: 'system' | 'light' | 'dark' | 'custom';
      light_variant?: 'light' | 'pure-light';
      dark_variant?: 'dark' | 'magic-blue' | 'classic-dark';
      custom_accent?: string;
      custom_background?: string;
      custom_contrast?: number;
      custom_sidebar?: boolean;
      custom_sidebar_accent?: string;
      custom_sidebar_background?: string;
      custom_sidebar_contrast?: number;
      created_at?: string;
      updated_at?: string;
   };
   Update: {
      theme_mode?: 'system' | 'light' | 'dark' | 'custom';
      light_variant?: 'light' | 'pure-light';
      dark_variant?: 'dark' | 'magic-blue' | 'classic-dark';
      custom_accent?: string;
      custom_background?: string;
      custom_contrast?: number;
      custom_sidebar?: boolean;
      custom_sidebar_accent?: string;
      custom_sidebar_background?: string;
      custom_sidebar_contrast?: number;
      updated_at?: string;
   };
   Relationships: Relationship[];
};

export type DatabaseWithPreferences = Omit<DatabaseWithIntegrations, 'public'> & {
   public: Omit<DatabaseWithIntegrations['public'], 'Tables'> & {
      Tables: DatabaseWithIntegrations['public']['Tables'] & {
         user_preferences: UserPreferencesTable;
      };
   };
};

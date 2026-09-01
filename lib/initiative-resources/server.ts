import { NextRequest } from 'next/server';
import type { InitiativeResourceDto } from '@/lib/initiative-resources/contracts';
import { authorizeInitiativeAccess } from '@/lib/initiatives/server';
import type { Database } from '@/lib/supabase/database.types';

export const INITIATIVE_RESOURCE_SELECT =
   'id, initiative_id, label, url, position, created_at' as const;

type InitiativeResourceRow = Pick<
   Database['public']['Tables']['initiative_resources']['Row'],
   'id' | 'initiative_id' | 'label' | 'url' | 'position' | 'created_at'
>;

export function toInitiativeResourceDto(row: InitiativeResourceRow): InitiativeResourceDto {
   return {
      id: row.id,
      initiativeId: row.initiative_id,
      label: row.label,
      url: row.url,
      position: row.position,
      createdAt: row.created_at,
   };
}

export async function authorizeInitiativeResourceAccess(
   request: NextRequest,
   initiativeId: string,
   requireWrite: boolean,
   failureMessage: string
) {
   return authorizeInitiativeAccess(request, requireWrite, failureMessage, initiativeId);
}

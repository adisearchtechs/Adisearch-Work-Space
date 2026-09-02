import { NextRequest } from 'next/server';
import { authorizeInitiativeAccess } from '@/lib/initiatives/server';

export async function authorizeInitiativeLabelAccess(
   request: NextRequest,
   initiativeId: string,
   requireWrite: boolean,
   failureMessage: string
) {
   return authorizeInitiativeAccess(request, requireWrite, failureMessage, initiativeId);
}

import { createHash, randomBytes } from 'node:crypto';

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function generateWorkspaceInvitationToken() {
   return randomBytes(32).toString('base64url');
}

export function hashWorkspaceInvitationToken(token: string) {
   return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function workspaceInvitationExpiry(now = Date.now()) {
   return new Date(now + INVITATION_TTL_MS).toISOString();
}

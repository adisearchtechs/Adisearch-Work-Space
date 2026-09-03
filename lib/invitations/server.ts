import type { WorkspaceInvitationStatus } from '@/lib/invitations/contracts';

export function workspaceInvitationStatus(input: {
   acceptedAt: string | null;
   revokedAt: string | null;
   expiresAt: string;
   now?: number;
}): WorkspaceInvitationStatus {
   if (input.acceptedAt) return 'accepted';
   if (input.revokedAt) return 'revoked';
   if (Date.parse(input.expiresAt) <= (input.now ?? Date.now())) return 'expired';
   return 'pending';
}

export function invitationRpcErrorStatus(message: string) {
   if (message.includes('UNAUTHORIZED')) return 401;
   if (
      message.includes('FORBIDDEN') ||
      message.includes('ADMIN_CANNOT_INVITE_ADMIN') ||
      message.includes('ADMIN_CANNOT_MANAGE_ADMIN_INVITE')
   ) {
      return 403;
   }
   if (message.includes('INVITATION_NOT_FOUND')) return 404;
   if (
      message.includes('ALREADY_MEMBER') ||
      message.includes('INVITATION_ALREADY_PENDING') ||
      message.includes('INVITATION_ALREADY_ACCEPTED')
   ) {
      return 409;
   }
   if (
      message.includes('INVALID_EMAIL') ||
      message.includes('INVALID_ROLE') ||
      message.includes('INVALID_TEAM') ||
      message.includes('INVALID_EXPIRY') ||
      message.includes('INVALID_TOKEN_HASH') ||
      message.includes('TOO_MANY_TEAMS') ||
      message.includes('INVITATION_INVALID') ||
      message.includes('INVITATION_EMAIL_MISMATCH')
   ) {
      return 400;
   }
   return 500;
}

export function invitationRpcErrorMessage(message: string, fallback: string) {
   if (message.includes('ALREADY_MEMBER')) return 'This email already belongs to a workspace member.';
   if (message.includes('INVITATION_ALREADY_PENDING')) return 'An active invitation already exists for this email.';
   if (message.includes('ADMIN_CANNOT_INVITE_ADMIN')) return 'Only the workspace owner can invite another admin.';
   if (message.includes('ADMIN_CANNOT_MANAGE_ADMIN_INVITE')) return 'Only the workspace owner can manage admin invitations.';
   if (message.includes('INVITATION_ALREADY_ACCEPTED')) return 'This invitation has already been accepted.';
   if (message.includes('INVITATION_NOT_FOUND')) return 'Invitation not found.';
   if (message.includes('INVITATION_EMAIL_MISMATCH')) return 'Sign in with the email address this invitation was sent to.';
   if (message.includes('INVITATION_INVALID')) return 'This invitation is invalid, expired, or has been revoked.';
   if (message.includes('INVALID_TEAM')) return 'One or more selected teams are invalid.';
   if (message.includes('FORBIDDEN')) return 'Forbidden.';
   if (message.includes('UNAUTHORIZED')) return 'Unauthorized.';
   return fallback;
}

import 'server-only';
import { brand, getSiteUrl } from '@/lib/brand';
import type { WorkspaceInvitationRole } from '@/lib/invitations/contracts';

export type InvitationDeliveryReadiness =
   | { available: true }
   | { available: false; reason: string };

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

function configuration() {
   return {
      apiKey: process.env.RESEND_API_KEY?.trim() ?? '',
      from: process.env.INVITATION_FROM_EMAIL?.trim() ?? '',
   };
}

export function invitationDeliveryReadiness(): InvitationDeliveryReadiness {
   const { apiKey, from } = configuration();
   if (!apiKey || !from) {
      return {
         available: false,
         reason: 'Invitation email delivery is unavailable until a verified sender is configured.',
      };
   }
   return { available: true };
}

function escapeHtml(value: string) {
   return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
}

export function workspaceInvitationUrl(token: string) {
   const url = new URL('/invite', getSiteUrl());
   url.searchParams.set('token', token);
   return url.toString();
}

export async function sendWorkspaceInvitationEmail({
   email,
   organizationName,
   role,
   token,
}: {
   email: string;
   organizationName: string;
   role: WorkspaceInvitationRole;
   token: string;
}) {
   const readiness = invitationDeliveryReadiness();
   if (!readiness.available) throw new Error('INVITATION_DELIVERY_NOT_CONFIGURED');

   const { apiKey, from } = configuration();
   const inviteUrl = workspaceInvitationUrl(token);
   const safeOrganizationName = escapeHtml(organizationName);
   const safeRole = escapeHtml(role);
   const safeInviteUrl = escapeHtml(inviteUrl);

   const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
         Authorization: `Bearer ${apiKey}`,
         'Content-Type': 'application/json',
      },
      body: JSON.stringify({
         from,
         to: [email],
         subject: `You’re invited to ${organizationName} on ${brand.name}`,
         text: [
            `You’ve been invited to join ${organizationName} on ${brand.name} as ${role}.`,
            '',
            `Accept invitation: ${inviteUrl}`,
            '',
            'This invitation expires in 7 days. If you were not expecting it, you can ignore this email.',
         ].join('\n'),
         html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;line-height:1.6;color:#111827"><h1 style="font-size:22px;margin-bottom:12px">Join ${safeOrganizationName}</h1><p>You’ve been invited to join <strong>${safeOrganizationName}</strong> on ${escapeHtml(brand.name)} as <strong>${safeRole}</strong>.</p><p style="margin:28px 0"><a href="${safeInviteUrl}" style="display:inline-block;padding:11px 18px;border-radius:8px;background:#2563eb;color:#fff;text-decoration:none;font-weight:600">Accept invitation</a></p><p style="font-size:13px;color:#6b7280">This invitation expires in 7 days. If you were not expecting it, you can ignore this email.</p></div>`,
      }),
      cache: 'no-store',
   });

   if (!response.ok) {
      throw new Error('INVITATION_DELIVERY_FAILED');
   }

   const result = (await response.json()) as { id?: string };
   if (!result.id) throw new Error('INVITATION_DELIVERY_FAILED');
   return { provider: 'resend' as const, messageId: result.id };
}

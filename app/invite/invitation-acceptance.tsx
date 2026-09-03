'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

async function readError(response: Response) {
   try {
      const body = (await response.json()) as { error?: string };
      return body.error || 'Unable to accept this invitation.';
   } catch {
      return 'Unable to accept this invitation.';
   }
}

export function InvitationAcceptance({ token }: { token: string }) {
   const router = useRouter();
   const [submitting, setSubmitting] = useState(false);
   const [error, setError] = useState<string | null>(null);

   const acceptInvitation = async () => {
      if (submitting) return;
      setSubmitting(true);
      setError(null);
      try {
         const response = await fetch('/api/invitations/accept', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ token }),
         });
         if (!response.ok) throw new Error(await readError(response));
         const result = (await response.json()) as { organization: { slug: string } };
         router.replace(`/${encodeURIComponent(result.organization.slug)}`);
         router.refresh();
      } catch (acceptError) {
         setError(
            acceptError instanceof Error ? acceptError.message : 'Unable to accept this invitation.'
         );
      } finally {
         setSubmitting(false);
      }
   };

   return (
      <div className="space-y-4">
         <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
               <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" />
               <p>
                  You’re signed in. Accepting will add this account to the workspace using the role and
                  team assignments chosen by the inviter.
               </p>
            </div>
         </div>
         {error && (
            <Alert variant="destructive" aria-live="polite">
               <AlertDescription>{error}</AlertDescription>
            </Alert>
         )}
         <Button className="w-full" onClick={() => void acceptInvitation()} disabled={submitting}>
            {submitting ? 'Accepting…' : 'Accept invitation'}
         </Button>
      </div>
   );
}

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { InvitationAcceptance } from '@/app/invite/invitation-acceptance';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { acceptWorkspaceInvitationSchema } from '@/lib/invitations/contracts';
import { brand } from '@/lib/brand';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Workspace invitation' };

export default async function InvitationPage({
   searchParams,
}: {
   searchParams: Promise<{ token?: string }>;
}) {
   const { token: rawToken } = await searchParams;
   const parsed = acceptWorkspaceInvitationSchema.safeParse({ token: rawToken });
   const configured = isSupabaseConfigured();
   let signedIn = false;

   if (configured) {
      const supabase = await createClient();
      const { data } = await supabase.auth.getClaims();
      signedIn = Boolean(data?.claims?.sub);
   }

   const token = parsed.success ? parsed.data.token : null;
   const nextPath = token ? `/invite?token=${encodeURIComponent(token)}` : '/invite';
   const loginParams = new URLSearchParams({ next: nextPath });
   const signUpParams = new URLSearchParams({ mode: 'signup', next: nextPath });

   return (
      <main className="flex min-h-svh items-center justify-center bg-background px-4 py-12">
         <section className="w-full max-w-lg rounded-3xl border bg-card p-6 shadow-xl sm:p-8">
            <div className="mb-6 flex items-center gap-3">
               <div className="flex size-12 items-center justify-center rounded-xl border bg-background p-1.5">
                  <Image
                     src={brand.logoPath}
                     alt="Adisearch"
                     width={48}
                     height={48}
                     priority
                     unoptimized
                     className="size-10 object-contain"
                  />
               </div>
               <div>
                  <p className="font-semibold">{brand.name}</p>
                  <p className="text-sm text-muted-foreground">Secure workspace invitation</p>
               </div>
            </div>

            <h1 className="text-2xl font-semibold tracking-tight">Join the workspace</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
               Invitations are bound to the email address they were sent to and expire automatically.
            </p>

            <div className="mt-6">
               {!configured ? (
                  <Alert>
                     <AlertTitle>Workspace unavailable</AlertTitle>
                     <AlertDescription>
                        Invitation acceptance is unavailable until workspace authentication is configured.
                     </AlertDescription>
                  </Alert>
               ) : !token ? (
                  <Alert variant="destructive">
                     <AlertTitle>Invalid invitation link</AlertTitle>
                     <AlertDescription>
                        Use the complete invitation link from the newest invitation email.
                     </AlertDescription>
                  </Alert>
               ) : signedIn ? (
                  <InvitationAcceptance token={token} />
               ) : (
                  <div className="space-y-4">
                     <Alert>
                        <AlertTitle>Sign in with the invited email</AlertTitle>
                        <AlertDescription>
                           If you do not have an Adisearch Workspace account yet, create one using the same
                           email address that received this invitation.
                        </AlertDescription>
                     </Alert>
                     <Button asChild className="w-full">
                        <Link href={`/login?${loginParams.toString()}`}>Sign in to continue</Link>
                     </Button>
                     <Button asChild variant="outline" className="w-full">
                        <Link href={`/login?${signUpParams.toString()}`}>Create account</Link>
                     </Button>
                  </div>
               )}
            </div>
         </section>
      </main>
   );
}

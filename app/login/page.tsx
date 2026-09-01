import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { LoginForm } from '@/app/login/login-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { brand } from '@/lib/brand';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { safeRedirectPath } from '@/lib/auth/redirect';

export const metadata: Metadata = { title: 'Sign in' };

const confirmationErrors = {
   'invalid-confirmation': {
      title: 'This confirmation link is incomplete',
      description: 'Use the full link from the confirmation email, or create the account again.',
   },
   'confirmation-failed': {
      title: 'This confirmation link could not be used',
      description:
         'The link may have expired or already been used. Create the account again to request a new link.',
   },
} as const;

export default async function LoginPage({
   searchParams,
}: {
   searchParams: Promise<{ error?: string; mode?: string; next?: string; status?: string }>;
}) {
   const { error, mode, next, status } = await searchParams;
   const configured = isSupabaseConfigured();
   const nextPath = safeRedirectPath(next);
   const checkEmail = configured && status === 'check-email';
   const confirmationError =
      error && error in confirmationErrors
         ? confirmationErrors[error as keyof typeof confirmationErrors]
         : null;
   const signInParams = new URLSearchParams();

   if (nextPath !== '/') {
      signInParams.set('next', nextPath);
   }

   const signInHref = signInParams.size ? `/login?${signInParams.toString()}` : '/login';

   return (
      <main className="flex min-h-svh items-center justify-center bg-background px-4 py-12">
         <section className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl sm:p-8">
            <div className="mb-8 flex items-center gap-3">
               <div className="flex size-12 items-center justify-center rounded-xl border bg-background/80 p-1.5 shadow-sm">
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
                  <p className="text-sm text-muted-foreground">Secure project operations</p>
               </div>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
               {checkEmail
                  ? 'Check your email'
                  : configured
                    ? 'Access your workspace'
                    : 'Connect Supabase to continue'}
            </h1>
            <p className="mb-6 mt-2 text-sm text-muted-foreground">
               {checkEmail
                  ? 'Your account needs one quick confirmation before you can sign in.'
                  : configured
                    ? 'Sign in or create an account to access your organization’s private workspace.'
                    : 'This deployment is running without authentication credentials.'}
            </p>
            {checkEmail ? (
               <div className="space-y-4">
                  <Alert>
                     <AlertTitle>Confirmation email sent</AlertTitle>
                     <AlertDescription>
                        Open the newest message from Adisearch Workspace and select the confirmation
                        link. For security, this page looks the same if the address is already
                        registered.
                     </AlertDescription>
                  </Alert>
                  <Button asChild className="w-full">
                     <Link href={signInHref}>Return to sign in</Link>
                  </Button>
                  <p className="text-xs text-muted-foreground">
                     If it does not arrive within a few minutes, check spam and confirm that the
                     address was entered correctly.
                  </p>
               </div>
            ) : configured ? (
               <div className="space-y-5">
                  {confirmationError && (
                     <Alert variant="destructive">
                        <AlertTitle>{confirmationError.title}</AlertTitle>
                        <AlertDescription>{confirmationError.description}</AlertDescription>
                     </Alert>
                  )}
                  <LoginForm
                     next={nextPath}
                     initialMode={mode === 'signup' ? 'signup' : 'signin'}
                  />
               </div>
            ) : (
               <div className="space-y-3">
                  <Link className="text-sm font-medium underline" href="/setup">
                     View setup requirements
                  </Link>
                  <span className="block text-xs text-muted-foreground">
                     Local demo data remains available only in unconfigured development deployments.
                  </span>
               </div>
            )}
         </section>
      </main>
   );
}

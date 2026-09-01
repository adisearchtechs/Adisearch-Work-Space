import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { LoginForm } from '@/app/login/login-form';
import { AdisearchAuthBackground } from '@/components/brand/adisearch-auth-background';
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
      <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-4 py-12 sm:px-6">
         <AdisearchAuthBackground />

         <div className="relative z-10 grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[1fr_28rem]">
            <section className="hidden px-4 lg:block">
               <div className="max-w-lg">
                  <div className="mb-7 flex items-center gap-3">
                     <div className="flex size-14 items-center justify-center rounded-2xl border border-blue-500/20 bg-background/60 p-2 shadow-[0_12px_40px_rgba(37,99,235,0.12)] backdrop-blur-xl">
                        <Image
                           src={brand.logoPath}
                           alt="Adisearch"
                           width={56}
                           height={56}
                           priority
                           unoptimized
                           className="size-11 object-contain"
                        />
                     </div>
                     <div>
                        <p className="text-sm font-medium uppercase tracking-[0.24em] text-blue-600 dark:text-blue-300">
                           AdisearchTechs
                        </p>
                        <p className="text-sm text-muted-foreground">Build. Operate. Scale.</p>
                     </div>
                  </div>
                  <h2 className="text-4xl font-semibold tracking-[-0.04em] text-foreground xl:text-5xl">
                     Your command center for everything you&apos;re building.
                  </h2>
                  <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
                     Projects, issues, operations, and the next generation of AdisearchTechs products
                     in one private workspace.
                  </p>
                  <div className="mt-8 flex items-center gap-3 text-sm text-muted-foreground">
                     <span className="size-2 rounded-full bg-blue-500 shadow-[0_0_18px_rgba(59,130,246,0.75)]" />
                     Secure workspace access
                  </div>
               </div>
            </section>

            <section className="w-full rounded-3xl border border-white/10 bg-card/90 p-6 shadow-[0_30px_90px_rgba(2,8,23,0.24)] backdrop-blur-2xl sm:p-8 dark:bg-card/82">
               <div className="mb-8 flex items-center gap-3 lg:hidden">
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
                     <p className="text-sm text-muted-foreground">AdisearchTechs secure access</p>
                  </div>
               </div>

               <p className="mb-2 text-xs font-medium uppercase tracking-[0.22em] text-blue-600 dark:text-blue-300">
                  Adisearch Workspace
               </p>
               <h1 className="text-2xl font-semibold tracking-tight">
                  {checkEmail
                     ? 'Check your email'
                     : configured
                       ? 'Welcome back'
                       : 'Connect Supabase to continue'}
               </h1>
               <p className="mb-6 mt-2 text-sm leading-6 text-muted-foreground">
                  {checkEmail
                     ? 'Your account needs one quick confirmation before you can sign in.'
                     : configured
                       ? 'Sign in to continue to your private AdisearchTechs workspace.'
                       : 'This deployment is running without authentication credentials.'}
               </p>
               {checkEmail ? (
                  <div className="space-y-4">
                     <Alert>
                        <AlertTitle>Confirmation email sent</AlertTitle>
                        <AlertDescription>
                           Open the newest message from Adisearch Workspace and select the
                           confirmation link. For security, this page looks the same if the address is
                           already registered.
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
         </div>
      </main>
   );
}

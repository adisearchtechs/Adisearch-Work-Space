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

const capabilities = [
   'Portfolio and project operations',
   'Issue, cycle and milestone planning',
   'Private workspace collaboration',
] as const;

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
      <main className="relative min-h-svh overflow-hidden bg-background">
         <AdisearchAuthBackground />

         <div className="relative z-10 mx-auto grid min-h-svh w-full max-w-[1440px] lg:grid-cols-[minmax(0,1fr)_minmax(30rem,0.72fr)]">
            <section className="relative hidden overflow-hidden border-r border-slate-800/80 bg-slate-950 text-white lg:flex lg:min-h-svh lg:flex-col lg:justify-between lg:p-12 xl:p-16">
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(99,102,241,0.22),transparent_36%),radial-gradient(circle_at_90%_85%,rgba(14,165,233,0.12),transparent_34%)]" />
               <div className="absolute inset-0 opacity-[0.055] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:48px_48px]" />

               <div className="relative flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl border border-white/10 bg-white p-1.5 shadow-lg shadow-black/20">
                     <Image
                        src={brand.logoPath}
                        alt="Adisearch"
                        width={44}
                        height={44}
                        priority
                        unoptimized
                        className="size-8 object-contain"
                     />
                  </div>
                  <div>
                     <p className="text-sm font-semibold tracking-tight">Adisearch Workspace</p>
                     <p className="text-xs text-slate-400">AdisearchTechs</p>
                  </div>
               </div>

               <div className="relative max-w-xl pb-12">
                  <p className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-indigo-300">
                     Operating workspace
                  </p>
                  <h2 className="max-w-lg text-4xl font-semibold tracking-[-0.045em] text-white xl:text-[3.35rem] xl:leading-[1.08]">
                     One professional system for the work that moves your portfolio forward.
                  </h2>
                  <p className="mt-6 max-w-lg text-base leading-7 text-slate-300">
                     Plan, execute and review AdisearchTechs products from a single operating workspace
                     built around real projects, real status and accountable delivery.
                  </p>

                  <div className="mt-9 grid gap-3">
                     {capabilities.map((capability) => (
                        <div key={capability} className="flex items-center gap-3 text-sm text-slate-300">
                           <span className="flex size-5 items-center justify-center rounded-full border border-indigo-400/35 bg-indigo-400/10">
                              <span className="size-1.5 rounded-full bg-indigo-300" />
                           </span>
                           {capability}
                        </div>
                     ))}
                  </div>
               </div>

               <div className="relative flex items-center justify-between border-t border-white/10 pt-6 text-xs text-slate-500">
                  <span>AdisearchTechs workspace</span>
                  <span>Build · Operate · Scale</span>
               </div>
            </section>

            <section className="flex min-h-svh items-center justify-center px-5 py-10 sm:px-8 lg:px-12 xl:px-16">
               <div className="w-full max-w-[29rem]">
                  <div className="mb-9 flex items-center gap-3 lg:hidden">
                     <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-card p-1.5 shadow-sm">
                        <Image
                           src={brand.logoPath}
                           alt="Adisearch"
                           width={44}
                           height={44}
                           priority
                           unoptimized
                           className="size-8 object-contain"
                        />
                     </div>
                     <div>
                        <p className="text-sm font-semibold tracking-tight">Adisearch Workspace</p>
                        <p className="text-xs text-muted-foreground">AdisearchTechs</p>
                     </div>
                  </div>

                  <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-8 dark:shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
                     <div className="mb-7">
                        <div className="mb-3 flex items-center gap-2">
                           <span className="h-px w-5 bg-primary" />
                           <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                              Secure access
                           </p>
                        </div>
                        <h1 className="adisearch-panel-heading text-3xl font-semibold text-foreground">
                           {checkEmail
                              ? 'Check your email'
                              : configured
                                ? 'Welcome back'
                                : 'Connect Supabase to continue'}
                        </h1>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                           {checkEmail
                              ? 'Confirm your email address before signing in to the workspace.'
                              : configured
                                ? 'Sign in with your workspace credentials to continue.'
                                : 'This deployment is running without authentication credentials.'}
                        </p>
                     </div>

                     {checkEmail ? (
                        <div className="space-y-4">
                           <Alert className="rounded-xl">
                              <AlertTitle>Confirmation email sent</AlertTitle>
                              <AlertDescription>
                                 Open the newest message from Adisearch Workspace and select the
                                 confirmation link. For security, this page looks the same if the address
                                 is already registered.
                              </AlertDescription>
                           </Alert>
                           <Button asChild className="h-11 w-full rounded-xl font-semibold">
                              <Link href={signInHref}>Return to sign in</Link>
                           </Button>
                           <p className="text-xs leading-5 text-muted-foreground">
                              If it does not arrive within a few minutes, check spam and confirm that the
                              address was entered correctly.
                           </p>
                        </div>
                     ) : configured ? (
                        <div className="space-y-5">
                           {confirmationError && (
                              <Alert variant="destructive" className="rounded-xl">
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
                           <Button asChild variant="outline" className="h-11 w-full rounded-xl">
                              <Link href="/setup">View setup requirements</Link>
                           </Button>
                           <p className="text-xs leading-5 text-muted-foreground">
                              Local demo data remains available only in unconfigured development
                              deployments.
                           </p>
                        </div>
                     )}
                  </div>

                  <p className="mt-5 text-center text-xs text-muted-foreground">
                     Access is limited to authorized workspace members.
                  </p>
               </div>
            </section>
         </div>
      </main>
   );
}

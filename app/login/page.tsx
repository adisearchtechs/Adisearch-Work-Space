import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { LoginForm } from '@/app/login/login-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { brand } from '@/lib/brand';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { safeRedirectPath } from '@/lib/auth/redirect';
import styles from './login-experience.module.css';

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

const workspaceAreas = ['Projects', 'Issues', 'Reviews'] as const;

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

   if (nextPath !== '/') signInParams.set('next', nextPath);

   const signInHref = signInParams.size ? `/login?${signInParams.toString()}` : '/login';

   return (
      <main className="min-h-svh bg-[#f8f9fb] text-slate-950 dark:bg-slate-950 dark:text-white">
         <div className="grid min-h-svh lg:grid-cols-[minmax(21rem,0.72fr)_minmax(34rem,1.28fr)]">
            <section
               className={`${styles.brandPanel} relative hidden min-h-svh flex-col justify-between overflow-hidden px-12 py-10 text-white lg:flex xl:px-16 xl:py-12`}
            >
               <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-white p-1.5">
                     <Image
                        src="/brand/adisearch-mark-dark.svg"
                        alt="Adisearch"
                        width={40}
                        height={40}
                        priority
                        unoptimized
                        className="size-7 object-contain"
                     />
                  </div>
                  <div>
                     <p className="text-sm font-semibold tracking-[-0.01em]">ADISEARCH</p>
                     <p className="text-[11px] text-white/55">Workspace</p>
                  </div>
               </div>

               <div className="max-w-md">
                  <div className={`${styles.brandRule} mb-8 h-1 w-12 bg-[#5d7cff]`} />
                  <h2 className="text-4xl font-medium leading-[1.08] tracking-[-0.045em] xl:text-5xl">
                     Your work,
                     <br />
                     in one place.
                  </h2>
                  <p className="mt-6 max-w-sm text-sm leading-6 text-white/65">
                     Plan projects, manage issues and review progress with your team.
                  </p>

                  <div className="mt-12 border-y border-white/15 py-4">
                     {workspaceAreas.map((area, index) => (
                        <div
                           key={area}
                           className="flex items-center justify-between border-b border-white/10 py-3 last:border-b-0"
                        >
                           <span className="font-mono text-[10px] text-white/35">
                              {String(index + 1).padStart(2, '0')}
                           </span>
                           <span className="text-sm text-white/80">{area}</span>
                        </div>
                     ))}
                  </div>
               </div>

               <p className="text-[11px] text-white/40">AdisearchTechs · Private workspace</p>
            </section>

            <section className="relative flex min-h-svh flex-col overflow-hidden px-5 py-6 sm:px-8 lg:px-12 lg:py-10 xl:px-20">
               <div className="flex items-center gap-3 lg:hidden">
                  <div className="flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 dark:border-slate-800 dark:bg-slate-900">
                     <Image
                        src="/brand/adisearch-mark-dark.svg"
                        alt="Adisearch"
                        width={40}
                        height={40}
                        priority
                        unoptimized
                        className="size-7 object-contain"
                     />
                  </div>
                  <div>
                     <p className="text-sm font-semibold tracking-[-0.01em]">ADISEARCH</p>
                     <p className="text-[11px] text-slate-500">Workspace</p>
                  </div>
               </div>

               <div className="relative z-10 flex flex-1 items-center justify-center py-10">
                  <div className={`${styles.formPanel} w-full max-w-[25rem]`}>
                     <div className="mb-9">
                        <div
                           className={`${styles.formLogo} mb-6 flex size-12 items-center justify-center rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900`}
                        >
                           <Image
                              src={brand.logoPath}
                              alt=""
                              width={48}
                              height={48}
                              unoptimized
                              className="size-8 object-contain"
                              aria-hidden="true"
                           />
                        </div>
                        <p className="mb-3 text-xs font-medium text-[#4665d8] dark:text-indigo-300">
                           Private workspace
                        </p>
                        <h1 className="text-[2rem] font-semibold tracking-[-0.04em] text-slate-950 dark:text-white sm:text-[2.25rem]">
                           {checkEmail
                              ? 'Check your email'
                              : configured
                                ? 'Sign in'
                                : 'Connect Supabase'}
                        </h1>
                        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
                           {checkEmail
                              ? 'Confirm your email address before signing in.'
                              : configured
                                ? 'Use your AdisearchTechs workspace account.'
                                : 'Authentication is not configured for this deployment.'}
                        </p>
                     </div>

                     {checkEmail ? (
                        <div className="space-y-4">
                           <Alert className="rounded-lg">
                              <AlertTitle>Confirmation email sent</AlertTitle>
                              <AlertDescription>
                                 Open the newest message from Adisearch Workspace and select the
                                 confirmation link. For security, this page looks the same if the
                                 address is already registered.
                              </AlertDescription>
                           </Alert>
                           <Button asChild className="h-11 w-full rounded-lg font-semibold">
                              <Link href={signInHref}>Return to sign in</Link>
                           </Button>
                           <p className="text-xs leading-5 text-slate-500">
                              If it does not arrive within a few minutes, check spam and confirm
                              that the address was entered correctly.
                           </p>
                        </div>
                     ) : configured ? (
                        <div className="space-y-5">
                           {confirmationError && (
                              <Alert variant="destructive" className="rounded-lg">
                                 <AlertTitle>{confirmationError.title}</AlertTitle>
                                 <AlertDescription>
                                    {confirmationError.description}
                                 </AlertDescription>
                              </Alert>
                           )}
                           <LoginForm
                              next={nextPath}
                              initialMode={mode === 'signup' ? 'signup' : 'signin'}
                           />
                        </div>
                     ) : (
                        <div className="space-y-3">
                           <Button asChild variant="outline" className="h-11 w-full rounded-lg">
                              <Link href="/setup">View setup requirements</Link>
                           </Button>
                           <p className="text-xs leading-5 text-slate-500">
                              Local demo data remains available only in unconfigured development
                              deployments.
                           </p>
                        </div>
                     )}
                  </div>
               </div>

               <div className="relative z-10 flex items-center justify-between border-t border-slate-200 pt-5 text-[11px] text-slate-400 dark:border-slate-800">
                  <span>© AdisearchTechs</span>
                  <span>Authorized access only</span>
               </div>
            </section>
         </div>
      </main>
   );
}

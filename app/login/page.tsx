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
import { ArrowUpRight, Check, ShieldCheck } from 'lucide-react';
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

const portfolioSignals = [
   { label: 'Portfolio strategy', detail: 'Goals aligned', tone: 'bg-cyan-300' },
   { label: 'Delivery pipeline', detail: '12 active projects', tone: 'bg-indigo-300' },
   { label: 'Team momentum', detail: 'On track', tone: 'bg-emerald-300' },
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
      <main
         className={`${styles.shell} relative min-h-svh overflow-hidden bg-[#f6f7fb] dark:bg-slate-950`}
      >
         <AdisearchAuthBackground />

         <div className="relative z-10 mx-auto grid min-h-svh w-full max-w-[1600px] lg:grid-cols-[minmax(0,1.08fr)_minmax(31rem,0.92fr)]">
            <section
               className={`${styles.brandPanel} relative hidden overflow-hidden border-r border-white/5 bg-[#07111f] text-white lg:flex lg:min-h-svh lg:flex-col lg:justify-between lg:p-12 xl:p-16 2xl:p-20`}
            >
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(34,211,238,0.13),transparent_30%),radial-gradient(circle_at_82%_66%,rgba(99,102,241,0.2),transparent_38%),linear-gradient(145deg,transparent_35%,rgba(255,255,255,0.025)_35.2%,transparent_35.5%)]" />
               <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,.65)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.65)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_92%)]" />

               <div className="relative flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-[0.9rem] border border-white/15 bg-white p-1.5 shadow-lg shadow-black/20">
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
                     <p className="text-sm font-semibold tracking-tight">ADISEARCH Workspace</p>
                     <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        Operations OS
                     </p>
                  </div>
               </div>

               <div className={`${styles.brandContent} relative my-12 max-w-2xl`}>
                  <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[0.07] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-emerald-200">
                     <span className={`${styles.liveDot} size-1.5 rounded-full bg-emerald-300`} />
                     Workspace systems online
                  </div>
                  <h2 className="max-w-2xl text-[2.75rem] font-semibold leading-[1.04] tracking-[-0.055em] text-white xl:text-[3.65rem] 2xl:text-[4rem]">
                     Turn portfolio intent into visible momentum.
                  </h2>
                  <p className="mt-6 max-w-xl text-[0.98rem] leading-7 text-slate-300">
                     A focused operating system for planning the work, seeing the signal and moving
                     every product forward with confidence.
                  </p>

                  <div
                     className={`${styles.signalCard} mt-10 max-w-xl rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-black/20 backdrop-blur-sm`}
                  >
                     <div className="flex items-center justify-between border-b border-white/10 pb-4">
                        <div>
                           <p className="text-xs font-medium text-white">Portfolio signal</p>
                           <p className="mt-1 text-[11px] text-slate-500">Live operating view</p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-slate-300">
                           Today
                        </span>
                     </div>

                     <div className="relative mt-4 grid gap-2.5">
                        <svg
                           className="absolute bottom-5 left-[0.9rem] top-5 h-[calc(100%-2.5rem)] w-px overflow-visible"
                           viewBox="0 0 1 100"
                           preserveAspectRatio="none"
                           aria-hidden="true"
                        >
                           <line
                              className={styles.signalLine}
                              x1="0.5"
                              y1="0"
                              x2="0.5"
                              y2="100"
                              stroke="rgba(103,232,249,.55)"
                              strokeWidth="1.5"
                              vectorEffect="non-scaling-stroke"
                           />
                        </svg>
                        {portfolioSignals.map((signal) => (
                           <div
                              key={signal.label}
                              className="relative flex items-center gap-3 rounded-xl border border-white/[0.07] bg-black/10 px-3 py-3"
                           >
                              <span
                                 className={`${styles.signalNode} relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#0b1728]`}
                              >
                                 <span className={`size-1.5 rounded-full ${signal.tone}`} />
                              </span>
                              <div className="min-w-0 flex-1">
                                 <p className="text-xs font-medium text-slate-200">
                                    {signal.label}
                                 </p>
                                 <p className="mt-0.5 text-[11px] text-slate-500">
                                    {signal.detail}
                                 </p>
                              </div>
                              <Check className="size-3.5 text-slate-500" strokeWidth={1.8} />
                           </div>
                        ))}
                     </div>
                  </div>
               </div>

               <div className="relative flex items-center justify-between border-t border-white/10 pt-6 text-[11px] text-slate-500">
                  <span>AdisearchTechs · Private workspace</span>
                  <span className="flex items-center gap-1.5 text-slate-400">
                     Build · Operate · Scale <ArrowUpRight className="size-3" />
                  </span>
               </div>
            </section>

            <section className="flex min-h-svh items-center justify-center px-5 py-8 sm:px-8 lg:px-12 xl:px-16">
               <div className={`${styles.formPanel} w-full max-w-[30rem]`}>
                  <div className="mb-8 flex items-center gap-3 lg:hidden">
                     <div className="flex size-11 items-center justify-center rounded-[0.9rem] border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
                        <p className="text-sm font-semibold tracking-tight">ADISEARCH Workspace</p>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                           Operations OS
                        </p>
                     </div>
                  </div>

                  <div
                     className={`${styles.formCard} rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-6 backdrop-blur-xl sm:p-9 dark:border-slate-800 dark:bg-slate-900/90`}
                  >
                     <div className="mb-8">
                        <div className="mb-5 flex size-10 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600 dark:border-indigo-400/15 dark:bg-indigo-400/10 dark:text-indigo-300">
                           <ShieldCheck className="size-5" strokeWidth={1.8} />
                        </div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-300">
                           Secure workspace access
                        </p>
                        <h1 className="adisearch-panel-heading text-[2rem] font-semibold tracking-[-0.04em] text-slate-950 dark:text-white sm:text-4xl">
                           {checkEmail
                              ? 'Check your email'
                              : configured
                                ? 'Welcome back'
                                : 'Connect Supabase to continue'}
                        </h1>
                        <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
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
                                 confirmation link. For security, this page looks the same if the
                                 address is already registered.
                              </AlertDescription>
                           </Alert>
                           <Button asChild className="h-11 w-full rounded-xl font-semibold">
                              <Link href={signInHref}>Return to sign in</Link>
                           </Button>
                           <p className="text-xs leading-5 text-muted-foreground">
                              If it does not arrive within a few minutes, check spam and confirm
                              that the address was entered correctly.
                           </p>
                        </div>
                     ) : configured ? (
                        <div className="space-y-5">
                           {confirmationError && (
                              <Alert variant="destructive" className="rounded-xl">
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

                  <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-500 dark:text-slate-500">
                     <ShieldCheck className="size-3.5" /> Access is limited to authorized workspace
                     members.
                  </p>
               </div>
            </section>
         </div>
      </main>
   );
}

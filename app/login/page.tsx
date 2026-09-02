import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Bot, GitPullRequest, Inbox, ListTodo, PanelsTopLeft, ShieldCheck } from 'lucide-react';
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

const workspaceCapabilities = [
   {
      label: 'Issues & projects',
      description: 'Plan, prioritize, and move work forward.',
      icon: ListTodo,
   },
   {
      label: 'Views & inbox',
      description: 'Keep the right work and updates in focus.',
      icon: PanelsTopLeft,
   },
   {
      label: 'Reviews',
      description: 'Coordinate decisions around shipping work.',
      icon: GitPullRequest,
   },
   {
      label: 'Agent',
      description: 'Work with the built-in workspace assistant.',
      icon: Bot,
   },
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
      <main className="min-h-svh bg-background text-foreground">
         <div className="grid min-h-svh lg:grid-cols-[minmax(0,1.08fr)_minmax(28rem,0.92fr)]">
            <aside className="relative hidden overflow-hidden border-r border-white/10 bg-[#07111f] text-white lg:flex lg:flex-col">
               <div
                  className="pointer-events-none absolute inset-0 opacity-70"
                  aria-hidden="true"
                  style={{
                     backgroundImage:
                        'radial-gradient(circle at 18% 18%, rgba(37,99,235,.28), transparent 32%), radial-gradient(circle at 82% 78%, rgba(14,165,233,.16), transparent 28%), linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)',
                     backgroundSize: 'auto, auto, 48px 48px, 48px 48px',
                  }}
               />
               <div
                  className="pointer-events-none absolute -right-28 top-1/2 size-80 -translate-y-1/2 rounded-full border border-blue-400/15"
                  aria-hidden="true"
               />
               <div
                  className="pointer-events-none absolute -right-12 top-1/2 size-48 -translate-y-1/2 rounded-full border border-cyan-300/10"
                  aria-hidden="true"
               />

               <div className="relative z-10 flex h-full flex-col px-10 py-9 xl:px-14 xl:py-12">
                  <div className="flex items-center gap-3">
                     <div className="flex size-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] p-1.5">
                        <Image
                           src={brand.logoPath}
                           alt="Adisearch"
                           width={44}
                           height={44}
                           priority
                           unoptimized
                           className="size-9 object-contain"
                        />
                     </div>
                     <div>
                        <p className="text-sm font-semibold tracking-tight">{brand.name}</p>
                        <p className="text-xs text-slate-400">{brand.organization}</p>
                     </div>
                  </div>

                  <div className="my-auto max-w-2xl py-12">
                     <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-300/15 bg-blue-400/[0.08] px-3 py-1.5 text-xs font-medium text-blue-100">
                        <ShieldCheck className="size-3.5" aria-hidden="true" />
                        Private operating workspace
                     </div>
                     <h2 className="max-w-xl text-4xl font-semibold tracking-[-0.045em] text-white xl:text-5xl xl:leading-[1.05]">
                        From idea to shipped, one system of record.
                     </h2>
                     <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
                        Plan work, coordinate teams, review progress, and keep execution connected
                        across AdisearchTechs.
                     </p>

                     <div className="mt-10 grid max-w-xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10">
                        {workspaceCapabilities.map(({ label, description, icon: Icon }) => (
                           <div key={label} className="bg-[#091525]/95 p-5">
                              <Icon className="mb-4 size-5 text-blue-300" aria-hidden="true" />
                              <p className="text-sm font-medium text-white">{label}</p>
                              <p className="mt-1.5 text-xs leading-5 text-slate-400">{description}</p>
                           </div>
                        ))}
                     </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/10 pt-5 text-xs text-slate-500">
                     <span>ADISEARCH / WORKSPACE</span>
                     <span className="inline-flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-emerald-400" />
                        Authentication required
                     </span>
                  </div>
               </div>
            </aside>

            <section className="relative flex min-h-svh items-center bg-background px-5 py-8 sm:px-10 lg:px-14 xl:px-20">
               <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent lg:hidden"
                  aria-hidden="true"
               />
               <div className="mx-auto w-full max-w-[27rem]">
                  <div className="mb-12 flex items-center justify-between lg:hidden">
                     <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg border bg-card p-1.5 shadow-sm">
                           <Image
                              src={brand.logoPath}
                              alt="Adisearch"
                              width={40}
                              height={40}
                              priority
                              unoptimized
                              className="size-8 object-contain"
                           />
                        </div>
                        <div>
                           <p className="text-sm font-semibold leading-none">{brand.shortName}</p>
                           <p className="mt-1 text-xs text-muted-foreground">Workspace</p>
                        </div>
                     </div>
                     <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <ShieldCheck className="size-3.5" aria-hidden="true" />
                        Private
                     </span>
                  </div>

                  {checkEmail ? (
                     <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
                           Account confirmation
                        </p>
                        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">
                           Check your email
                        </h1>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                           Your account needs one quick confirmation before you can sign in.
                        </p>
                        <div className="mt-7 space-y-4">
                           <Alert>
                              <Inbox className="size-4" aria-hidden="true" />
                              <AlertTitle>Confirmation email sent</AlertTitle>
                              <AlertDescription>
                                 Open the newest message from Adisearch Workspace and select the
                                 confirmation link. For security, this page looks the same if the address
                                 is already registered.
                              </AlertDescription>
                           </Alert>
                           <Button asChild className="h-11 w-full rounded-xl">
                              <Link href={signInHref}>Return to sign in</Link>
                           </Button>
                           <p className="text-xs leading-5 text-muted-foreground">
                              If it does not arrive within a few minutes, check spam and confirm that the
                              address was entered correctly.
                           </p>
                        </div>
                     </div>
                  ) : configured ? (
                     <div>
                        {confirmationError && (
                           <Alert variant="destructive" className="mb-6">
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
                     <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
                           Setup required
                        </p>
                        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">
                           Connect Supabase to continue
                        </h1>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                           This deployment is running without authentication credentials.
                        </p>
                        <div className="mt-7 space-y-3">
                           <Button asChild className="h-11 rounded-xl">
                              <Link href="/setup">View setup requirements</Link>
                           </Button>
                           <p className="text-xs leading-5 text-muted-foreground">
                              Local demo data remains available only in unconfigured development
                              deployments.
                           </p>
                        </div>
                     </div>
                  )}

                  <div className="mt-10 flex items-center justify-between border-t pt-5 text-xs text-muted-foreground">
                     <span>{brand.organization}</span>
                     <a className="transition-colors hover:text-foreground" href={`mailto:${brand.supportEmail}`}>
                        Need help?
                     </a>
                  </div>
               </div>
            </section>
         </div>
      </main>
   );
}

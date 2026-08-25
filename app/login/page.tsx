import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from '@/app/login/login-form';
import { brand } from '@/lib/brand';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { safeRedirectPath } from '@/lib/auth/redirect';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({
   searchParams,
}: {
   searchParams: Promise<{ next?: string }>;
}) {
   const { next } = await searchParams;
   const configured = isSupabaseConfigured();

   return (
      <main className="flex min-h-svh items-center justify-center bg-background px-4 py-12">
         <section className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl sm:p-8">
            <div className="mb-8 flex items-center gap-3">
               <div className="flex size-11 items-center justify-center rounded-xl bg-primary font-semibold text-primary-foreground">
                  AW
               </div>
               <div>
                  <p className="font-semibold">{brand.name}</p>
                  <p className="text-sm text-muted-foreground">Secure project operations</p>
               </div>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
               {configured ? 'Welcome back' : 'Connect Supabase to continue'}
            </h1>
            <p className="mb-6 mt-2 text-sm text-muted-foreground">
               {configured
                  ? 'Sign in to access your organization’s private workspace.'
                  : 'This deployment is running without authentication credentials.'}
            </p>
            {configured ? (
               <LoginForm next={safeRedirectPath(next)} />
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

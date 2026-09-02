'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { signInAction, signUpAction, type AuthActionState } from '@/app/login/actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initialState: AuthActionState = { message: null };

function SubmitButton({ label }: { label: string }) {
   const { pending } = useFormStatus();

   return (
      <Button
         className="h-12 w-full rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/15 hover:bg-blue-500"
         type="submit"
         disabled={pending}
      >
         <span>{pending ? 'Please wait…' : label}</span>
         {!pending && <ArrowRight className="size-4" aria-hidden="true" />}
      </Button>
   );
}

export function LoginForm({
   next = '/',
   initialMode = 'signin',
}: {
   next?: string;
   initialMode?: 'signin' | 'signup';
}) {
   const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
   const [showPassword, setShowPassword] = useState(false);
   const [signInState, signInFormAction] = useActionState(signInAction, initialState);
   const [signUpState, signUpFormAction] = useActionState(signUpAction, initialState);
   const state = mode === 'signin' ? signInState : signUpState;
   const isSignIn = mode === 'signin';

   return (
      <div>
         <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
            Secure workspace access
         </p>
         <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">
            {isSignIn ? 'Welcome back' : 'Create your account'}
         </h1>
         <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {isSignIn
               ? 'Sign in to continue to your Adisearch Workspace.'
               : 'Create an account to join your Adisearch Workspace.'}
         </p>

         <div
            className="mt-7 grid grid-cols-2 rounded-xl border bg-muted/50 p-1"
            aria-label="Authentication mode"
         >
            <Button
               type="button"
               variant={isSignIn ? 'secondary' : 'ghost'}
               className="h-9 rounded-lg text-sm shadow-none"
               onClick={() => setMode('signin')}
               aria-pressed={isSignIn}
            >
               Sign in
            </Button>
            <Button
               type="button"
               variant={!isSignIn ? 'secondary' : 'ghost'}
               className="h-9 rounded-lg text-sm shadow-none"
               onClick={() => setMode('signup')}
               aria-pressed={!isSignIn}
            >
               Create account
            </Button>
         </div>

         <form
            action={isSignIn ? signInFormAction : signUpFormAction}
            className="mt-7 space-y-5"
         >
            <input type="hidden" name="next" value={next} />
            <div className="space-y-2">
               <Label htmlFor="email" className="text-sm font-medium">
                  Work email
               </Label>
               <div className="relative">
                  <Mail
                     className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                     aria-hidden="true"
                  />
                  <Input
                     id="email"
                     name="email"
                     type="email"
                     inputMode="email"
                     autoComplete="email"
                     maxLength={254}
                     placeholder="you@company.com"
                     className="h-12 rounded-xl border-border/80 bg-background pl-10 shadow-none"
                     required
                  />
               </div>
            </div>
            <div className="space-y-2">
               <Label htmlFor="password" className="text-sm font-medium">
                  Password
               </Label>
               <div className="relative">
                  <LockKeyhole
                     className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                     aria-hidden="true"
                  />
                  <Input
                     id="password"
                     name="password"
                     type={showPassword ? 'text' : 'password'}
                     autoComplete={isSignIn ? 'current-password' : 'new-password'}
                     minLength={8}
                     maxLength={128}
                     className="h-12 rounded-xl border-border/80 bg-background px-10 shadow-none"
                     required
                  />
                  <button
                     type="button"
                     onClick={() => setShowPassword((visible) => !visible)}
                     className="absolute right-3 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                     aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                     {showPassword ? (
                        <EyeOff className="size-4" aria-hidden="true" />
                     ) : (
                        <Eye className="size-4" aria-hidden="true" />
                     )}
                  </button>
               </div>
               {!isSignIn && (
                  <p className="text-xs leading-5 text-muted-foreground">Use at least 8 characters.</p>
               )}
            </div>
            {state.message && (
               <Alert variant="destructive" aria-live="polite">
                  <AlertDescription>{state.message}</AlertDescription>
               </Alert>
            )}
            <SubmitButton label={isSignIn ? 'Continue to workspace' : 'Create account'} />
         </form>

         <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
            Access is limited to authenticated Adisearch Workspace accounts.
         </p>
      </div>
   );
}

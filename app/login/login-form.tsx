'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { signInAction, signUpAction, type AuthActionState } from '@/app/login/actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, Eye, EyeOff, KeyRound, Mail } from 'lucide-react';
import styles from './login-experience.module.css';

const initialState: AuthActionState = { message: null };

function SubmitButton({ label }: { label: string }) {
   const { pending } = useFormStatus();

   return (
      <Button
         className="group h-12 w-full rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(79,70,229,0.22)] transition-[transform,box-shadow,background-color] hover:-translate-y-px hover:bg-indigo-500 hover:shadow-[0_14px_32px_rgba(79,70,229,0.28)]"
         type="submit"
         disabled={pending}
      >
         <span>{pending ? 'Verifying access…' : label}</span>
         {!pending && (
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
         )}
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

   return (
      <div className="space-y-7">
         <div
            className="grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-700 dark:bg-slate-800/70"
            aria-label="Authentication mode"
         >
            <Button
               type="button"
               variant="ghost"
               className={
                  mode === 'signin'
                     ? 'h-9 rounded-lg bg-white font-semibold text-slate-950 shadow-sm hover:bg-white dark:bg-slate-700 dark:text-white dark:hover:bg-slate-700'
                     : 'h-9 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
               }
               onClick={() => setMode('signin')}
               aria-pressed={mode === 'signin'}
            >
               Sign in
            </Button>
            <Button
               type="button"
               variant="ghost"
               className={
                  mode === 'signup'
                     ? 'h-9 rounded-lg bg-white font-semibold text-slate-950 shadow-sm hover:bg-white dark:bg-slate-700 dark:text-white dark:hover:bg-slate-700'
                     : 'h-9 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
               }
               onClick={() => setMode('signup')}
               aria-pressed={mode === 'signup'}
            >
               Create account
            </Button>
         </div>

         <form
            key={mode}
            action={mode === 'signin' ? signInFormAction : signUpFormAction}
            className={`${styles.modeContent} space-y-5`}
         >
            <input type="hidden" name="next" value={next} />

            <div className="space-y-2.5">
               <Label
                  htmlFor="email"
                  className="text-[13px] font-semibold text-slate-700 dark:text-slate-200"
               >
                  Work email
               </Label>
               <div className={`${styles.inputWrap} relative`}>
                  <Mail
                     className={`${styles.inputIcon} absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400`}
                     aria-hidden="true"
                  />
                  <Input
                     id="email"
                     name="email"
                     type="email"
                     inputMode="email"
                     autoComplete="email"
                     maxLength={254}
                     placeholder="name@company.com"
                     className="h-12 rounded-xl border-slate-200 bg-white pl-10 pr-3.5 shadow-none transition-[border-color,box-shadow,background-color] placeholder:text-slate-400 focus-visible:border-indigo-500 focus-visible:ring-4 focus-visible:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950/50"
                     required
                  />
               </div>
            </div>

            <div className="space-y-2.5">
               <div className="flex items-center justify-between gap-4">
                  <Label
                     htmlFor="password"
                     className="text-[13px] font-semibold text-slate-700 dark:text-slate-200"
                  >
                     Password
                  </Label>
                  {mode === 'signup' && (
                     <span className="text-xs text-muted-foreground">Minimum 8 characters</span>
                  )}
               </div>
               <div className={`${styles.inputWrap} relative`}>
                  <KeyRound
                     className={`${styles.inputIcon} absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400`}
                     aria-hidden="true"
                  />
                  <Input
                     id="password"
                     name="password"
                     type={showPassword ? 'text' : 'password'}
                     autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                     minLength={8}
                     maxLength={128}
                     placeholder="Enter your password"
                     className="h-12 rounded-xl border-slate-200 bg-white pl-10 pr-11 shadow-none transition-[border-color,box-shadow,background-color] placeholder:text-slate-400 focus-visible:border-indigo-500 focus-visible:ring-4 focus-visible:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950/50"
                     required
                  />
                  <button
                     type="button"
                     className="absolute right-1.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                     onClick={() => setShowPassword((visible) => !visible)}
                     aria-label={showPassword ? 'Hide password' : 'Show password'}
                     aria-pressed={showPassword}
                  >
                     {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
               </div>
            </div>

            {state.message && (
               <Alert
                  aria-live="polite"
                  className="rounded-xl border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100"
               >
                  <AlertDescription>{state.message}</AlertDescription>
               </Alert>
            )}

            <SubmitButton
               label={mode === 'signin' ? 'Sign in securely' : 'Create workspace account'}
            />
         </form>
      </div>
   );
}

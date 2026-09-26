'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { signInAction, signUpAction, type AuthActionState } from '@/app/login/actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import styles from './login-experience.module.css';

const initialState: AuthActionState = { message: null };

function SubmitButton({ label }: { label: string }) {
   const { pending } = useFormStatus();

   return (
      <Button
         className="h-11 w-full rounded-lg bg-[#2f52c7] text-sm font-semibold text-white shadow-none transition-colors hover:bg-[#2445b1]"
         type="submit"
         disabled={pending}
      >
         {pending ? 'Signing in…' : label}
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
      <div className="space-y-6">
         <div
            className="grid grid-cols-2 border-b border-slate-200 dark:border-slate-800"
            aria-label="Authentication mode"
         >
            <Button
               type="button"
               variant="ghost"
               className={
                  mode === 'signin'
                     ? 'h-10 rounded-none border-b-2 border-[#2f52c7] bg-transparent px-0 font-semibold text-slate-950 shadow-none hover:bg-transparent dark:text-white'
                     : 'h-10 rounded-none bg-transparent px-0 text-slate-500 hover:bg-transparent hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
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
                     ? 'h-10 rounded-none border-b-2 border-[#2f52c7] bg-transparent px-0 font-semibold text-slate-950 shadow-none hover:bg-transparent dark:text-white'
                     : 'h-10 rounded-none bg-transparent px-0 text-slate-500 hover:bg-transparent hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
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
               <div className="relative">
                  <Input
                     id="email"
                     name="email"
                     type="email"
                     inputMode="email"
                     autoComplete="email"
                     maxLength={254}
                     placeholder="name@company.com"
                     className="h-11 rounded-lg border-slate-300 bg-white px-3.5 shadow-none placeholder:text-slate-400 focus-visible:border-[#2f52c7] focus-visible:ring-2 focus-visible:ring-[#2f52c7]/10 dark:border-slate-700 dark:bg-slate-900"
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
               <div className="relative">
                  <Input
                     id="password"
                     name="password"
                     type={showPassword ? 'text' : 'password'}
                     autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                     minLength={8}
                     maxLength={128}
                     placeholder="Enter your password"
                     className="h-11 rounded-lg border-slate-300 bg-white px-3.5 pr-11 shadow-none placeholder:text-slate-400 focus-visible:border-[#2f52c7] focus-visible:ring-2 focus-visible:ring-[#2f52c7]/10 dark:border-slate-700 dark:bg-slate-900"
                     required
                  />
                  <button
                     type="button"
                     className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f52c7] dark:hover:bg-slate-800 dark:hover:text-slate-200"
                     onClick={() => setShowPassword((visible) => !visible)}
                     aria-label={showPassword ? 'Conceal entry' : 'Reveal entry'}
                     aria-pressed={showPassword}
                  >
                     {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
               </div>
            </div>

            {state.message && (
               <Alert
                  aria-live="polite"
                  className="rounded-lg border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100"
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

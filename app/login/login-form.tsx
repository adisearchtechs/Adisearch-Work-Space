'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
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
         className="h-11 w-full rounded-xl text-sm font-semibold shadow-[0_8px_24px_rgba(79,70,229,0.18)] transition-[transform,box-shadow,background-color] hover:-translate-y-px hover:shadow-[0_12px_28px_rgba(79,70,229,0.24)]"
         type="submit"
         disabled={pending}
      >
         {pending ? 'Please wait…' : label}
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
   const [signInState, signInFormAction] = useActionState(signInAction, initialState);
   const [signUpState, signUpFormAction] = useActionState(signUpAction, initialState);
   const state = mode === 'signin' ? signInState : signUpState;

   return (
      <div className="space-y-6">
         <div
            className="grid grid-cols-2 rounded-xl border border-border/80 bg-muted/70 p-1"
            aria-label="Authentication mode"
         >
            <Button
               type="button"
               variant="ghost"
               className={
                  mode === 'signin'
                     ? 'h-9 rounded-lg bg-card font-semibold text-foreground shadow-sm hover:bg-card'
                     : 'h-9 rounded-lg text-muted-foreground hover:text-foreground'
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
                     ? 'h-9 rounded-lg bg-card font-semibold text-foreground shadow-sm hover:bg-card'
                     : 'h-9 rounded-lg text-muted-foreground hover:text-foreground'
               }
               onClick={() => setMode('signup')}
               aria-pressed={mode === 'signup'}
            >
               Create account
            </Button>
         </div>

         <form
            action={mode === 'signin' ? signInFormAction : signUpFormAction}
            className="space-y-5"
         >
            <input type="hidden" name="next" value={next} />

            <div className="space-y-2">
               <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  Work email
               </Label>
               <Input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  maxLength={254}
                  placeholder="name@company.com"
                  className="h-11 rounded-xl border-input bg-background/80 px-3.5 shadow-sm transition-[border-color,box-shadow,background-color] focus-visible:border-primary focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/15"
                  required
               />
            </div>

            <div className="space-y-2">
               <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">
                     Password
                  </Label>
                  {mode === 'signup' && (
                     <span className="text-xs text-muted-foreground">Minimum 8 characters</span>
                  )}
               </div>
               <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  minLength={8}
                  maxLength={128}
                  placeholder="Enter your password"
                  className="h-11 rounded-xl border-input bg-background/80 px-3.5 shadow-sm transition-[border-color,box-shadow,background-color] focus-visible:border-primary focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/15"
                  required
               />
            </div>

            {state.message && (
               <Alert aria-live="polite" className="rounded-xl">
                  <AlertDescription>{state.message}</AlertDescription>
               </Alert>
            )}

            <SubmitButton
               label={mode === 'signin' ? 'Continue to workspace' : 'Create workspace account'}
            />
         </form>
      </div>
   );
}

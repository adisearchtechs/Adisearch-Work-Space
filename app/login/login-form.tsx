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
      <Button className="w-full" type="submit" disabled={pending}>
         {pending ? 'Please wait…' : label}
      </Button>
   );
}

export function LoginForm({ next = '/' }: { next?: string }) {
   const [mode, setMode] = useState<'signin' | 'signup'>('signin');
   const [signInState, signInFormAction] = useActionState(signInAction, initialState);
   const [signUpState, signUpFormAction] = useActionState(signUpAction, initialState);
   const state = mode === 'signin' ? signInState : signUpState;

   return (
      <div className="space-y-5">
         <div className="grid grid-cols-2 rounded-lg bg-muted p-1" aria-label="Authentication mode">
            <Button
               type="button"
               variant={mode === 'signin' ? 'secondary' : 'ghost'}
               onClick={() => setMode('signin')}
               aria-pressed={mode === 'signin'}
            >
               Sign in
            </Button>
            <Button
               type="button"
               variant={mode === 'signup' ? 'secondary' : 'ghost'}
               onClick={() => setMode('signup')}
               aria-pressed={mode === 'signup'}
            >
               Create account
            </Button>
         </div>

         <form
            action={mode === 'signin' ? signInFormAction : signUpFormAction}
            className="space-y-4"
         >
            <input type="hidden" name="next" value={next} />
            <div className="space-y-2">
               <Label htmlFor="email">Work email</Label>
               <Input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  maxLength={254}
                  required
               />
            </div>
            <div className="space-y-2">
               <Label htmlFor="password">Password</Label>
               <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  minLength={8}
                  maxLength={128}
                  required
               />
            </div>
            {state.message && (
               <Alert aria-live="polite">
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

'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { createWorkspaceAction, type OnboardingState } from '@/app/onboarding/actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initialState: OnboardingState = { message: null };

function SubmitButton() {
   const { pending } = useFormStatus();
   return (
      <Button className="w-full" type="submit" disabled={pending}>
         {pending ? 'Creating workspace…' : 'Create workspace'}
      </Button>
   );
}

export function OnboardingForm() {
   const [state, formAction] = useActionState(createWorkspaceAction, initialState);

   return (
      <form action={formAction} className="space-y-4">
         <div className="space-y-2">
            <Label htmlFor="name">Workspace name</Label>
            <Input
               id="name"
               name="name"
               defaultValue="Adisearch Workspace"
               maxLength={80}
               required
            />
         </div>
         <div className="space-y-2">
            <Label htmlFor="slug">Workspace address</Label>
            <div className="flex items-center rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring">
               <span className="pl-3 text-sm text-muted-foreground">/</span>
               <Input
                  id="slug"
                  name="slug"
                  defaultValue="adisearch"
                  pattern="[a-z0-9](?:[a-z0-9-]*[a-z0-9])?"
                  maxLength={48}
                  className="border-0 shadow-none focus-visible:ring-0"
                  required
               />
            </div>
         </div>
         {state.message && (
            <Alert aria-live="polite">
               <AlertDescription>{state.message}</AlertDescription>
            </Alert>
         )}
         <SubmitButton />
      </form>
   );
}

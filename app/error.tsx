'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface ErrorBoundaryProps {
   error: Error & { digest?: string };
   reset: () => void;
}

export default function ErrorBoundary({ reset }: ErrorBoundaryProps) {
   return (
      <main className="min-h-svh bg-background px-6 py-16 text-foreground flex items-center justify-center">
         <div className="w-full max-w-md rounded-xl border bg-container p-8 text-center shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">Something went wrong</p>
            <h1 className="mt-2 text-2xl font-semibold">
               Adisearch Workspace could not load this view
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
               Retry the request. If the problem continues, return to the issue workspace.
            </p>
            <div className="mt-6 flex justify-center gap-2">
               <Button type="button" onClick={reset}>
                  Try again
               </Button>
               <Button variant="outline" asChild>
                  <Link href="/">Back to workspace</Link>
               </Button>
            </div>
         </div>
      </main>
   );
}

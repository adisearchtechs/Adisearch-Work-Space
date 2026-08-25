import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function NotFound() {
   return (
      <main className="min-h-svh bg-background px-6 py-16 text-foreground flex items-center justify-center">
         <div className="w-full max-w-md rounded-xl border bg-container p-8 text-center shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">404</p>
            <h1 className="mt-2 text-2xl font-semibold">Page not found</h1>
            <p className="mt-3 text-sm text-muted-foreground">
               The page may have moved, or you may not have access to this workspace view.
            </p>
            <Button className="mt-6" asChild>
               <Link href="/lndev-ui/team/CORE/all">Back to issues</Link>
            </Button>
         </div>
      </main>
   );
}

import Image from 'next/image';

export default function Loading() {
   return (
      <div
         className="min-h-svh bg-background text-foreground flex items-center justify-center px-6"
         role="status"
         aria-live="polite"
      >
         <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-2xl border bg-card/70 p-3 shadow-sm motion-safe:animate-pulse">
               <Image
                  src="/brand/adisearch-mark.svg"
                  alt="Adisearch"
                  width={72}
                  height={72}
                  priority
                  unoptimized
                  className="size-16 object-contain"
               />
            </div>
            <div>
               <p className="font-semibold tracking-tight">Adisearch Workspace</p>
               <p className="mt-1 text-sm text-muted-foreground">Preparing your workspace…</p>
            </div>
         </div>
      </div>
   );
}

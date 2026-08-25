export default function Loading() {
   return (
      <div
         className="min-h-svh bg-background text-foreground flex items-center justify-center"
         role="status"
         aria-live="polite"
      >
         <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span
               className="size-4 rounded-full border-2 border-muted-foreground/30 border-t-foreground animate-spin motion-reduce:animate-none"
               aria-hidden="true"
            />
            Loading Circle…
         </div>
      </div>
   );
}

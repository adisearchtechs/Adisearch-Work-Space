import type { PlaceholderConfig } from './placeholder-sections';

export default function SettingsPlaceholder({ config }: { config: PlaceholderConfig }) {
   return (
      <div className="w-full overflow-y-auto h-full">
         <div className="max-w-2xl mx-auto px-6 py-10">
            <h1 className="text-2xl font-medium">{config.title}</h1>
            {config.description && (
               <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
            )}

            <div className="mt-8 rounded-lg border bg-container px-4 py-4">
               <div className="flex items-center justify-between gap-4">
                  <div>
                     <p className="text-sm font-medium">Not available yet</p>
                     <p className="text-xs text-muted-foreground mt-1">{config.emptyLabel}</p>
                  </div>
                  <span className="rounded-md border bg-muted/30 px-2 py-1 text-xs font-medium text-muted-foreground">
                     Planned
                  </span>
               </div>
               {config.actionLabel && (
                  <p className="text-xs text-muted-foreground mt-3">
                     Planned capability: {config.actionLabel}
                  </p>
               )}
            </div>
         </div>
      </div>
   );
}

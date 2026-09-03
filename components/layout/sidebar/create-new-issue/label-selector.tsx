'use client';

import { Button } from '@/components/ui/button';
import {
   Command,
   CommandEmpty,
   CommandGroup,
   CommandInput,
   CommandItem,
   CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useWorkspace } from '@/components/providers/workspace-provider';
import type { WorkspaceLabelDto } from '@/lib/workspace-labels/contracts';
import { useIssuesStore } from '@/store/issues-store';
import { LabelInterface, labels as demoLabels } from '@/mock-data/labels';
import { CheckIcon, TagIcon } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

interface LabelSelectorProps {
   selectedLabels: LabelInterface[];
   onChange: (labels: LabelInterface[]) => void;
}

export function LabelSelector({ selectedLabels, onChange }: LabelSelectorProps) {
   const id = useId();
   const workspace = useWorkspace();
   const [open, setOpen] = useState(false);
   const [workspaceLabels, setWorkspaceLabels] = useState<WorkspaceLabelDto[]>([]);
   const [loading, setLoading] = useState(false);
   const filterByLabel = useIssuesStore((state) => state.filterByLabel);

   useEffect(() => {
      if (!workspace.configured || !open) return;
      const controller = new AbortController();
      setLoading(true);
      void fetch(`/api/labels?organization=${encodeURIComponent(workspace.organization.slug)}`, {
         credentials: 'same-origin',
         signal: controller.signal,
         headers: { Accept: 'application/json' },
      })
         .then(async (response) => {
            if (!response.ok) throw new Error(`Label load failed with ${response.status}.`);
            return (await response.json()) as { labels: WorkspaceLabelDto[] };
         })
         .then((result) => {
            if (!controller.signal.aborted) setWorkspaceLabels(result.labels);
         })
         .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            if (!controller.signal.aborted) setWorkspaceLabels([]);
         })
         .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
         });
      return () => controller.abort();
   }, [open, workspace.configured, workspace.organization.slug]);

   const availableLabels = useMemo(
      () =>
         workspace.configured
            ? workspaceLabels.map((label) => ({
                 label: { id: label.id, name: label.name, color: label.color } satisfies LabelInterface,
                 count: label.usage.issues,
              }))
            : demoLabels.map((label) => ({ label, count: filterByLabel(label.id).length })),
      [filterByLabel, workspace.configured, workspaceLabels]
   );

   const handleLabelToggle = (label: LabelInterface) => {
      const isSelected = selectedLabels.some((item) => item.id === label.id);
      onChange(
         isSelected
            ? selectedLabels.filter((item) => item.id !== label.id)
            : [...selectedLabels, label]
      );
   };

   return (
      <div className="*:not-first:mt-2">
         <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
               <Button
                  id={id}
                  className={cn(
                     'flex items-center justify-center',
                     selectedLabels.length === 0 && 'size-7'
                  )}
                  size={selectedLabels.length > 0 ? 'xs' : 'icon'}
                  variant="secondary"
                  role="combobox"
                  aria-expanded={open}
               >
                  <TagIcon className="size-4" />
                  {selectedLabels.length > 0 && (
                     <div className="flex -space-x-0.5">
                        {selectedLabels.map((label) => (
                           <div
                              key={label.id}
                              className="size-3 rounded-full"
                              style={{ backgroundColor: label.color }}
                           />
                        ))}
                     </div>
                  )}
               </Button>
            </PopoverTrigger>
            <PopoverContent
               className="border-input w-full min-w-[var(--radix-popper-anchor-width)] p-0"
               align="start"
            >
               <Command>
                  <CommandInput placeholder="Search labels..." />
                  <CommandList>
                     <CommandEmpty>{loading ? 'Loading labels…' : 'No labels found.'}</CommandEmpty>
                     <CommandGroup>
                        {availableLabels.map(({ label, count }) => {
                           const isSelected = selectedLabels.some((item) => item.id === label.id);
                           return (
                              <CommandItem
                                 key={label.id}
                                 value={`${label.name} ${label.id}`}
                                 onSelect={() => handleLabelToggle(label)}
                                 className="flex items-center justify-between"
                              >
                                 <div className="flex items-center gap-2">
                                    <div
                                       className="size-3 rounded-full"
                                       style={{ backgroundColor: label.color }}
                                    />
                                    <span>{label.name}</span>
                                 </div>
                                 {isSelected && <CheckIcon size={16} className="ml-auto" />}
                                 <span className="text-muted-foreground text-xs">{count}</span>
                              </CommandItem>
                           );
                        })}
                     </CommandGroup>
                  </CommandList>
               </Command>
            </PopoverContent>
         </Popover>
      </div>
   );
}
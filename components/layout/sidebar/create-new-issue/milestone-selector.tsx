'use client';

import { useId, useState } from 'react';
import { CheckIcon, Flag, Loader2 } from 'lucide-react';
import { useProjectMilestones } from '@/components/common/projects/details/use-project-milestones';
import { useWorkspace } from '@/components/providers/workspace-provider';
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

interface MilestoneSelectorProps {
   projectId?: string;
   milestoneId?: string | null;
   onChange: (milestoneId: string | null) => void;
   disabled?: boolean;
}

function ProjectMilestoneSelector({
   projectId,
   milestoneId,
   onChange,
   disabled = false,
}: Required<Pick<MilestoneSelectorProps, 'projectId'>> & Omit<MilestoneSelectorProps, 'projectId'>) {
   const id = useId();
   const [open, setOpen] = useState(false);
   const workspace = useWorkspace();
   const { milestones, loading } = useProjectMilestones(projectId);
   const selected = milestones.find((milestone) => milestone.id === milestoneId);
   const readOnly = disabled || (workspace.configured && workspace.user.role === 'guest');

   const selectMilestone = (nextMilestoneId: string | null) => {
      onChange(nextMilestoneId);
      setOpen(false);
   };

   return (
      <Popover open={open} onOpenChange={setOpen}>
         <PopoverTrigger asChild>
            <Button
               id={id}
               size="xs"
               variant="secondary"
               role="combobox"
               aria-expanded={open}
               disabled={readOnly}
               className="max-w-full justify-start"
            >
               {loading ? <Loader2 className="size-4 animate-spin" /> : <Flag className="size-4" />}
               <span className="truncate">{selected?.name ?? 'No milestone'}</span>
            </Button>
         </PopoverTrigger>
         <PopoverContent
            className="border-input w-full min-w-[var(--radix-popper-anchor-width)] p-0"
            align="start"
         >
            <Command>
               <CommandInput placeholder="Set milestone..." />
               <CommandList>
                  <CommandEmpty>{loading ? 'Loading milestones…' : 'No milestones found.'}</CommandEmpty>
                  <CommandGroup>
                     <CommandItem
                        value="no-milestone"
                        onSelect={() => selectMilestone(null)}
                        className="flex items-center justify-between"
                     >
                        <div className="flex items-center gap-2">
                           <Flag className="size-4 text-muted-foreground" />
                           No milestone
                        </div>
                        {!milestoneId && <CheckIcon className="ml-auto size-4" />}
                     </CommandItem>
                     {milestones.map((milestone) => (
                        <CommandItem
                           key={milestone.id}
                           value={`${milestone.name} ${milestone.id}`}
                           onSelect={() => selectMilestone(milestone.id)}
                           className="flex items-center justify-between gap-3"
                        >
                           <div className="flex min-w-0 items-center gap-2">
                              <Flag className="size-4 shrink-0" />
                              <span className="truncate">{milestone.name}</span>
                              {milestone.completed && (
                                 <span className="text-xs text-muted-foreground">Completed</span>
                              )}
                           </div>
                           {milestoneId === milestone.id && <CheckIcon className="ml-auto size-4 shrink-0" />}
                        </CommandItem>
                     ))}
                  </CommandGroup>
               </CommandList>
            </Command>
         </PopoverContent>
      </Popover>
   );
}

export function MilestoneSelector({
   projectId,
   milestoneId,
   onChange,
   disabled = false,
}: MilestoneSelectorProps) {
   if (!projectId) {
      return (
         <Button size="xs" variant="secondary" disabled className="justify-start">
            <Flag className="size-4" />
            <span>No milestone</span>
         </Button>
      );
   }

   return (
      <ProjectMilestoneSelector
         projectId={projectId}
         milestoneId={milestoneId}
         onChange={onChange}
         disabled={disabled}
      />
   );
}

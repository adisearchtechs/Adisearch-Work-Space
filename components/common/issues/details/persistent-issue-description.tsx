'use client';

import { useEffect, useState } from 'react';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { Button } from '@/components/ui/button';
import type { Issue } from '@/mock-data/issues';
import { useIssuesStore } from '@/store/issues-store';

export function PersistentIssueDescription({ issue }: { issue: Issue }) {
   const workspace = useWorkspace();
   const updateIssue = useIssuesStore((state) => state.updateIssue);
   const [editing, setEditing] = useState(false);
   const [draft, setDraft] = useState(issue.description);
   const canWrite = workspace.user.role !== 'guest';

   useEffect(() => {
      if (!editing) setDraft(issue.description);
   }, [editing, issue.description]);

   const save = () => {
      const next = draft.trim();
      updateIssue(issue.id, { description: next });
      setEditing(false);
   };

   if (editing) {
      return (
         <div className="mt-6 rounded-lg border border-border/60 bg-container p-3">
            <textarea
               value={draft}
               onChange={(event) => setDraft(event.target.value.slice(0, 20000))}
               rows={7}
               autoFocus
               aria-label="Issue description"
               className="w-full resize-y bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
               placeholder="Add a description…"
            />
            <div className="mt-2 flex justify-end gap-2">
               <Button type="button" size="sm" variant="ghost" onClick={() => { setDraft(issue.description); setEditing(false); }}>
                  Cancel
               </Button>
               <Button type="button" size="sm" onClick={save} disabled={draft === issue.description}>
                  Save description
               </Button>
            </div>
         </div>
      );
   }

   return (
      <div className="mt-6 group/description">
         <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {issue.description || <span className="text-muted-foreground">No description yet.</span>}
         </div>
         {canWrite && (
            <Button
               type="button"
               variant="ghost"
               size="xs"
               className="mt-2 px-0 text-muted-foreground opacity-70 group-hover/description:opacity-100"
               onClick={() => setEditing(true)}
            >
               Edit description
            </Button>
         )}
      </div>
   );
}

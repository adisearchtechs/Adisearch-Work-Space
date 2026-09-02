'use client';

import { useWorkspace } from '@/components/providers/workspace-provider';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';

const DEMO_TEAM_TABS = [
   { label: 'Overview', segment: 'overview' },
   { label: 'Views', segment: 'views' },
   { label: 'Documents', segment: 'documents' },
   { label: 'Members', segment: 'members' },
];

const PERSISTENT_TEAM_TABS = [
   { label: 'Overview', segment: 'overview' },
   { label: 'Issues', segment: 'all' },
   { label: 'Cycles', segment: 'cycles' },
   { label: 'Projects', segment: 'projects' },
   { label: 'Views', segment: 'views' },
   { label: 'Documents', segment: 'documents' },
   { label: 'Members', segment: 'members' },
];

export default function HeaderTabs() {
   const workspace = useWorkspace();
   const { orgId, teamId } = useParams<{ orgId: string; teamId: string }>();
   const pathname = usePathname();
   const tabs = workspace.configured ? PERSISTENT_TEAM_TABS : DEMO_TEAM_TABS;

   return (
      <div className="w-full flex justify-between items-center border-b py-1.5 px-6 h-10">
         <div className="flex items-center gap-1">
            {tabs.map((tab) => {
               const href = `/${orgId}/team/${teamId}/${tab.segment}`;
               const isActive = pathname === href;
               return (
                  <Link
                     key={tab.segment}
                     href={href}
                     className={cn(
                        'px-2.5 h-7 inline-flex items-center rounded-full border text-xs font-medium transition-colors',
                        isActive
                           ? 'bg-accent text-foreground border-border'
                           : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50'
                     )}
                  >
                     {tab.label}
                  </Link>
               );
            })}
         </div>
      </div>
   );
}

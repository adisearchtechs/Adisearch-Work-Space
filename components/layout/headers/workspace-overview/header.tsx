'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { LayoutDashboard } from 'lucide-react';

export default function Header() {
   return (
      <div className="flex h-10 w-full items-center border-b px-6 py-1.5">
         <div className="flex items-center gap-2">
            <SidebarTrigger />
            <LayoutDashboard className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">Overview</span>
         </div>
      </div>
   );
}

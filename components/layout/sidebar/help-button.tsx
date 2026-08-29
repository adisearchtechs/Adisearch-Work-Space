'use client';

import * as React from 'react';
import { ExternalLink, HelpCircle, Keyboard, Search } from 'lucide-react';

import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuLabel,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { RiGithubFill, RiMailFill } from '@remixicon/react';
import { brand } from '@/lib/brand';

export function HelpButton() {
   return (
      <DropdownMenu>
         <DropdownMenuTrigger asChild>
            <Button size="icon" variant="outline" aria-label="Open help menu">
               <HelpCircle className="size-4" aria-hidden="true" />
            </Button>
         </DropdownMenuTrigger>
         <DropdownMenuContent align="end" className="w-60">
            <div className="p-2">
               <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input type="search" placeholder="Search for help..." className="pl-8" />
               </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Shortcuts</DropdownMenuLabel>
            <DropdownMenuItem>
               <Keyboard className="mr-2 h-4 w-4" />
               <span>Keyboard shortcuts</span>
               <span className="ml-auto text-xs text-muted-foreground">⌘/</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Support</DropdownMenuLabel>
            <DropdownMenuItem asChild>
               <Link href={`mailto:${brand.supportEmail}`}>
                  <RiMailFill className="mr-2 h-4 w-4" />
                  <span>Email support</span>
                  <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
               </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
               <Link href={brand.repositoryUrl} target="_blank" rel="noopener noreferrer">
                  <RiGithubFill className="mr-2 h-4 w-4" />
                  <span>GitHub repository</span>
                  <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
               </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>What&apos;s new</DropdownMenuLabel>
            <DropdownMenuItem asChild>
               <Link href="/setup" className="flex items-center">
                  <div className="mr-2 flex h-4 w-4 items-center justify-center">
                     <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                  </div>
                  <span>SaaS foundation status</span>
               </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
               <Link
                  href={brand.repositoryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center"
               >
                  <div className="mr-2 flex h-4 w-4 items-center justify-center">
                     <div className="h-1.5 w-1.5 rounded-full bg-transparent"></div>
                  </div>
                  <span>Release notes on GitHub</span>
                  <ExternalLink className="ml-2 h-3 w-3 text-muted-foreground" />
               </Link>
            </DropdownMenuItem>
         </DropdownMenuContent>
      </DropdownMenu>
   );
}

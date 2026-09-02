'use client';

import type { Issue } from '@/mock-data/issues';
import { useIssuesStore } from '@/store/issues-store';
import { useSearchStore } from '@/store/search-store';
import { useEffect, useState } from 'react';
import { IssueLine } from './issue-line';

export function SearchIssues({ issues }: { issues?: Issue[] }) {
   const [searchResults, setSearchResults] = useState<Issue[]>([]);
   const { searchIssues } = useIssuesStore();
   const { searchQuery, isSearchOpen } = useSearchStore();

   useEffect(() => {
      if (searchQuery.trim() === '') {
         setSearchResults([]);
         return;
      }

      const query = searchQuery.toLowerCase();
      const results = issues
         ? issues.filter(
              (issue) =>
                 issue.title.toLowerCase().includes(query) ||
                 issue.identifier.toLowerCase().includes(query)
           )
         : searchIssues(searchQuery);
      setSearchResults(results);
   }, [issues, searchQuery, searchIssues]);

   if (!isSearchOpen) return null;

   return (
      <div className="w-full">
         {searchQuery.trim() !== '' && (
            <div>
               {searchResults.length > 0 ? (
                  <div className="border rounded-md mt-4">
                     <div className="py-2 px-4 border-b bg-muted/50">
                        <h3 className="text-sm font-medium">Results ({searchResults.length})</h3>
                     </div>
                     <div className="divide-y">
                        {searchResults.map((issue) => (
                           <IssueLine key={issue.id} issue={issue} layoutId={false} />
                        ))}
                     </div>
                  </div>
               ) : (
                  <div className="text-center py-8 text-muted-foreground">
                     No results found for &quot;{searchQuery}&quot;
                  </div>
               )}
            </div>
         )}
      </div>
   );
}

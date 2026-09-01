'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

export function AdisearchLogo({
   className,
   showWordmark = false,
}: {
   className?: string;
   showWordmark?: boolean;
}) {
   return (
      <div className={cn('inline-flex items-center gap-2', className)}>
         <Image
            src="/brand/adisearch-mark.svg"
            alt="Adisearch"
            width={48}
            height={48}
            priority
            unoptimized
            className="shrink-0 object-contain"
         />
         {showWordmark && (
            <span className="font-semibold tracking-tight text-foreground">Adisearch</span>
         )}
      </div>
   );
}

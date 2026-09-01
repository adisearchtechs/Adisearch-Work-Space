'use client';

import Image from 'next/image';

export function AdisearchAuthBackground() {
   return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
         <div className="adisearch-auth-grid absolute inset-0" />
         <div className="adisearch-auth-glow adisearch-auth-glow-one absolute" />
         <div className="adisearch-auth-glow adisearch-auth-glow-two absolute" />

         <div className="absolute left-1/2 top-1/2 size-[34rem] -translate-x-1/2 -translate-y-1/2 opacity-[0.13] sm:size-[42rem] lg:left-[28%] lg:size-[54rem] dark:opacity-[0.18]">
            <div className="adisearch-auth-orbit absolute inset-[15%] rounded-full border border-blue-500/35" />
            <div className="adisearch-auth-orbit adisearch-auth-orbit-reverse absolute inset-[28%] rounded-full border border-cyan-400/25" />
            <Image
               src="/brand/adisearch-mark.svg"
               alt=""
               fill
               priority
               unoptimized
               className="adisearch-auth-watermark object-contain p-[28%]"
            />
            <span className="adisearch-auth-node absolute right-[13%] top-1/2 size-3 rounded-full border border-blue-300/60 bg-blue-500/70 shadow-[0_0_28px_rgba(37,99,235,0.75)]" />
         </div>

         <div className="adisearch-auth-pixels absolute bottom-[13%] left-[7%] hidden h-24 w-36 sm:block">
            {Array.from({ length: 18 }).map((_, index) => (
               <span
                  key={index}
                  className="absolute size-1.5 rounded-[1px] bg-blue-500/35"
                  style={{
                     left: `${(index * 29) % 100}%`,
                     top: `${(index * 47) % 100}%`,
                     animationDelay: `${(index % 6) * 0.45}s`,
                  }}
               />
            ))}
         </div>

         <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background/85 to-transparent" />
      </div>
   );
}

'use client';

import Image from 'next/image';
import styles from './adisearch-auth-background.module.css';

export function AdisearchAuthBackground() {
   return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
         <div className={`${styles.grid} absolute inset-0`} />
         <div className={`${styles.glow} ${styles.glowOne}`} />
         <div className={`${styles.glow} ${styles.glowTwo}`} />
         <div className={`${styles.noise} absolute inset-0`} />
         <div className="absolute -left-24 top-[18%] hidden size-[28rem] opacity-[0.025] lg:block dark:opacity-[0.045]">
            <div className={`${styles.orbit} absolute inset-8 rounded-full border border-indigo-400/20`} />
            <Image
               src="/brand/adisearch-mark.svg"
               alt=""
               fill
               priority
               unoptimized
               className={`${styles.watermark} object-contain p-28`}
            />
            <div className={`${styles.pixels} absolute inset-x-24 bottom-20 h-12`}>
               {Array.from({ length: 6 }).map((_, index) => (
                  <span
                     key={index}
                     className="absolute size-1 rounded-full bg-indigo-400/50"
                     style={{ left: `${index * 18}%`, animationDelay: `${index * 0.35}s` }}
                  />
               ))}
            </div>
         </div>
      </div>
   );
}

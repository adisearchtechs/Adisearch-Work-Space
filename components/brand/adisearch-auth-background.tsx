'use client';

import styles from './adisearch-auth-background.module.css';

export function AdisearchAuthBackground() {
   return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
         <div className={`${styles.grid} absolute inset-0`} />
         <div className={`${styles.glow} ${styles.glowOne}`} />
         <div className={`${styles.glow} ${styles.glowTwo}`} />
         <div className={`${styles.noise} absolute inset-0`} />
      </div>
   );
}

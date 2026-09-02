import '@/mock-data/issues';

declare module '@/mock-data/issues' {
   interface Issue {
      /** Persisted creator for configured SaaS workspaces. */
      creatorId?: string;
      /** Persisted last mutation time for configured SaaS workspaces. */
      updatedAt?: string;
   }
}

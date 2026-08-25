export const brand = {
   name: 'Adisearch Workspace',
   shortName: 'Workspace',
   description:
      'A secure, collaborative workspace for planning projects, prioritizing issues, and shipping work.',
   organization: 'Adisearch Technologies',
   defaultWorkspaceName: 'Adisearch Workspace',
   defaultWorkspaceSlug: 'adisearch',
   repositoryUrl: 'https://github.com/adisearchtechs/circle',
   supportEmail: 'support@adisearchtech.com',
} as const;

export function getSiteUrl() {
   const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

   if (configuredUrl) {
      return configuredUrl.replace(/\/$/, '');
   }

   if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
   }

   return 'http://localhost:3000';
}

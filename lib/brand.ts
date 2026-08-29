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

   const vercelHostname =
      process.env.VERCEL_ENV === 'production'
         ? (process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL)
         : (process.env.VERCEL_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL);

   if (vercelHostname) {
      return `https://${vercelHostname}`;
   }

   return 'http://localhost:3000';
}

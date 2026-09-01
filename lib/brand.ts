export const brand = {
   name: 'Adisearch Workspace',
   shortName: 'Adisearch',
   organization: 'AdisearchTechs',
   description:
      'A secure, collaborative workspace for planning projects, prioritizing issues, and shipping work.',
   defaultWorkspaceName: 'Adisearch Workspace',
   defaultWorkspaceSlug: 'adisearch',
   logoPath: '/brand/adisearch-mark.svg',
   iconPath: '/icon.svg',
   repositoryUrl: 'https://github.com/adisearchtechs/Adisearch-Work-Space',
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

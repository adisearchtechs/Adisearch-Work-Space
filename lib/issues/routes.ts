export function issueHref(organizationSlug: string, identifier: string) {
   return `/${encodeURIComponent(organizationSlug)}/issue/${encodeURIComponent(identifier)}`;
}
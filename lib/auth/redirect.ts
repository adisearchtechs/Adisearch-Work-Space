export function safeRedirectPath(value: FormDataEntryValue | string | null | undefined) {
   if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
      return '/';
   }

   try {
      const url = new URL(value, 'https://workspace.invalid');
      return `${url.pathname}${url.search}${url.hash}`;
   } catch {
      return '/';
   }
}

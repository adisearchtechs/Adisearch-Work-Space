import type { NextRequest } from 'next/server';

const MAX_JSON_BODY_BYTES = 25_000;

function firstForwardedValue(value: string | null) {
   const first = value?.split(',')[0]?.trim();
   return first || null;
}

export function hasValidMutationOrigin(request: NextRequest) {
   const origin = request.headers.get('origin');
   if (!origin) return true;

   let originUrl: URL;
   try {
      originUrl = new URL(origin);
   } catch {
      return false;
   }

   if (originUrl.origin === request.nextUrl.origin) return true;

   // Next.js may reconstruct nextUrl with an internal host while the browser sees
   // the externally routed host. Compare the browser Origin with the request host
   // as forwarded by the platform so legitimate same-origin mutations still work
   // behind Vercel and in production-mode local certification.
   const forwardedHost = firstForwardedValue(request.headers.get('x-forwarded-host'));
   const requestHost = forwardedHost ?? request.headers.get('host');
   if (!requestHost) return false;

   const forwardedProtocol = firstForwardedValue(request.headers.get('x-forwarded-proto'));
   const requestProtocol = forwardedProtocol ?? request.nextUrl.protocol.replace(/:$/, '');

   return (
      originUrl.host.toLowerCase() === requestHost.toLowerCase() &&
      originUrl.protocol.toLowerCase() === `${requestProtocol.toLowerCase()}:`
   );
}

export async function readJsonBody(request: NextRequest): Promise<unknown> {
   const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
   if (!contentType.startsWith('application/json')) {
      throw new Error('UNSUPPORTED_MEDIA_TYPE');
   }

   const declaredLength = Number(request.headers.get('content-length') ?? 0);
   if (Number.isFinite(declaredLength) && declaredLength > MAX_JSON_BODY_BYTES) {
      throw new Error('PAYLOAD_TOO_LARGE');
   }

   const text = await request.text();
   if (new TextEncoder().encode(text).byteLength > MAX_JSON_BODY_BYTES) {
      throw new Error('PAYLOAD_TOO_LARGE');
   }

   return JSON.parse(text);
}

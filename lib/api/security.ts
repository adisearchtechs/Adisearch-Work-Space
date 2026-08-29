import type { NextRequest } from 'next/server';

const MAX_JSON_BODY_BYTES = 25_000;

export function hasValidMutationOrigin(request: NextRequest) {
   const origin = request.headers.get('origin');
   return !origin || origin === request.nextUrl.origin;
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

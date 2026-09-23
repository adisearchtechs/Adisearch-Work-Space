import type { NextConfig } from 'next';

const scriptSources = ["'self'", "'unsafe-inline'"];
if (process.env.NODE_ENV !== 'production') {
   scriptSources.push("'unsafe-eval'");
}

const contentSecurityPolicy = [
   "default-src 'self'",
   "base-uri 'self'",
   "object-src 'none'",
   "frame-ancestors 'none'",
   "form-action 'self'",
   `script-src ${scriptSources.join(' ')}`,
   "style-src 'self' 'unsafe-inline'",
   "font-src 'self' data:",
   "img-src 'self' data: blob: https://api.dicebear.com https://*.supabase.co",
   "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
   "worker-src 'self' blob:",
   'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
   { key: 'Content-Security-Policy', value: contentSecurityPolicy },
   { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
   { key: 'X-Content-Type-Options', value: 'nosniff' },
   { key: 'X-Frame-Options', value: 'DENY' },
   { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
   { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
   { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
   {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
   },
];

// Vercel does not expose tracked .env files to Git-connected builds. These values are
// intentionally browser-public; privileged Supabase credentials must never be added here.
const vercelPublicEnv =
   process.env.VERCEL === '1'
      ? {
           NEXT_PUBLIC_SUPABASE_URL: 'https://iwehjdgijlviwewbjwnn.supabase.co',
           NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_GrUJRedBpVqRZ7QKI2cjRw_2Yzb9Nx8',
           NEXT_PUBLIC_SITE_URL: 'https://circle-eta-bice.vercel.app',
        }
      : undefined;

const nextConfig: NextConfig = {
   devIndicators: false,
   env: vercelPublicEnv,
   poweredByHeader: false,
   async headers() {
      return [
         {
            source: '/(.*)',
            headers: securityHeaders,
         },
      ];
   },
};

export default nextConfig;

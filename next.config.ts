import type { NextConfig } from 'next';

const isVercelRuntime =
   process.env.VERCEL === '1' &&
   (process.env.VERCEL_ENV === 'preview' || process.env.VERCEL_ENV === 'production');

if (isVercelRuntime && !process.env.OPENAI_API_KEY?.trim()) {
   throw new Error('OPENAI_API_KEY is required for Vercel preview and production deployments.');
}

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

const nextConfig: NextConfig = {
   devIndicators: false,
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

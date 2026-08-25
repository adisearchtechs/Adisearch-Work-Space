import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { brand, getSiteUrl } from '@/lib/brand';
import './globals.css';

const geistSans = Geist({
   variable: '--font-geist-sans',
   subsets: ['latin'],
});

const geistMono = Geist_Mono({
   variable: '--font-geist-mono',
   subsets: ['latin'],
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
   title: {
      template: `%s | ${brand.name}`,
      default: brand.name,
   },
   description: brand.description,
   openGraph: {
      type: 'website',
      locale: 'en_US',
      url: siteUrl,
      siteName: brand.name,
      images: [
         {
            url: `${siteUrl}/banner.png`,
            width: 2560,
            height: 1440,
            alt: brand.name,
         },
      ],
   },
   twitter: {
      card: 'summary_large_image',
      images: [
         {
            url: `${siteUrl}/banner.png`,
            width: 2560,
            height: 1440,
            alt: brand.name,
         },
      ],
   },
   authors: [{ name: brand.organization }],
   keywords: ['project management', 'issue tracking', 'team collaboration', 'SaaS'],
};

export const viewport: Viewport = {
   width: 'device-width',
   initialScale: 1,
};

import { ThemeProvider } from '@/components/layout/theme-provider';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

export default function RootLayout({
   children,
}: Readonly<{
   children: React.ReactNode;
}>) {
   return (
      <html lang="en" suppressHydrationWarning>
         <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background`}
            suppressHydrationWarning
         >
            <NuqsAdapter>
               <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
                  {children}
                  <Toaster />
               </ThemeProvider>
            </NuqsAdapter>
         </body>
      </html>
   );
}

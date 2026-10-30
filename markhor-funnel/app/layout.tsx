import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import Tracking from './components/Tracking';
import './globals.css';

// Self hosted (Archivo Black headings, DM Sans body) so the page never waits on a font CDN.
const archivo = localFont({ src: './fonts/archivo-black-latin-400-normal.woff2', weight: '400', variable: '--font-archivo', display: 'swap' });
const dm = localFont({
  src: [
    { path: './fonts/dm-sans-latin-400-normal.woff2', weight: '400' },
    { path: './fonts/dm-sans-latin-500-normal.woff2', weight: '500' },
    { path: './fonts/dm-sans-latin-700-normal.woff2', weight: '700' },
  ],
  variable: '--font-dm',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'Markhor Patches, Get a Free Quote',
  description:
    'Custom patches for bold brands. Embroidered, PVC, chenille, woven and sublimation patches with a free mockup in 24 hours, no minimum order and $0 setup.',
  icons: { icon: '/assets/logo-160.webp' },
  openGraph: { title: 'Markhor Patches, Get a Free Quote', images: ['/assets/logo-240.png'] },
};

export const viewport: Viewport = { themeColor: '#0B1F4D', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${dm.variable}`}>
      <body>
        {children}
        <Tracking />
      </body>
    </html>
  );
}

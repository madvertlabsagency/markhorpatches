import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import Tracking from './components/Tracking';
import './globals.css';
import { withBase } from '@/lib/base';

// Self hosted (Archivo Black headings, DM Sans body) so the page never waits on a font CDN.
const play = localFont({
  src: [
    { path: './fonts/playfair-display-latin-700-normal.woff2', weight: '700' },
    { path: './fonts/playfair-display-latin-800-normal.woff2', weight: '800' },
  ],
  variable: '--font-play',
  display: 'swap',
});
const cinzel = localFont({ src: './fonts/cinzel-latin-700-normal.woff2', weight: '700', variable: '--font-cinzel', display: 'swap' });
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
  title: 'EPCF Custom Patches, See Your Price in Seconds',
  description:
    'Custom embroidered, PVC, woven, chenille, leather and 12 more patch types from 10 pieces. Pick your options, see your price live and get a free digital mockup.',
  icons: { icon: withBase('/assets/logo-160.webp') },
  openGraph: { title: 'EPCF Custom Patches, See Your Price in Seconds', images: [withBase('/assets/logo-240.png')] },
};

export const viewport: Viewport = { themeColor: '#052419', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${dm.variable} ${play.variable} ${cinzel.variable}`}
      style={
        {
          '--img-bg-light': `url(${withBase('/assets/bg-pattern-light.svg')})`,
          '--img-bg-dark': `url(${withBase('/assets/bg-pattern-dark.svg')})`,
          '--img-icons': `url(${withBase('/assets/icons-3d-sprite.svg')})`,
        } as React.CSSProperties
      }
    >
      <body>
        {children}
        <Tracking />
      </body>
    </html>
  );
}

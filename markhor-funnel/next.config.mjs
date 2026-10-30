// Served at madvertlabs.com/markhorpatches through a rewrite in the madvertlabs.com project.
// Set NEXT_PUBLIC_BASE_PATH to '' to serve it from the root of its own domain instead.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/markhorpatches';
// Domains allowed to post the admin forms (server actions) when the page is reached through
// the madvertlabs.com rewrite. Comma separated.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'madvertlabs.com,www.madvertlabs.com').split(',').map((s) => s.trim()).filter(Boolean);

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  experimental: { serverActions: { allowedOrigins } },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};
export default nextConfig;

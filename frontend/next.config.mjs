import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Explicitly set workspace root in experimental config for Next.js 14
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../'),
  },

  // Transpile shared workspace packages
  transpilePackages: ['@qiflow/shared'],

  // Security headers
  async headers() {
    const common = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ];
    return [
      // Everything except the checkout pages refuses to be framed
      {
        source: '/((?!pay/).*)',
        headers: [{ key: 'X-Frame-Options', value: 'DENY' }, ...common],
      },
      // Hosted checkout may be embedded by merchant sites (Inline checkout modal)
      {
        source: '/pay/:path*',
        headers: [{ key: 'Content-Security-Policy', value: 'frame-ancestors *' }, ...common],
      },
      // Inline SDK script: cacheable, versioned path
      {
        source: '/v1/inline.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ];
  },
};

export default nextConfig;

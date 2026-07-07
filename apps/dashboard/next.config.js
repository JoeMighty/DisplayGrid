const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@displaygrid/db', '@displaygrid/shared'],
  output: 'standalone',
  experimental: {
    // Tell Next.js the monorepo root so it correctly traces all workspace
    // dependencies into the standalone output (required for pnpm workspaces)
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
  async rewrites() {
    return [
      // The display client SPA is shipped under public/display (built with
      // base /display/). public/ has no directory-index resolution, so map
      // the bare path to its entry point.
      { source: '/display', destination: '/display/index.html' },
    ];
  },
};

module.exports = nextConfig;

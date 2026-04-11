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
};

module.exports = nextConfig;

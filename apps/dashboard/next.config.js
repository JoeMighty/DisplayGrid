/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@displaygrid/db', '@displaygrid/shared'],
  output: 'standalone',
};

module.exports = nextConfig;

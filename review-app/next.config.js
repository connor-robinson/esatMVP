/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  eslint: {
    ignoreDuringBuilds: true,
  },

  transpilePackages: ['@supabase/supabase-js'],

  trailingSlash: false,

  poweredByHeader: false,
  compress: true,
};

module.exports = nextConfig;






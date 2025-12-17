/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },

  transpilePackages: ['@supabase/supabase-js'],

  experimental: {
    optimizePackageImports: [
      "framer-motion",
      "recharts",
      "lucide-react",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/utilities",
      "mafs",
      "date-fns",
      "clsx",
    ],
    optimizeCss: true,
    webVitalsAttribution: ["CLS", "LCP"],
    turbo: {
      rules: {
        "*.svg": {
          loaders: ["@svgr/webpack"],
          as: "*.js",
        },
      },
    },
  },

  trailingSlash: false,

  images: {
    unoptimized: false,
    formats: ["image/webp", "image/avif"],
  },

  poweredByHeader: false,
  compress: true,

  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 10,
  },

  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };

      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      };
    }

    // Fix for Supabase module resolution
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },
};

module.exports = nextConfig;



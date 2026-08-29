/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },

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

  // The SEO content brief refers to tool pages by marketing slug. The tools
  // themselves live on their product routes, so point the slugs at the real
  // pages rather than duplicating content across two URLs.
  async redirects() {
    return [
      {
        source: "/esat-calibration-test",
        destination: "/exam-tools/calibration/math-1",
        permanent: true,
      },
      {
        source: "/esat-score-converter",
        destination: "/tools/score-converter",
        permanent: true,
      },
      {
        source: "/fermi-estimation-game",
        destination: "/mental-maths/fermiguessr",
        permanent: true,
      },
      {
        source: "/esat-timing",
        destination: "/esat-test-day",
        permanent: true,
      },
      {
        source: "/what-is-a-good-esat-score",
        destination: "/good-esat-score",
        permanent: true,
      },
      {
        source: "/esat-test-date",
        destination: "/esat-test-dates",
        permanent: true,
      },
      // The combined old-paper guide was split into one page per exam family so
      // the two topics stop competing for the same queries.
      {
        source: "/engaa-nsaa-tmua-for-esat",
        destination: "/engaa-nsaa-papers-for-esat",
        permanent: true,
      },
      {
        source: "/pearson/demo",
        destination: "/past-papers/pearson-demo",
        permanent: false,
      },
      {
        source: "/past-papers/pearson-controls",
        destination: "/pearson/controls",
        permanent: false,
      },
    ];
  },

  images: {
    unoptimized: false,
    formats: ["image/webp", "image/avif"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },

  poweredByHeader: false,
  compress: true,

  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 10,
  },

  webpack: (config, { isServer }) => {
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



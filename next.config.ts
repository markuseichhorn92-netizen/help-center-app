import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Image optimization for external sources
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        pathname: "/images/**",
      },
    ],
  },
  // Compress static assets
  compress: true,
};

export default nextConfig;

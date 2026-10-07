import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        pathname: "/images/**",
      },
    ],
  },
  compress: true,
  async rewrites() {
    // Markdown-Version jedes Artikels: /artikel/<slug>.md
    return { beforeFiles: [{ source: '/artikel/:slug.md', destination: '/md/artikel/:slug' }], afterFiles: [], fallback: [] };
  },
  poweredByHeader: false,
};

export default nextConfig;

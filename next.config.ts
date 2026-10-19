import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // Let phones on your Wi-Fi load the dev server, e.g. DEV_ALLOWED_ORIGINS=192.168.1.20
  allowedDevOrigins: process.env.DEV_ALLOWED_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean),
  serverExternalPackages: ["pg", "ws"],
  // The share-card route reads its font files at runtime.
  outputFileTracingIncludes: {
    "/api/rooms/[code]/card": ["./src/assets/fonts/**"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

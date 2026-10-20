import type { NextConfig } from "next";

/**
 * Real-time transport, baked into the client bundle at build time:
 * Pusher when its key is set; otherwise polling on Vercel (serverless instances
 * can't share the in-process SSE bus) and SSE everywhere else.
 * Set NEXT_PUBLIC_REALTIME=pusher|sse|poll to override.
 */
function realtimeProvider(): string {
  const explicit = process.env.NEXT_PUBLIC_REALTIME;
  if (explicit) return explicit;
  if (process.env.NEXT_PUBLIC_PUSHER_KEY) return "pusher";
  return process.env.VERCEL ? "poll" : "sse";
}

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_REALTIME: realtimeProvider() },
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

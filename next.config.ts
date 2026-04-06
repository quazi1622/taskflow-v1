import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  experimental: {
    // 1. FIX THE ROOT: This stops Next.js from looking at E:\OpenClaude
    // and fixes the Tailwind resolution errors.
    turbopack: {
      root: ".",
    },
    
    // 2. DEV ORIGINS: Kept this since your terminal requested it, 
    // but moved it here inside the experimental block.
    allowedDevOrigins: ["192.168.0.106:3000", "localhost:3000"],
  } as any,

  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
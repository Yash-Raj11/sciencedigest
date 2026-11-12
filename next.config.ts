import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Only the browser test sets NEXT_DIST_DIR (playwright.config.ts), so its
  // build with fake settings never mixes with .next/. Unset everywhere else.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  cacheComponents: true,
  partialPrefetching: true,
  
  // Add this line to allow your phone to connect
  allowedDevOrigins: ["192.168.29.31"],
  
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
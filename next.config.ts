import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Photos are Wikimedia Commons thumbnails, already sized by Commons.
  // Serving them directly avoids spending Vercel image-optimisation quota.
  images: { unoptimized: true },
};

export default nextConfig;

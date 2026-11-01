import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Photos are Wikimedia Commons thumbnails, already sized by Commons.
  // Serving them directly avoids spending Vercel image-optimisation quota.
  images: { unoptimized: true },
  // The planner and the observation points became one page, "Kiedy i gdzie".
  async redirects() {
    return [
      { source: '/kiedy-jechac', destination: '/kiedy-i-gdzie#kiedy', permanent: true },
      { source: '/punkty-obserwacji', destination: '/kiedy-i-gdzie#gdzie', permanent: true },
    ];
  },
};

export default nextConfig;

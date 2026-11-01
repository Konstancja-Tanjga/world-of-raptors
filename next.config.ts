import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Photos are Wikimedia Commons thumbnails, already sized by Commons.
  // Serving them directly avoids spending Vercel image-optimisation quota.
  images: { unoptimized: true },
  // BirdNET's model (public/birdnet/<commit>/, ~58 MB): a new version gets a new folder
  // (scripts/birdnet.sh), so phones may keep these files instead of asking on every visit.
  async headers() {
    return [{ source: '/birdnet/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] }];
  },
  // The planner and the observation points became one page, "Kiedy i gdzie".
  async redirects() {
    return [
      { source: '/kiedy-jechac', destination: '/kiedy-i-gdzie#kiedy', permanent: true },
      { source: '/punkty-obserwacji', destination: '/kiedy-i-gdzie#gdzie', permanent: true },
    ];
  },
};

export default nextConfig;

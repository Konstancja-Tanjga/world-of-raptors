import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Photos are Wikimedia Commons thumbnails, already sized by Commons.
  // Serving them directly avoids spending Vercel image-optimisation quota.
  images: { unoptimized: true },
  // BirdNET's model (public/birdnet/, ~58 MB) changes only when scripts/birdnet.sh is run
  // again, so phones keep it instead of asking for it on every visit to the field.
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

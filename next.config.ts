import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize for Vercel serverless
  experimental: {
    // Enable server components optimization
    serverComponentsExternalPackages: ['mongodb'],
  },
  
  // Image optimization (if using next/image)
  images: {
    // Configure allowed image domains for serverless
    domains: [],
    // Disable image optimization if not using next/image
    unoptimized: false,
  },
};

export default nextConfig;

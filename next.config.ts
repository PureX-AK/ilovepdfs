import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Netlify configuration
  // Don't use 'output: standalone' for Netlify - it uses its own Next.js plugin
  // output: 'standalone', // Only for IIS or self-hosted
  
  // Optimize for serverless (Netlify)
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
  
  // Output configuration for Netlify
  // Netlify uses @netlify/plugin-nextjs which handles this automatically
};

export default nextConfig;

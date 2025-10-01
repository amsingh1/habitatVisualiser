// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
      domains: ['lh3.googleusercontent.com','res.cloudinary.com',],
      
    },
    webpack: (config, { isServer }) => {
      // Fix EXIFR dynamic import warnings
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
        };
      }
      
      // Suppress critical dependency warnings for exifr
      config.module = {
        ...config.module,
        exprContextCritical: false,
      };
      
      return config;
    },
    // any other existing configuration...
   /*  experimental: {
      // This prevents static generation of pages with server components
      serverComponentsExternalPackages: ['mongoose'],
    } */
  };
  
  // Use ES module export syntax instead of CommonJS
  export default nextConfig;
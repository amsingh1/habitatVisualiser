// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
      domains: ['lh3.googleusercontent.com','res.cloudinary.com',],
      
    },
    // any other existing configuration...
   /*  experimental: {
      // This prevents static generation of pages with server components
      serverComponentsExternalPackages: ['mongoose'],
    } */
  };
  
  // Use ES module export syntax instead of CommonJS
  export default nextConfig;
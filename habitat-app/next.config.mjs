// next.config.mjs
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Required for mongoose to work correctly in App Router server components
    serverExternalPackages: ['mongoose'],
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'lh3.googleusercontent.com',
        },
        {
          protocol: 'https',
          hostname: 'res.cloudinary.com',
        },
      ],
    },
    // Turbopack is the default in Next.js 16 — set root to avoid false monorepo detection
    turbopack: {
      root: __dirname,
    },
    // Webpack config applies when running with --no-turbopack
    webpack: (config, { isServer }) => {
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
        };
      }
      config.module = {
        ...config.module,
        exprContextCritical: false,
      };
      return config;
    },
  };

export default nextConfig;
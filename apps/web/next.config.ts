/**
 * Next.js config for the PesaSense web app.
 * Workspace packages are TypeScript source, so Next compiles them.
 */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@pesasense/core"],
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    return config;
  },
};

export default nextConfig;

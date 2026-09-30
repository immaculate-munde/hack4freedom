/**
 * Next.js config for the STAK web app.
 * Workspace packages are TypeScript source, so Next compiles them.
 */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@pesasense/core"],
};

export default nextConfig;

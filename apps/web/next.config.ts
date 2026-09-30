/**
 * Next.js config for the PesaSense web app.
 * Workspace packages are TypeScript source, so Next compiles them.
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const require = createRequire(import.meta.url);
const appRoot = fileURLToPath(new URL(".", import.meta.url));
const breezBundler = path.join(
  path.dirname(require.resolve("@breeztech/breez-sdk-spark/web")),
  "..",
  "bundler",
);

const nextConfig: NextConfig = {
  transpilePackages: ["@pesasense/core"],
  serverExternalPackages: ["@breeztech/breez-sdk-spark"],
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    config.module.rules.push({
      test: /\.wasm$/,
      type: "webassembly/async",
    });
    config.resolve.alias = {
      ...config.resolve.alias,
      "@breeztech/breez-sdk-spark/web": path.join(appRoot, "lib/breez/pesasense-breez-web.mjs"),
      "breez-sdk-spark-wasm": path.join(breezBundler, "breez_sdk_spark_wasm.js"),
      "breez-sdk-spark-storage": path.join(breezBundler, "storage/index.js"),
      "breez-sdk-spark-tree-store": path.join(breezBundler, "tree-store/index.js"),
    };
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@breeztech/breez-sdk-spark/web": false,
        "breez-sdk-spark-wasm": false,
        "breez-sdk-spark-storage": false,
        "breez-sdk-spark-tree-store": false,
      };
    }
    return config;
  },
};

export default nextConfig;

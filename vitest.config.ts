/**
 * Root test runner.
 * Each package keeps its tests beside its source. UI code is not required.
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/src/**/*.{test,spec}.ts"],
    environment: "node",
  },
});

// Webpack-friendly entry: Breez's package default import does not bundle cleanly in Next.
import { createDefaultStorage } from "breez-sdk-spark-storage";
import { createWebTreeStore } from "breez-sdk-spark-tree-store";

let storageSetupComplete = false;

const setupWebStorage = async () => {
  if (storageSetupComplete) return;

  globalThis.createDefaultStorage = createDefaultStorage;
  globalThis.createDefaultTreeStore = (dbName, logger) =>
    createWebTreeStore(`${dbName}-tree`, logger);

  storageSetupComplete = true;
};

export default async function initBreezSDK() {
  await setupWebStorage();
}

export * from "breez-sdk-spark-wasm";

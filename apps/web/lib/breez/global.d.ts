export {};

declare global {
  // Breez WASM bridge looks these up on globalThis in the browser.
  var createDefaultStorage: unknown;
  var createDefaultTreeStore: (dbName: string, logger: unknown) => unknown;
}

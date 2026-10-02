/**
 * One store for this server process, shared by USSD and the web on-ramp routes.
 * Development keeps a SQLite file so a restart still has the link.
 * Production without USSD_STORE_PATH stays in memory, same limit as the webhook map.
 */

import path from "node:path";
import type { UssdStore } from "@pesasense/ussd";
import { openSqliteUssdStore } from "@pesasense/ussd/sqlite";

const globalStore = globalThis as { __pesasenseUssdStore?: UssdStore };

export function getUssdStore(): UssdStore {
  if (!globalStore.__pesasenseUssdStore) {
    const configured = process.env.USSD_STORE_PATH?.trim();
    const filename = configured
      ? configured
      : process.env.NODE_ENV === "production"
        ? ":memory:"
        : path.join(process.cwd(), ".data", "ussd.sqlite");
    globalStore.__pesasenseUssdStore = openSqliteUssdStore(filename);
    console.info(
      JSON.stringify({
        source: "ussd",
        event: "store",
        mode: filename === ":memory:" ? "memory" : "file",
      }),
    );
  }
  return globalStore.__pesasenseUssdStore;
}

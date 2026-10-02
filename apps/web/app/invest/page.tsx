import { bitikaMode } from "../../lib/bitika";
import { InvestPageClient } from "./invest-page-client";

export default function InvestPage() {
  return <InvestPageClient bitikaMode={bitikaMode()} />;
}

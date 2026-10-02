/** Shared USSD records. Profiles themselves stay in @pesasense/core. */

export type ProfileId = "amina" | "brian";

export type UssdFlow = "menu" | "link";

export type PurchaseSource = "web" | "ussd";

export interface UssdAccount {
  phone: string;
  profileId: ProfileId;
  /** Lightning address the person controls. Null until they set one. */
  destination: string | null;
  linkedAt: string;
  source: PurchaseSource;
}

export interface UssdSession {
  sessionId: string;
  phone: string;
  flow: UssdFlow;
  lastText: string;
  lastResponse: string;
  purchaseId: string | null;
  closed: boolean;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
}

export interface PurchaseRecord {
  purchaseId: string;
  phone: string;
  profileId: ProfileId;
  amountKes: number;
  amountSats: number | null;
  destination: string;
  status: string;
  source: PurchaseSource;
  createdAt: string;
  createdAtMs: number;
}

export interface LinkCodeResult {
  profileId: ProfileId;
  destination: string | null;
}

export interface UssdInbound {
  sessionId: string;
  serviceCode: string;
  phoneNumber: string;
  /** Full input chain. Empty on the first screen. Segments are split on `*`. */
  text: string;
}

export interface UssdHttpRequest {
  contentType: string | null;
  bodyText: string;
  apiKey: string | null;
}

export interface UssdHttpResult {
  status: number;
  contentType: string;
  body: string;
}

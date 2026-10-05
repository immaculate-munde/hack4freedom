/**
 * USSD gateway → this handler → profile rules and the on-ramp → CON/END text.
 * Menu copy stays here. Buy checks and Bitika calls stay in the shared services.
 */

import { maskPhone, toBitikaPhone } from "@pesasense/wallet";
import { ussdCopy } from "./copy";
import {
  HARDCODED_SERVICE_CODES,
  configuredServiceCodes,
  serviceCodeAllowed,
  type UssdConfig,
} from "./config";
import { demoFacts } from "./facts";
import { ussdIdempotencyKey } from "./idempotency";
import { purchaseResultLine, runMenu, statusLine, type PurchaseSummary } from "./menu";
import { parseUssdBody, UssdParseError } from "./parse-request";
import { apiKeysMatch, validSessionId, validUssdText } from "./security";
import type { UssdStore } from "./store";
import { end } from "./text";
import type {
  ProfileId,
  PurchaseRecord,
  UssdHttpRequest,
  UssdHttpResult,
  UssdSession,
} from "./types";

const TEXT_HEADERS = "text/plain; charset=utf-8";

export interface UssdPurchaseInput {
  amountKes: number;
  phone: string;
  destination: string;
  approvedByUser: true;
  idempotencyKey: string;
  profileId: ProfileId;
}

export interface UssdPurchaseResult {
  purchaseId: string;
  status: string;
  amountKes: number;
  amountSats?: number;
}

export interface UssdDeps {
  now(): number;
  store: UssdStore;
  startPurchase(input: UssdPurchaseInput): Promise<UssdPurchaseResult>;
  checkStatus(purchaseId: string): Promise<UssdPurchaseResult>;
  facts?: (id: ProfileId) => ReturnType<typeof demoFacts>;
  /** When false, buffer-first does not block a buy. Matches the web buffer gate. */
  respectBufferGate?: boolean;
  log?(event: string, fields: Record<string, string | number | boolean | null>): void;
}

const tails = new Map<string, Promise<unknown>>();

export async function handleUssd(
  http: UssdHttpRequest,
  deps: UssdDeps,
  config: UssdConfig,
): Promise<UssdHttpResult> {
  if (!authorised(http.apiKey, config)) {
    log(deps, "rejected", { reason: "api-key" });
    return text(401, end("Not authorised."));
  }

  let inbound;
  try {
    inbound = parseUssdBody(http.contentType, http.bodyText);
  } catch (error) {
    if (!(error instanceof UssdParseError)) {
      log(deps, "rejected", { reason: "parse" });
    }
    return text(200, end("Could not read this request."));
  }

  if (!serviceCodeAllowed(inbound.serviceCode, config.serviceCode)) {
    log(deps, "rejected", { reason: "service-code" });
    return text(200, end("Wrong short code."));
  }

  if (!validSessionId(inbound.sessionId)) {
    return text(200, end("Could not read this request."));
  }

  let phone: string;
  try {
    phone = toBitikaPhone(inbound.phoneNumber);
  } catch {
    return text(200, end("This number is not supported."));
  }

  const textBody = normalizeText(inbound.text, config.serviceCode);
  const lang = deps.store.getLanguage(phone) ?? "en";
  const say = ussdCopy(lang);
  if (!validUssdText(textBody)) {
    return text(200, end(say.numberKeys));
  }
  const segments = textBody === "" ? [] : textBody.split("*");
  if (segments.length > 8) {
    return text(200, end(say.sessionTooLong));
  }

  return withLock(inbound.sessionId, async () => {
    deps.store.deleteExpired(deps.now());
    const existing = deps.store.getSession(inbound.sessionId);
    if (existing && existing.phone !== phone) {
      log(deps, "rejected", { reason: "session-phone", sessionId: inbound.sessionId });
      return text(200, end(say.sessionMismatch));
    }
    if (existing && existing.lastText === textBody) {
      log(deps, "duplicate", {
        sessionId: inbound.sessionId,
        phone: maskPhone(phone),
      });
      return text(200, existing.lastResponse);
    }
    if (existing?.closed) {
      return finish(
        deps,
        existing,
        phone,
        textBody,
        end(say.sessionFinished),
      );
    }
    if (!existing && textBody !== "") {
      log(deps, "expired", { sessionId: inbound.sessionId, phone: maskPhone(phone) });
      return text(200, end(say.sessionExpired));
    }

    const requests = deps.store.hitRate(`req:${phone}`, deps.now(), 60_000);
    if (requests > config.maxRequestsPerMinute) {
      log(deps, "rate-limited", { phone: maskPhone(phone) });
      return text(200, end(say.tooManyTries));
    }

    const account = deps.store.getAccount(phone);
    const flow = existing?.flow ?? (account ? "menu" : "link");
    const respectBufferGate = deps.respectBufferGate ?? true;
    const facts =
      deps.facts ?? ((id: ProfileId) => demoFacts(id, { respectBufferGate }));
    let outcome = runMenu({
      flow,
      segments,
      profileId: account?.profileId ?? null,
      destination: account?.destination ?? null,
      latest: summary(deps.store.latestPurchase(phone)),
      facts,
      respectBufferGate,
      language: lang,
    });
    if (outcome.setLanguage) deps.store.setLanguage(phone, outcome.setLanguage);

    let response = outcome.response;

    if (outcome.redeemCode) {
      const redeemed = deps.store.redeemLinkCode(outcome.redeemCode, phone, deps.now());
      if (!redeemed) {
        response = end(say.codeExpired);
        outcome = {
          ...outcome,
          purchase: undefined,
          refreshStatus: false,
          linkProfileId: undefined,
        };
      } else {
        const previous = deps.store.getAccount(phone);
        deps.store.saveAccount({
          phone,
          profileId: redeemed.profileId,
          destination: redeemed.destination ?? previous?.destination ?? null,
          linkedAt: new Date(deps.now()).toISOString(),
          source: previous?.source ?? "ussd",
        });
        log(deps, "linked", {
          phone: maskPhone(phone),
          profileId: redeemed.profileId,
          via: "code",
        });
        const linked = deps.store.getAccount(phone);
        const fromCode = deps.store.getLanguage(`code:${outcome.redeemCode}`);
        if (fromCode) deps.store.setLanguage(phone, fromCode);
        const linkedLang = deps.store.getLanguage(phone) ?? lang;
        outcome = runMenu({
          flow: "menu",
          segments: outcome.restAfterRedeem,
          profileId: redeemed.profileId,
          destination: linked?.destination ?? null,
          latest: summary(deps.store.latestPurchase(phone)),
          facts,
          language: linkedLang,
        });
        response = outcome.response;
      }
    }

    if (outcome.linkProfileId) {
      const previous = deps.store.getAccount(phone);
      deps.store.saveAccount({
        phone,
        profileId: outcome.linkProfileId,
        destination: previous?.destination ?? null,
        linkedAt: new Date(deps.now()).toISOString(),
        source: previous?.source ?? "ussd",
      });
      log(deps, "linked", {
        phone: maskPhone(phone),
        profileId: outcome.linkProfileId,
        via: "demo",
      });
    }

    let purchaseId = existing?.purchaseId ?? null;

    if (outcome.purchase) {
      if (purchaseId) {
        response = end(say.sessionFinished);
      } else {
        const buys = deps.store.hitRate(`buy:${phone}`, deps.now(), 3_600_000);
        if (buys > config.maxBuysPerHour) {
          response = end(say.buyLimit);
        } else {
          const idempotencyKey = ussdIdempotencyKey(
            inbound.sessionId,
            outcome.purchase.amountKes,
          );
          try {
            const purchase = await deps.startPurchase({
              amountKes: outcome.purchase.amountKes,
              phone,
              destination: outcome.purchase.destination,
              approvedByUser: true,
              idempotencyKey,
              profileId: outcome.purchase.profileId,
            });
            purchaseId = purchase.purchaseId;
            const amountKes =
              purchase.amountKes > 0 ? purchase.amountKes : outcome.purchase.amountKes;
            deps.store.indexPurchase({
              purchaseId: purchase.purchaseId,
              phone,
              profileId: outcome.purchase.profileId,
              amountKes,
              amountSats: purchase.amountSats ?? null,
              destination: outcome.purchase.destination,
              status: purchase.status,
              source: "ussd",
              createdAt: new Date(deps.now()).toISOString(),
              createdAtMs: deps.now(),
            });
            response = end(
              purchaseResultLine(amountKes, purchase.purchaseId, purchase.status, lang),
            );
            log(deps, "purchase", {
              phone: maskPhone(phone),
              profileId: outcome.purchase.profileId,
              amountKes,
              status: purchase.status,
            });
          } catch (error) {
            response = end(say.couldNotStartLater);
            log(deps, "purchase-failed", {
              phone: maskPhone(phone),
              message: safeError(error),
            });
          }
        }
      }
    }

    if (outcome.refreshStatus) {
      const latest = deps.store.latestPurchase(phone);
      if (!latest) {
        response = end(say.noBuyYet);
      } else {
        try {
          const checked = await deps.checkStatus(latest.purchaseId);
          deps.store.updatePurchase(latest.purchaseId, {
            status: checked.status,
            amountSats: checked.amountSats ?? null,
            amountKes: checked.amountKes,
          });
          const amountKes =
            checked.amountKes > 0 ? checked.amountKes : latest.amountKes;
          response = end(
            statusLine({
              purchaseId: latest.purchaseId,
              amountKes,
              status: checked.status,
            }, lang),
          );
          log(deps, "status", {
            phone: maskPhone(phone),
            status: checked.status,
          });
        } catch (error) {
          response = end(say.couldNotCheck);
          log(deps, "status-failed", {
            phone: maskPhone(phone),
            message: safeError(error),
          });
        }
      }
    }

    const session: UssdSession = {
      sessionId: inbound.sessionId,
      phone,
      flow,
      lastText: textBody,
      lastResponse: response,
      purchaseId,
      closed: response.startsWith("END "),
      createdAt: existing?.createdAt ?? deps.now(),
      updatedAt: deps.now(),
      expiresAt: deps.now() + config.sessionTtlMs,
    };
    deps.store.saveSession(session);
    log(deps, "response", {
      phone: maskPhone(phone),
      sessionId: inbound.sessionId,
      flow,
      closed: session.closed,
      segments: segments.length,
    });
    return text(200, response);
  });
}

function finish(
  deps: UssdDeps,
  existing: UssdSession,
  phone: string,
  textBody: string,
  response: string,
): UssdHttpResult {
  deps.store.saveSession({
    ...existing,
    lastText: textBody,
    lastResponse: response,
    closed: true,
    updatedAt: deps.now(),
    expiresAt: deps.now() + 1,
  });
  log(deps, "closed", { phone: maskPhone(phone), sessionId: existing.sessionId });
  return text(200, response);
}

function summary(record: PurchaseRecord | null): PurchaseSummary | null {
  if (!record) return null;
  return {
    purchaseId: record.purchaseId,
    amountKes: record.amountKes,
    status: record.status,
  };
}

function normalizeText(text: string, serviceCode: string | null): string {
  if ((HARDCODED_SERVICE_CODES as readonly string[]).includes(text)) return "";
  if (configuredServiceCodes(serviceCode).includes(text)) return "";
  return text;
}

function authorised(provided: string | null, config: UssdConfig): boolean {
  if (!config.requireApiKey) return true;
  if (!config.apiKey || !provided) return false;
  return apiKeysMatch(provided, config.apiKey);
}

function text(status: number, body: string): UssdHttpResult {
  return { status, contentType: TEXT_HEADERS, body };
}

function log(
  deps: UssdDeps,
  event: string,
  fields: Record<string, string | number | boolean | null> = {},
): void {
  const write = deps.log ?? defaultLog;
  write(event, fields);
}

function defaultLog(
  event: string,
  fields: Record<string, string | number | boolean | null>,
): void {
  console.info(JSON.stringify({ source: "ussd", event, ...fields }));
}

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : "error";
  return message.replace(/\d{6,}/g, "***").slice(0, 120);
}

function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = tails.get(key) ?? Promise.resolve();
  const run = previous.then(fn, fn);
  const settled = run.then(
    () => undefined,
    () => undefined,
  );
  tails.set(key, settled);
  void settled.then(() => {
    if (tails.get(key) === settled) tails.delete(key);
  });
  return run;
}

/**
 * USSD state machine.
 * The gateway sends the full input chain (`3*1500*1`). Each segment is one
 * transition. Invalid input ends the session so a bad key cannot poison the rest.
 */

import { fill, localizeRefusal, ussdCopy, type UssdLang } from "./copy";
import type { ProfileId } from "./types";
import { amountRefusal, type ProfileFacts } from "./facts";
import { ussdLearnLesson, ussdLearnMenu } from "./learn";
import { ussdDestination } from "./destination";
import { con, end, kes } from "./text";

export interface PurchaseSummary {
  purchaseId: string;
  amountKes: number;
  status: string;
}

export interface MenuInput {
  flow: "menu" | "link";
  segments: string[];
  profileId: ProfileId | null;
  destination: string | null;
  latest: PurchaseSummary | null;
  facts: (id: ProfileId) => ProfileFacts;
  /** Same switch as the web buffer gate. On unless the caller turns it off. */
  respectBufferGate?: boolean;
  /** Handset language. English when the number has not chosen one. */
  language?: UssdLang;
}

export interface MenuPurchase {
  amountKes: number;
  destination: string;
  profileId: ProfileId;
}

export interface MenuOutcome {
  response: string;
  linkProfileId?: ProfileId;
  redeemCode?: string;
  restAfterRedeem: string[];
  purchase?: MenuPurchase;
  refreshStatus?: boolean;
  setLanguage?: UssdLang;
}

type MenuState =
  | { kind: "unlinked" }
  | { kind: "await_code" }
  | { kind: "main" }
  | { kind: "buy_amount" }
  | { kind: "buy_confirm"; amountKes: number }
  | { kind: "status" }
  | { kind: "learn" }
  | { kind: "language"; back: "unlinked" | "main" };

interface StepContext {
  profileId: ProfileId | null;
  destination: string | null;
  latest: PurchaseSummary | null;
  facts: (id: ProfileId) => ProfileFacts;
  respectBufferGate: boolean;
  lang: UssdLang;
}

interface Step {
  state: MenuState;
  halt: boolean;
  response?: string;
  profileId?: ProfileId;
  linkProfileId?: ProfileId;
  redeemCode?: string;
  purchase?: MenuPurchase;
  refreshStatus?: boolean;
  setLanguage?: UssdLang;
}

export function runMenu(input: MenuInput): MenuOutcome {
  const lang = input.language ?? "en";
  const copy = ussdCopy(lang);
  if (input.flow === "menu" && !input.profileId) {
    return {
      response: end(copy.notLinked),
      restAfterRedeem: [],
    };
  }

  let state: MenuState =
    input.flow === "menu" ? { kind: "main" } : { kind: "unlinked" };
  let profileId = input.profileId;
  const destination = input.destination;
  let linkProfileId: ProfileId | undefined;

  const context = (): StepContext => ({
    profileId,
    destination,
    latest: input.latest,
    facts: input.facts,
    respectBufferGate: input.respectBufferGate ?? true,
    lang,
  });

  if (input.segments.length === 0) {
    return {
      response: promptFor(state, context()),
      linkProfileId,
      restAfterRedeem: [],
    };
  }

  for (let index = 0; index < input.segments.length; index += 1) {
    const segment = input.segments[index] ?? "";
    const step = transition(state, segment, context());
    state = step.state;
    if (step.profileId) profileId = step.profileId;
    if (step.linkProfileId) linkProfileId = step.linkProfileId;
    if (step.halt) {
      return {
        response: step.response ?? end(copy.wentWrong),
        setLanguage: step.setLanguage,
        linkProfileId,
        redeemCode: step.redeemCode,
        restAfterRedeem: input.segments.slice(index + 1),
        purchase: step.purchase,
        refreshStatus: step.refreshStatus,
      };
    }
  }

  return {
    response: promptFor(state, context()),
    linkProfileId,
    restAfterRedeem: [],
  };
}

function transition(state: MenuState, input: string, ctx: StepContext): Step {
  const copy = ussdCopy(ctx.lang);
  if (input === "") {
    return halt(state, end(copy.numberKeys));
  }

  switch (state.kind) {
    case "unlinked":
      return fromUnlinked(input, ctx.lang);
    case "await_code":
      return fromCode(input, ctx.lang);
    case "main":
      return fromMain(input, ctx);
    case "buy_amount":
      return fromAmount(input, ctx);
    case "buy_confirm":
      return fromConfirm(state.amountKes, input, ctx);
    case "status":
      return fromStatus(input, ctx);
    case "learn":
      return fromLearn(input, ctx.lang);
    case "language":
      return fromLanguage(input, state.back, ctx.lang);
    default:
      return halt(state, end(copy.wentWrong));
  }
}

function fromUnlinked(input: string, lang: UssdLang): Step {
  const copy = ussdCopy(lang);
  if (input === "0") return halt({ kind: "unlinked" }, end(copy.goodbye));
  if (input === "1") return { state: { kind: "await_code" }, halt: false };
  if (input === "2") return linkDemo("amina");
  if (input === "3") return linkDemo("brian");
  if (input === "9") return { state: { kind: "language", back: "unlinked" }, halt: false };
  return halt({ kind: "unlinked" }, end(copy.notOption));
}

function linkDemo(profileId: ProfileId): Step {
  return {
    state: { kind: "main" },
    halt: false,
    profileId,
    linkProfileId: profileId,
  };
}

function fromCode(input: string, lang: UssdLang): Step {
  const copy = ussdCopy(lang);
  if (!/^\d{6}$/.test(input)) {
    return halt({ kind: "await_code" }, end(copy.enterCodeShort));
  }
  return {
    state: { kind: "main" },
    halt: true,
    redeemCode: input,
    response: con(copy.main),
  };
}

function fromLanguage(input: string, back: "unlinked" | "main", lang: UssdLang): Step {
  const copy = ussdCopy(lang);
  if (input === "0") return { state: { kind: back }, halt: false };
  const next: UssdLang | null = input === "1" ? "en" : input === "2" ? "sw" : null;
  if (!next) return halt({ kind: "language", back }, end(copy.notOption));
  const chosen = ussdCopy(next);
  const screen = back === "main" ? chosen.main : chosen.unlinked;
  return {
    state: { kind: back },
    halt: true,
    setLanguage: next,
    response: con(screen),
  };
}

function fromMain(input: string, ctx: StepContext): Step {
  const copy = ussdCopy(ctx.lang);
  const facts = requireFacts(ctx);
  if (!facts) return halt({ kind: "main" }, end(copy.notLinked));
  if (input === "0") return halt({ kind: "main" }, end(copy.goodbye));
  if (input === "1") return halt({ kind: "main" }, surplusScreen(facts, ctx.lang));
  if (input === "2") return halt({ kind: "main" }, habitScreen(facts, ctx.lang));
  if (input === "3") {
    if (!facts.buyAllowed) {
      return halt(
        { kind: "main" },
        end(facts.buyRefusal ? localizeRefusal(ctx.lang, facts.buyRefusal) : copy.buyNotAllowed),
      );
    }
    return { state: { kind: "buy_amount" }, halt: false };
  }
  if (input === "4") {
    if (!ctx.latest) return halt({ kind: "main" }, end(copy.noBuyYet));
    return { state: { kind: "status" }, halt: false };
  }
  if (input === "5") return { state: { kind: "learn" }, halt: false };
  if (input === "6") return halt({ kind: "main" }, chamaScreen(facts, ctx.lang));
  if (input === "9") return { state: { kind: "language", back: "main" }, halt: false };
  return halt({ kind: "main" }, end(copy.notOption));
}

function fromAmount(input: string, ctx: StepContext): Step {
  const copy = ussdCopy(ctx.lang);
  const facts = requireFacts(ctx);
  if (!facts || !ctx.profileId) {
    return halt({ kind: "buy_amount" }, end(copy.notLinked));
  }
  if (!/^[1-9]\d{0,6}$/.test(input)) {
    return halt({ kind: "buy_amount" }, end(copy.wholeShillings));
  }
  const amountKes = Number(input);
  const refusal = amountRefusal(ctx.profileId, amountKes, {
    respectBufferGate: ctx.respectBufferGate,
  });
  if (refusal) return halt({ kind: "buy_amount" }, end(localizeRefusal(ctx.lang, refusal)));
  const destination = ussdDestination(ctx.destination);
  if (!destination) {
    return halt({ kind: "buy_amount" }, end(copy.setAddress));
  }
  return { state: { kind: "buy_confirm", amountKes }, halt: false };
}

function fromConfirm(amountKes: number, input: string, ctx: StepContext): Step {
  const copy = ussdCopy(ctx.lang);
  if (!ctx.profileId) {
    return halt({ kind: "buy_confirm", amountKes }, end(copy.notLinked));
  }
  const destination = ussdDestination(ctx.destination);
  if (!destination) {
    return halt({ kind: "buy_confirm", amountKes }, end(copy.setAddress));
  }
  if (input === "2") {
    return halt({ kind: "buy_confirm", amountKes }, end(copy.cancelled));
  }
  if (input === "1") {
    return {
      state: { kind: "buy_confirm", amountKes },
      halt: true,
      response: end(copy.startingBuy),
      purchase: { amountKes, destination, profileId: ctx.profileId },
    };
  }
  return halt({ kind: "buy_confirm", amountKes }, end(copy.confirmOrCancel));
}

function fromStatus(input: string, ctx: StepContext): Step {
  const copy = ussdCopy(ctx.lang);
  if (input === "0") return halt({ kind: "status" }, end(copy.goodbye));
  if (input === "1" && ctx.latest) {
    return {
      state: { kind: "status" },
      halt: true,
      refreshStatus: true,
      response: end(statusLine(ctx.latest, ctx.lang)),
    };
  }
  return halt({ kind: "status" }, end(copy.checkOrDial));
}

function fromLearn(input: string, lang: UssdLang): Step {
  const copy = ussdCopy(lang);
  if (input === "0") return halt({ kind: "learn" }, end(copy.goodbye));
  const lesson = ussdLearnLesson(input);
  if (lesson) return halt({ kind: "learn" }, end(lesson));
  return halt({ kind: "learn" }, end(copy.lessonRange));
}

function promptFor(state: MenuState, ctx: StepContext): string {
  const copy = ussdCopy(ctx.lang);
  switch (state.kind) {
    case "unlinked":
      return con(copy.unlinked);
    case "await_code":
      return con(copy.enterCode);
    case "main":
      return con(copy.main);
    case "language":
      return con(copy.languageMenu);
    case "buy_amount": {
      const facts = requireFacts(ctx);
      if (!facts) return end(copy.notLinked);
      const habit =
        facts.habitKes !== null
          ? `\n${fill(copy.habitIs, { amount: kes(facts.habitKes) })}`
          : "";
      return con(
        `${fill(copy.buyUpTo, { max: kes(facts.maxKes) })}${habit}\n${copy.enterAmount}`,
      );
    }
    case "buy_confirm": {
      const destination = ussdDestination(ctx.destination);
      return con(
        `${fill(copy.buy, { amount: kes(state.amountKes) })}\n${fill(copy.toWallet, {
          destination: destination ?? "wallet",
        })}\n${copy.confirm}\n${copy.cancel}`,
      );
    }
    case "status":
      return ctx.latest
        ? con(`${statusLine(ctx.latest, ctx.lang)}\n${copy.checkAgain}\n${copy.exit}`)
        : end(copy.noBuyYet);
    case "learn":
      return con(ussdLearnMenu(ctx.lang));
    default:
      return end(copy.wentWrong);
  }
}

function surplusScreen(facts: ProfileFacts, lang: UssdLang): string {
  const copy = ussdCopy(lang);
  if (facts.bufferFirst) {
    return end(
      `${copy.bufferComesFirst}\n${fill(copy.floor, { amount: kes(facts.floorKes) })}\n${copy.notNext}`,
    );
  }
  return end(
    `${fill(copy.surplus, {
      floor: kes(facts.floorKes),
      ceiling: grouped(facts.ceilingKes),
    })}\n${fill(copy.typical, { amount: kes(facts.typicalKes) })}\n${fill(copy.safeFloor, {
      amount: kes(facts.floorKes),
    })}`,
  );
}

function habitScreen(facts: ProfileFacts, lang: UssdLang): string {
  const copy = ussdCopy(lang);
  if (facts.bufferFirst || facts.habitKes === null) {
    return end(copy.noHabit);
  }
  const pct =
    facts.floorKes > 0 ? Math.round((facts.habitKes / facts.floorKes) * 100) : 0;
  const cadence = facts.habitCadence === "weekly" ? copy.weekly : copy.monthly;
  return end(
    `${fill(copy.habitIs, { amount: kes(facts.habitKes) })} ${cadence}\n${fill(copy.ofFloor, {
      pct,
    })}\n${copy.youApprove}`,
  );
}

function chamaScreen(facts: ProfileFacts, lang: UssdLang): string {
  const copy = ussdCopy(lang);
  if (!facts.chamaName || facts.chamaMonthlyKes === null) {
    return end(copy.noChama);
  }
  return end(
    `${facts.chamaName}\n${fill(copy.aMonth, { amount: kes(facts.chamaMonthlyKes) })}\n${copy.payOwnWallet}\n${copy.holdsNoSats}`,
  );
}

export function statusLine(purchase: PurchaseSummary, lang: UssdLang = "en"): string {
  return `${kes(purchase.amountKes)}\n${statusLabel(purchase.status, lang)}`;
}

export function purchaseResultLine(
  amountKes: number,
  purchaseId: string,
  status: string,
  lang: UssdLang = "en",
): string {
  const copy = ussdCopy(lang);
  if (
    status === "cannot_fill" ||
    status === "failed" ||
    status === "paid_not_delivered"
  ) {
    return copy.couldNotStart;
  }
  const code = purchaseId.length > 22 ? purchaseId.slice(0, 22) : purchaseId;
  return `${copy.mpesaSent}\n${kes(amountKes)}\n${fill(copy.code, { code })}\n${copy.enterPin}`;
}

function statusLabel(status: string, lang: UssdLang): string {
  const copy = ussdCopy(lang);
  switch (status) {
    case "awaiting_mpesa":
      return copy.waitingPin;
    case "sending_sats":
      return copy.sendingSats;
    case "filled":
      return copy.filled;
    case "failed":
      return copy.didNotFinish;
    case "paid_not_delivered":
      return copy.paidNotSent;
    case "cannot_fill":
      return copy.couldNotFill;
    case "quoted":
      return copy.quoted;
    default:
      return copy.inProgress;
  }
}

function requireFacts(ctx: StepContext): ProfileFacts | null {
  if (!ctx.profileId) return null;
  return ctx.facts(ctx.profileId);
}

function halt(state: MenuState, response: string): Step {
  return { state, halt: true, response };
}

function grouped(amount: number): string {
  return Math.abs(Math.round(amount))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

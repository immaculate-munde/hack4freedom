/**
 * USSD state machine.
 * The gateway sends the full input chain (`3*1500*1`). Each segment is one
 * transition. Invalid input ends the session so a bad key cannot poison the rest.
 */

import type { ProfileId } from "./types";
import { amountRefusal, type ProfileFacts } from "./facts";
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
}

type MenuState =
  | { kind: "unlinked" }
  | { kind: "await_code" }
  | { kind: "main" }
  | { kind: "buy_amount" }
  | { kind: "buy_confirm"; amountKes: number }
  | { kind: "status" }
  | { kind: "learn" };

interface StepContext {
  profileId: ProfileId | null;
  destination: string | null;
  latest: PurchaseSummary | null;
  facts: (id: ProfileId) => ProfileFacts;
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
}

const UNLINKED = `PesaSense
1 Link with code
2 Demo Amina
3 Demo Brian
0 Exit`;

const MAIN = `PesaSense
1 Surplus
2 Habit
3 Buy Bitcoin
4 Buy status
5 Learn
6 Chama
0 Exit`;

const LEARN = `Learn
1 What is Bitcoin
2 Why 3 to 5 years
3 Self-custody
4 Scam flags
0 Exit`;

const LESSONS: Record<string, string> = {
  "1": "Bitcoin is money you hold yourself. No manager. The price moves, so leave it alone.",
  "2": "A short wait can be a bad time to need the money. This habit is for 3 to 5 years.",
  "3": "Sats go to a wallet you control. PesaSense does not hold the keys.",
  "4": "Scams: guaranteed returns, trading managers, anyone asking for recovery words.",
};

export function runMenu(input: MenuInput): MenuOutcome {
  if (input.flow === "menu" && !input.profileId) {
    return {
      response: end("This number is not linked. Dial again."),
      restAfterRedeem: [],
    };
  }

  let state: MenuState = input.flow === "menu" ? { kind: "main" } : { kind: "unlinked" };
  let profileId = input.profileId;
  let destination = input.destination;
  let linkProfileId: ProfileId | undefined;

  const context = (): StepContext => ({
    profileId,
    destination,
    latest: input.latest,
    facts: input.facts,
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
        response: step.response ?? end("Something went wrong. Dial again."),
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
  if (input === "") {
    return halt(state, end("Use the number keys. Dial again."));
  }

  switch (state.kind) {
    case "unlinked":
      return fromUnlinked(input);
    case "await_code":
      return fromCode(input);
    case "main":
      return fromMain(input, ctx);
    case "buy_amount":
      return fromAmount(input, ctx);
    case "buy_confirm":
      return fromConfirm(state.amountKes, input, ctx);
    case "status":
      return fromStatus(input, ctx);
    case "learn":
      return fromLearn(input);
    default:
      return halt(state, end("Something went wrong. Dial again."));
  }
}

function fromUnlinked(input: string): Step {
  if (input === "0") return halt({ kind: "unlinked" }, end("Goodbye."));
  if (input === "1") return { state: { kind: "await_code" }, halt: false };
  if (input === "2") return linkDemo("amina");
  if (input === "3") return linkDemo("brian");
  return halt({ kind: "unlinked" }, end("Not an option. Dial again."));
}

function linkDemo(profileId: ProfileId): Step {
  return {
    state: { kind: "main" },
    halt: false,
    profileId,
    linkProfileId: profileId,
  };
}

function fromCode(input: string): Step {
  if (!/^\d{6}$/.test(input)) {
    return halt({ kind: "await_code" }, end("Enter the 6-digit code from the app."));
  }
  return {
    state: { kind: "main" },
    halt: true,
    redeemCode: input,
    response: con(MAIN),
  };
}

function fromMain(input: string, ctx: StepContext): Step {
  const facts = requireFacts(ctx);
  if (!facts) return halt({ kind: "main" }, end("This number is not linked. Dial again."));
  if (input === "0") return halt({ kind: "main" }, end("Goodbye."));
  if (input === "1") return halt({ kind: "main" }, surplusScreen(facts));
  if (input === "2") return halt({ kind: "main" }, habitScreen(facts));
  if (input === "3") {
    if (!facts.buyAllowed) {
      return halt({ kind: "main" }, end(facts.buyRefusal ?? "This buy is not allowed."));
    }
    return { state: { kind: "buy_amount" }, halt: false };
  }
  if (input === "4") {
    if (!ctx.latest) return halt({ kind: "main" }, end("No buy on this number yet."));
    return { state: { kind: "status" }, halt: false };
  }
  if (input === "5") return { state: { kind: "learn" }, halt: false };
  if (input === "6") return halt({ kind: "main" }, chamaScreen(facts));
  return halt({ kind: "main" }, end("Not an option. Dial again."));
}

function fromAmount(input: string, ctx: StepContext): Step {
  const facts = requireFacts(ctx);
  if (!facts || !ctx.profileId) {
    return halt({ kind: "buy_amount" }, end("This number is not linked. Dial again."));
  }
  if (!/^[1-9]\d{0,6}$/.test(input)) {
    return halt({ kind: "buy_amount" }, end("Enter a whole number of shillings."));
  }
  const amountKes = Number(input);
  const refusal = amountRefusal(ctx.profileId, amountKes);
  if (refusal) return halt({ kind: "buy_amount" }, end(refusal));
  const destination = ussdDestination(ctx.destination);
  if (!destination) {
    return halt(
      { kind: "buy_amount" },
      end("Set a Lightning address in the PesaSense app, then dial again."),
    );
  }
  return { state: { kind: "buy_confirm", amountKes }, halt: false };
}

function fromConfirm(amountKes: number, input: string, ctx: StepContext): Step {
  if (!ctx.profileId) {
    return halt({ kind: "buy_confirm", amountKes }, end("This number is not linked. Dial again."));
  }
  const destination = ussdDestination(ctx.destination);
  if (!destination) {
    return halt(
      { kind: "buy_confirm", amountKes },
      end("Set a Lightning address in the PesaSense app, then dial again."),
    );
  }
  if (input === "2") {
    return halt({ kind: "buy_confirm", amountKes }, end("Cancelled. Nothing was sent."));
  }
  if (input === "1") {
    return {
      state: { kind: "buy_confirm", amountKes },
      halt: true,
      response: end("Starting your buy."),
      purchase: { amountKes, destination, profileId: ctx.profileId },
    };
  }
  return halt(
    { kind: "buy_confirm", amountKes },
    end("Reply 1 to confirm or 2 to cancel. Dial again."),
  );
}

function fromStatus(input: string, ctx: StepContext): Step {
  if (input === "0") return halt({ kind: "status" }, end("Goodbye."));
  if (input === "1" && ctx.latest) {
    return {
      state: { kind: "status" },
      halt: true,
      refreshStatus: true,
      response: end(statusLine(ctx.latest)),
    };
  }
  return halt({ kind: "status" }, end("Reply 1 to check again, or dial again."));
}

function fromLearn(input: string): Step {
  if (input === "0") return halt({ kind: "learn" }, end("Goodbye."));
  const lesson = LESSONS[input];
  if (lesson) return halt({ kind: "learn" }, end(lesson));
  return halt({ kind: "learn" }, end("Reply 1 to 4, or dial again."));
}

function promptFor(state: MenuState, ctx: StepContext): string {
  switch (state.kind) {
    case "unlinked":
      return con(UNLINKED);
    case "await_code":
      return con("Enter the 6-digit code from the PesaSense app.");
    case "main":
      return con(MAIN);
    case "buy_amount": {
      const facts = requireFacts(ctx);
      if (!facts) return end("This number is not linked. Dial again.");
      const habit =
        facts.habitKes !== null ? `\nHabit is ${kes(facts.habitKes)}.` : "";
      return con(`Buy up to ${kes(facts.maxKes)}.${habit}\nEnter amount in KES:`);
    }
    case "buy_confirm": {
      const destination = ussdDestination(ctx.destination);
      return con(
        `Buy ${kes(state.amountKes)}\nTo ${destination ?? "your wallet"}\n1 Confirm\n2 Cancel`,
      );
    }
    case "status":
      return ctx.latest
        ? con(`${statusLine(ctx.latest)}\n1 Check again\n0 Exit`)
        : end("No buy on this number yet.");
    case "learn":
      return con(LEARN);
    default:
      return end("Something went wrong. Dial again.");
  }
}

function surplusScreen(facts: ProfileFacts): string {
  if (facts.bufferFirst) {
    return end(
      `Buffer comes first.\nFloor ${kes(facts.floorKes)}.\nBitcoin is not the next step.`,
    );
  }
  return end(
    `Surplus ${kes(facts.floorKes)} to ${grouped(facts.ceilingKes)}\nTypical ${kes(facts.typicalKes)}\nSafe floor ${kes(facts.floorKes)}`,
  );
}

function habitScreen(facts: ProfileFacts): string {
  if (facts.bufferFirst || facts.habitKes === null) {
    return end("No Bitcoin habit yet.\nBuild a buffer first.");
  }
  const pct = facts.floorKes > 0 ? Math.round((facts.habitKes / facts.floorKes) * 100) : 0;
  const cadence = facts.habitCadence === "weekly" ? "weekly" : "monthly";
  return end(
    `Habit ${kes(facts.habitKes)} ${cadence}.\n${pct}% of the safe floor.\nYou approve each buy.`,
  );
}

function chamaScreen(facts: ProfileFacts): string {
  if (!facts.chamaName || facts.chamaMonthlyKes === null) {
    return end("No chama on this profile.");
  }
  return end(
    `${facts.chamaName}\n${kes(facts.chamaMonthlyKes)} a month.\nPay from your own wallet.\nPesaSense holds no sats.`,
  );
}

export function statusLine(purchase: PurchaseSummary): string {
  return `${kes(purchase.amountKes)}\n${statusLabel(purchase.status)}`;
}

export function purchaseResultLine(amountKes: number, purchaseId: string, status: string): string {
  if (status === "cannot_fill" || status === "failed" || status === "paid_not_delivered") {
    return "Could not start this buy. Nothing was taken.";
  }
  const code = purchaseId.length > 22 ? purchaseId.slice(0, 22) : purchaseId;
  return `M-Pesa prompt sent.\n${kes(amountKes)}\nCode ${code}\nEnter your PIN. We hold no sats.`;
}

function statusLabel(status: string): string {
  switch (status) {
    case "awaiting_mpesa":
      return "Waiting for M-Pesa PIN";
    case "sending_sats":
      return "M-Pesa paid. Sending sats.";
    case "filled":
      return "Filled.";
    case "failed":
      return "Did not finish.";
    case "paid_not_delivered":
      return "Paid, sats not sent yet.";
    case "cannot_fill":
      return "Could not fill.";
    default:
      return "In progress.";
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

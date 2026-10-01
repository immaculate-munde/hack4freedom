/**
 * Chama coordination ledger.
 *
 * The ledger records who agreed to pay whom. It never holds money, keys,
 * or a pooled address. Each member pays the person whose turn it is,
 * from a wallet that member controls. One member cannot record, redirect,
 * or cancel another member's contribution.
 *
 * A reliability note is opt-in and stays on this record. It is not published.
 */

import type { ChamaMembership, Proof } from "@pesasense/core";

const LIGHTNING_ADDRESS =
  /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export class ChamaLedgerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChamaLedgerError";
  }
}

/** A person in the circle. Their Lightning address is a wallet they control. */
export interface ChamaMember {
  id: string;
  name: string;
  lightningAddress: string;
}

export interface ChamaCycle {
  id: string;
  index: number;
  recipientId: string;
  status: "open" | "complete";
}

/**
 * A member's own record that they paid the recipient directly.
 * `destination` is copied from the recipient. Callers cannot choose another.
 */
export interface ContributionRecord {
  id: string;
  cycleId: string;
  payerId: string;
  recipientId: string;
  amountKes: number;
  /**
   * Set when this phone sent sats. Absent on a demo record, which does not
   * move money because the destination is not a real wallet.
   */
  amountSats?: number;
  /** `lightning` was sent from the payer's wallet. `demo` did not send sats. */
  settlement: "lightning" | "demo";
  destination: string;
  recordedAt: string;
}

export interface ContributionIntent {
  destination: string;
  amountKes: number;
  recipientId: string;
  cycleId: string;
}

export interface BadgeOptIn {
  memberId: string;
  proof: Proof;
}

export interface ChamaCircle {
  id: string;
  name: string;
  kind: NonNullable<ChamaMembership["kind"]>;
  monthlyContributionKes: number;
  /** Rotation order. The recipient is this list, by cycle index. */
  memberIdsInOrder: string[];
  members: ChamaMember[];
  cycles: ChamaCycle[];
  contributions: ContributionRecord[];
  badgeOptIns: BadgeOptIn[];
}

export interface RoundRow {
  member: ChamaMember;
  role: "receives" | "recorded" | "waiting";
}

export interface RoundView {
  cycle: ChamaCycle;
  recipient: ChamaMember;
  /**
   * Where this round's payments go. After the first Lightning payment, later
   * payers use that same address even if the recipient edits their profile.
   */
  payDestination: string;
  rows: RoundRow[];
  completedRounds: number;
  /** Whole KES still waiting on members who have not recorded. */
  waitingKes: number;
}

function assertLightningAddress(address: string): string {
  const trimmed = address.trim();
  if (!LIGHTNING_ADDRESS.test(trimmed)) {
    throw new ChamaLedgerError(
      "Use a Lightning address you control, like name@wallet.com.",
    );
  }
  return trimmed;
}

function memberById(circle: ChamaCircle, id: string): ChamaMember | undefined {
  return circle.members.find((member) => member.id === id);
}

function requireMember(circle: ChamaCircle, id: string): ChamaMember {
  const member = memberById(circle, id);
  if (!member) {
    throw new ChamaLedgerError("Only a member of this chama can do that.");
  }
  return member;
}

export function openCycle(circle: ChamaCircle): ChamaCycle {
  const cycle = [...circle.cycles].reverse().find((item) => item.status === "open");
  if (!cycle) {
    throw new ChamaLedgerError("There is no open round.");
  }
  return cycle;
}

function payersFor(circle: ChamaCircle, recipientId: string): string[] {
  return circle.memberIdsInOrder.filter((id) => id !== recipientId);
}

function clone(circle: ChamaCircle): ChamaCircle {
  return {
    ...circle,
    memberIdsInOrder: [...circle.memberIdsInOrder],
    members: circle.members.map((member) => ({ ...member })),
    cycles: circle.cycles.map((cycle) => ({ ...cycle })),
    contributions: circle.contributions.map((record) => ({ ...record })),
    badgeOptIns: circle.badgeOptIns.map((optIn) => ({
      memberId: optIn.memberId,
      proof: { ...optIn.proof },
    })),
  };
}

/**
 * Invented Chama Sisters circle, matching Amina's demo membership
 * (KES 2,000, merry-go-round). Chebet is receiving. Nyambura already
 * recorded her own payment. Amina has not.
 */
export function createDemoChamaSisters(): ChamaCircle {
  const members: ChamaMember[] = [
    {
      id: "amina",
      name: "Amina Wanjiku",
      lightningAddress: "amina.demo@example.com",
    },
    {
      id: "chebet",
      name: "Chebet Langat",
      lightningAddress: "chebet.demo@example.com",
    },
    {
      id: "nyambura",
      name: "Nyambura Demo",
      lightningAddress: "nyambura.demo@example.com",
    },
  ];

  return {
    id: "chama-sisters",
    name: "Chama Sisters",
    kind: "merry_go_round",
    monthlyContributionKes: 2000,
    memberIdsInOrder: ["chebet", "nyambura", "amina"],
    members,
    cycles: [
      {
        id: "cycle-0",
        index: 0,
        recipientId: "chebet",
        status: "open",
      },
    ],
    contributions: [
      {
        id: "contrib-cycle-0-nyambura",
        cycleId: "cycle-0",
        payerId: "nyambura",
        recipientId: "chebet",
        amountKes: 2000,
        settlement: "demo",
        destination: "chebet.demo@example.com",
        recordedAt: "2026-09-28T16:00:00.000Z",
      },
    ],
    badgeOptIns: [],
  };
}

/** Address already used by a Lightning payment in this round, if one exists. */
export function lockedPayDestination(circle: ChamaCircle, cycleId: string): string | null {
  const paid = circle.contributions.filter(
    (record) => record.cycleId === cycleId && record.settlement === "lightning",
  );
  const first = paid[0];
  if (!first) {
    return null;
  }
  if (paid.some((record) => record.destination !== first.destination)) {
    throw new ChamaLedgerError("This round has payments to more than one address.");
  }
  return first.destination;
}

export function roundView(circle: ChamaCircle): RoundView {
  const cycle = openCycle(circle);
  const recipient = requireMember(circle, cycle.recipientId);
  const payDestination = lockedPayDestination(circle, cycle.id) ?? recipient.lightningAddress;
  const recorded = new Set(
    circle.contributions
      .filter((record) => record.cycleId === cycle.id)
      .map((record) => record.payerId),
  );

  const rows: RoundRow[] = circle.memberIdsInOrder.map((id) => {
    const member = requireMember(circle, id);
    if (id === cycle.recipientId) {
      return { member, role: "receives" };
    }
    return { member, role: recorded.has(id) ? "recorded" : "waiting" };
  });

  const waiting = rows.filter((row) => row.role === "waiting").length;

  return {
    cycle,
    recipient,
    payDestination,
    rows,
    completedRounds: circle.cycles.filter((item) => item.status === "complete").length,
    waitingKes: waiting * circle.monthlyContributionKes,
  };
}

/** True for invented `@example.com` addresses. Those cannot receive sats. */
export function isDemoLightningAddress(address: string): boolean {
  return address.trim().toLowerCase().endsWith("@example.com");
}

/**
 * Where this member's own payment must go. The caller cannot pick another address.
 */
export function contributionIntent(circle: ChamaCircle, actorId: string): ContributionIntent {
  const actor = requireMember(circle, actorId);
  const cycle = openCycle(circle);
  if (cycle.recipientId === actor.id) {
    throw new ChamaLedgerError("The member receiving this round does not pay into it.");
  }
  const already = circle.contributions.some(
    (record) => record.cycleId === cycle.id && record.payerId === actor.id,
  );
  if (already) {
    throw new ChamaLedgerError("This contribution is already recorded.");
  }
  const recipient = requireMember(circle, cycle.recipientId);
  const destination = lockedPayDestination(circle, cycle.id) ?? recipient.lightningAddress;
  if (destination.trim().toLowerCase() === actor.lightningAddress.trim().toLowerCase()) {
    throw new ChamaLedgerError("This payment would return to your own Lightning address.");
  }
  return {
    destination,
    amountKes: circle.monthlyContributionKes,
    recipientId: recipient.id,
    cycleId: cycle.id,
  };
}

function appendContribution(
  circle: ChamaCircle,
  actorId: string,
  recordedAt: string,
  settlement: ContributionRecord["settlement"],
  intent: ContributionIntent,
  amountSats?: number,
): ChamaCircle {
  const next = clone(circle);
  const stillOpen = contributionIntent(next, actorId);
  if (stillOpen.cycleId !== intent.cycleId || stillOpen.recipientId !== intent.recipientId) {
    throw new ChamaLedgerError("This round changed before the payment could be recorded.");
  }
  next.contributions.push({
    id: `contrib-${intent.cycleId}-${actorId}`,
    cycleId: intent.cycleId,
    payerId: actorId,
    recipientId: intent.recipientId,
    amountKes: intent.amountKes,
    amountSats,
    settlement,
    destination: intent.destination,
    recordedAt,
  });

  const required = payersFor(next, intent.recipientId);
  const paid = new Set(
    next.contributions
      .filter((record) => record.cycleId === intent.cycleId)
      .map((record) => record.payerId),
  );
  const roundComplete = required.every((id) => paid.has(id));
  if (!roundComplete) {
    return next;
  }

  const closed = next.cycles.find((item) => item.id === intent.cycleId);
  if (!closed) {
    throw new ChamaLedgerError("There is no open round.");
  }
  closed.status = "complete";

  const nextIndex = closed.index + 1;
  const recipientId = next.memberIdsInOrder[nextIndex % next.memberIdsInOrder.length];
  if (!recipientId) {
    throw new ChamaLedgerError("This chama has no members to rotate to.");
  }
  let id = `cycle-${nextIndex}`;
  let suffix = 2;
  while (next.cycles.some((cycle) => cycle.id === id)) {
    id = `cycle-${nextIndex}-${suffix}`;
    suffix += 1;
  }
  next.cycles.push({
    id,
    index: nextIndex,
    recipientId,
    status: "open",
  });
  return next;
}

/**
 * Record a demo contribution. Use this only when the destination is not a real
 * wallet. It does not send sats.
 */
export function recordOwnContribution(
  circle: ChamaCircle,
  actorId: string,
  recordedAt: string,
): ChamaCircle {
  const intent = contributionIntent(circle, actorId);
  if (!isDemoLightningAddress(intent.destination)) {
    throw new ChamaLedgerError(
      "This recipient uses a real Lightning address. Pay from your own wallet.",
    );
  }
  return appendContribution(circle, actorId, recordedAt, "demo", intent);
}

/**
 * Send sats to the recipient, then record that payment.
 * If `send` fails, the circle is left unchanged.
 */
export async function payAndRecord(
  circle: ChamaCircle,
  actorId: string,
  amountSats: number,
  recordedAt: string,
  send: (destination: string, amountSats: number) => Promise<void>,
): Promise<ChamaCircle> {
  if (!Number.isSafeInteger(amountSats) || amountSats <= 0) {
    throw new ChamaLedgerError("A Lightning payment needs a positive whole sats amount.");
  }
  const intent = contributionIntent(circle, actorId);
  if (isDemoLightningAddress(intent.destination)) {
    throw new ChamaLedgerError(
      "This is a demo address. It cannot receive sats. Record the demo contribution instead.",
    );
  }
  await send(intent.destination, amountSats);
  return appendContribution(circle, actorId, recordedAt, "lightning", intent, amountSats);
}

/**
 * Replace only the actor's receive address. Another member's address stays put.
 */
export function setOwnLightningAddress(
  circle: ChamaCircle,
  actorId: string,
  lightningAddress: string,
): ChamaCircle {
  const next = clone(circle);
  const actor = requireMember(next, actorId);
  const address = assertLightningAddress(lightningAddress);
  const taken = next.members.some(
    (member) =>
      member.id !== actor.id &&
      member.lightningAddress.toLowerCase() === address.toLowerCase(),
  );
  if (taken) {
    throw new ChamaLedgerError(
      "That Lightning address already belongs to another member.",
    );
  }
  actor.lightningAddress = address;
  return next;
}

/**
 * Opt into a local reliability note after at least one finished round.
 * Nothing is published.
 */
export function optInReliabilityBadge(
  circle: ChamaCircle,
  actorId: string,
  createdAt: string,
): ChamaCircle {
  const next = clone(circle);
  requireMember(next, actorId);
  if (!next.cycles.some((cycle) => cycle.status === "complete")) {
    throw new ChamaLedgerError("A reliability note is available after a round finishes.");
  }
  if (next.badgeOptIns.some((optIn) => optIn.memberId === actorId)) {
    return next;
  }
  next.badgeOptIns.push({
    memberId: actorId,
    proof: {
      id: `badge-${next.id}-${actorId}`,
      kind: "reliability_badge",
      ref: `mock:${next.id}:${actorId}`,
      createdAt,
    },
  });
  return next;
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

/**
 * Restore a circle from storage. Anything that could crash a round, or count
 * a payment that did not happen, is rejected so the screen can start clean.
 */
export function parseChamaCircle(value: unknown): ChamaCircle | null {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }
    const raw = value as Partial<ChamaCircle>;
    if (raw.id !== "chama-sisters" || raw.name !== "Chama Sisters") {
      return null;
    }
    const kind = raw.kind ?? "merry_go_round";
    if (kind !== "merry_go_round" && kind !== "welfare" && kind !== "investment" && kind !== "other") {
      return null;
    }
    if (!isPositiveInt(raw.monthlyContributionKes)) {
      return null;
    }
    if (!Array.isArray(raw.members) || raw.members.length < 2) {
      return null;
    }
    if (!Array.isArray(raw.memberIdsInOrder) || !Array.isArray(raw.cycles)) {
      return null;
    }
    if (!Array.isArray(raw.contributions) || !Array.isArray(raw.badgeOptIns)) {
      return null;
    }

    const members: ChamaMember[] = [];
    for (const member of raw.members) {
      if (!member || typeof member.id !== "string" || member.id.trim() === "") {
        return null;
      }
      if (typeof member.name !== "string" || member.name.trim() === "") {
        return null;
      }
      if (typeof member.lightningAddress !== "string" || !LIGHTNING_ADDRESS.test(member.lightningAddress.trim())) {
        return null;
      }
      members.push({
        id: member.id,
        name: member.name,
        lightningAddress: member.lightningAddress.trim(),
      });
    }
    const memberIds = members.map((member) => member.id);
    if (new Set(memberIds).size !== memberIds.length) {
      return null;
    }
    const addresses = members.map((member) => member.lightningAddress.toLowerCase());
    if (new Set(addresses).size !== addresses.length) {
      return null;
    }
    if (
      raw.memberIdsInOrder.length !== memberIds.length ||
      raw.memberIdsInOrder.some((id) => typeof id !== "string" || !memberIds.includes(id)) ||
      new Set(raw.memberIdsInOrder).size !== memberIds.length
    ) {
      return null;
    }

    const cycles: ChamaCycle[] = [];
    for (const cycle of raw.cycles) {
      if (!cycle || typeof cycle.id !== "string" || cycle.id.trim() === "") {
        return null;
      }
      if (typeof cycle.index !== "number" || !Number.isSafeInteger(cycle.index) || cycle.index < 0) {
        return null;
      }
      if (cycle.status !== "open" && cycle.status !== "complete") {
        return null;
      }
      if (typeof cycle.recipientId !== "string" || !memberIds.includes(cycle.recipientId)) {
        return null;
      }
      const expected = raw.memberIdsInOrder[cycle.index % raw.memberIdsInOrder.length];
      if (cycle.recipientId !== expected) {
        return null;
      }
      cycles.push({
        id: cycle.id,
        index: cycle.index,
        recipientId: cycle.recipientId,
        status: cycle.status,
      });
    }
    if (new Set(cycles.map((cycle) => cycle.id)).size !== cycles.length) {
      return null;
    }
    if (cycles.filter((cycle) => cycle.status === "open").length !== 1) {
      return null;
    }

    const contributions: ContributionRecord[] = [];
    const seenPayers = new Set<string>();
    for (const record of raw.contributions) {
      if (!record || typeof record.id !== "string" || record.id.trim() === "") {
        return null;
      }
      const cycle = cycles.find((item) => item.id === record.cycleId);
      if (!cycle || record.recipientId !== cycle.recipientId) {
        return null;
      }
      if (typeof record.payerId !== "string" || !memberIds.includes(record.payerId)) {
        return null;
      }
      if (record.payerId === cycle.recipientId) {
        return null;
      }
      if (record.amountKes !== raw.monthlyContributionKes) {
        return null;
      }
      if (typeof record.destination !== "string" || !LIGHTNING_ADDRESS.test(record.destination.trim())) {
        return null;
      }
      if (typeof record.recordedAt !== "string" || record.recordedAt.trim() === "") {
        return null;
      }
      const payerKey = `${cycle.id}:${record.payerId}`;
      if (seenPayers.has(payerKey)) {
        return null;
      }
      seenPayers.add(payerKey);

      const destination = record.destination.trim();
      let settlement: ContributionRecord["settlement"];
      if (record.settlement === "lightning") {
        settlement = "lightning";
      } else if (
        record.settlement === "demo" ||
        (record.settlement === undefined && isDemoLightningAddress(destination))
      ) {
        settlement = "demo";
      } else {
        return null;
      }
      if (settlement === "lightning") {
        if (!isPositiveInt(record.amountSats) || isDemoLightningAddress(destination)) {
          return null;
        }
      }

      contributions.push({
        id: record.id,
        cycleId: cycle.id,
        payerId: record.payerId,
        recipientId: cycle.recipientId,
        amountKes: raw.monthlyContributionKes,
        amountSats: settlement === "lightning" ? record.amountSats : undefined,
        settlement,
        destination,
        recordedAt: record.recordedAt,
      });
    }

    for (const cycle of cycles) {
      const required = raw.memberIdsInOrder.filter((id) => id !== cycle.recipientId);
      const paid = contributions.filter((record) => record.cycleId === cycle.id);
      const complete = required.every((id) => paid.some((record) => record.payerId === id));
      if (cycle.status === "complete" && !complete) {
        return null;
      }
      if (cycle.status === "open" && complete) {
        return null;
      }
    }

    const badgeOptIns: BadgeOptIn[] = [];
    const seenBadges = new Set<string>();
    for (const optIn of raw.badgeOptIns) {
      if (!optIn || typeof optIn.memberId !== "string" || !memberIds.includes(optIn.memberId)) {
        return null;
      }
      if (seenBadges.has(optIn.memberId)) {
        return null;
      }
      seenBadges.add(optIn.memberId);
      const proof = optIn.proof;
      if (!proof || proof.kind !== "reliability_badge") {
        return null;
      }
      if (typeof proof.id !== "string" || typeof proof.createdAt !== "string" || proof.createdAt.trim() === "") {
        return null;
      }
      badgeOptIns.push({
        memberId: optIn.memberId,
        proof: {
          id: proof.id,
          kind: "reliability_badge",
          ref: typeof proof.ref === "string" ? proof.ref : undefined,
          createdAt: proof.createdAt,
        },
      });
    }

    const parsed: ChamaCircle = {
      id: "chama-sisters",
      name: "Chama Sisters",
      kind,
      monthlyContributionKes: raw.monthlyContributionKes,
      memberIdsInOrder: [...raw.memberIdsInOrder],
      members,
      cycles,
      contributions,
      badgeOptIns,
    };
    roundView(parsed);
    return parsed;
  } catch {
    return null;
  }
}

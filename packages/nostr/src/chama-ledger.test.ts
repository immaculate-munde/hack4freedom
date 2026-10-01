import { describe, expect, it } from "vitest";
import {
  ChamaLedgerError,
  createDemoChamaSisters,
  optInReliabilityBadge,
  recordOwnContribution,
  roundView,
  setOwnLightningAddress,
} from "./chama-ledger";

describe("chama ledger", () => {
  it("starts as a record of direct payments, with one member still waiting", () => {
    const circle = createDemoChamaSisters();
    const view = roundView(circle);

    expect(circle.name).toBe("Chama Sisters");
    expect(circle.monthlyContributionKes).toBe(2000);
    expect(view.recipient.id).toBe("chebet");
    expect(view.rows.map((row) => [row.member.id, row.role])).toEqual([
      ["amina", "waiting"],
      ["chebet", "receives"],
      ["nyambura", "recorded"],
    ]);
    expect(view.waitingKes).toBe(2000);
    expect(circle.badgeOptIns).toEqual([]);
  });

  it("records only the actor's payment, to the recipient's address, for the circle amount", () => {
    const original = createDemoChamaSisters();
    const next = recordOwnContribution(original, "amina", "2026-09-30T12:00:00.000Z");

    expect(original.contributions).toHaveLength(1);
    const amina = next.contributions.find((record) => record.payerId === "amina");
    expect(amina).toMatchObject({
      recipientId: "chebet",
      amountKes: 2000,
      destination: "chebet.demo@example.com",
    });
    expect(next.cycles[0]?.status).toBe("complete");
    expect(next.cycles[1]).toMatchObject({
      index: 1,
      recipientId: "nyambura",
      status: "open",
    });
  });

  it("refuses a second record, a recipient paying in, and a non-member", () => {
    const open = createDemoChamaSisters();
    open.contributions = [];
    const once = recordOwnContribution(open, "amina", "2026-09-30T12:00:00.000Z");
    expect(() => recordOwnContribution(once, "amina", "2026-10-01T12:00:00.000Z")).toThrow(
      /already recorded/,
    );

    const paid = recordOwnContribution(
      createDemoChamaSisters(),
      "amina",
      "2026-09-30T12:00:00.000Z",
    );
    expect(() => recordOwnContribution(paid, "nyambura", "2026-10-01T12:00:00.000Z")).toThrow(
      /does not pay into it/,
    );
    expect(() =>
      recordOwnContribution(createDemoChamaSisters(), "treasurer", "2026-10-01T12:00:00.000Z"),
    ).toThrow(/Only a member/);
  });

  it("lets a member change only their own Lightning address", () => {
    const circle = createDemoChamaSisters();
    const next = setOwnLightningAddress(circle, "amina", "amina@wallet.example.com");

    expect(next.members.find((member) => member.id === "amina")?.lightningAddress).toBe(
      "amina@wallet.example.com",
    );
    expect(next.members.find((member) => member.id === "chebet")?.lightningAddress).toBe(
      "chebet.demo@example.com",
    );
    expect(() => setOwnLightningAddress(circle, "amina", "not an address")).toThrow(
      ChamaLedgerError,
    );
    expect(() => setOwnLightningAddress(circle, "stranger", "a@wallet.example.com")).toThrow(
      /Only a member/,
    );
  });

  it("offers a reliability note only after a round finishes, and does not publish it", () => {
    const open = createDemoChamaSisters();
    expect(() => optInReliabilityBadge(open, "amina", "2026-10-01T12:00:00.000Z")).toThrow(
      /after a round finishes/,
    );

    const closed = recordOwnContribution(open, "amina", "2026-09-30T12:00:00.000Z");
    const opted = optInReliabilityBadge(closed, "amina", "2026-10-01T12:00:00.000Z");
    const again = optInReliabilityBadge(opted, "amina", "2026-10-02T12:00:00.000Z");

    expect(opted.badgeOptIns).toEqual([
      {
        memberId: "amina",
        proof: {
          id: "badge-chama-sisters-amina",
          kind: "reliability_badge",
          ref: "mock:chama-sisters:amina",
          createdAt: "2026-10-01T12:00:00.000Z",
        },
      },
    ]);
    expect(again.badgeOptIns).toHaveLength(1);
  });
});

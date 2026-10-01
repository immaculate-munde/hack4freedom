import { describe, expect, it } from "vitest";
import {
  ChamaLedgerError,
  createDemoChamaSisters,
  optInReliabilityBadge,
  payAndRecord,
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
      ["chebet", "receives"],
      ["nyambura", "recorded"],
      ["amina", "waiting"],
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
      settlement: "demo",
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

  it("sends only to the recipient, then records the sats and closes the round", async () => {
    const ready = setOwnLightningAddress(
      createDemoChamaSisters(),
      "chebet",
      "chebet@pay.example.net",
    );
    const sent: Array<[string, number]> = [];
    const next = await payAndRecord(
      ready,
      "amina",
      1500,
      "2026-09-30T12:00:00.000Z",
      async (destination, amountSats) => {
        sent.push([destination, amountSats]);
      },
    );

    expect(sent).toEqual([["chebet@pay.example.net", 1500]]);
    expect(next.contributions.find((record) => record.payerId === "amina")).toMatchObject({
      settlement: "lightning",
      amountSats: 1500,
      amountKes: 2000,
      destination: "chebet@pay.example.net",
    });
    expect(next.cycles[0]?.status).toBe("complete");
    expect(next.cycles[1]?.recipientId).toBe("nyambura");
    expect(ready.cycles[0]?.status).toBe("open");
  });

  it("leaves the round open when the wallet send fails", async () => {
    const ready = setOwnLightningAddress(
      createDemoChamaSisters(),
      "chebet",
      "chebet@pay.example.net",
    );
    await expect(
      payAndRecord(ready, "amina", 1500, "2026-09-30T12:00:00.000Z", async () => {
        throw new Error("The wallet could not send.");
      }),
    ).rejects.toThrow(/could not send/);
    expect(ready.contributions).toHaveLength(1);
    expect(ready.cycles[0]?.status).toBe("open");
  });

  it("will not record a demo payment to a real address, or send sats to a demo address", async () => {
    const ready = setOwnLightningAddress(
      createDemoChamaSisters(),
      "chebet",
      "chebet@pay.example.net",
    );
    expect(() => recordOwnContribution(ready, "amina", "2026-09-30T12:00:00.000Z")).toThrow(
      /real Lightning address/,
    );
    await expect(
      payAndRecord(
        createDemoChamaSisters(),
        "amina",
        100,
        "2026-09-30T12:00:00.000Z",
        async () => {},
      ),
    ).rejects.toThrow(/demo address/);
  });
});

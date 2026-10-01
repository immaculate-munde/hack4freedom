import { describe, expect, it } from "vitest";
import {
  ChamaLedgerError,
  createDemoChamaSisters,
  isDemoLightningAddress,
  optInReliabilityBadge,
  parseChamaCircle,
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
    expect(() =>
      setOwnLightningAddress(circle, "amina", "chebet.demo@example.com"),
    ).toThrow(/already belongs to another member/);
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

  it("walks every member once, then starts the next turn at the first member", () => {
    let circle = createDemoChamaSisters();
    const at = "2026-10-01T12:00:00.000Z";

    circle = recordOwnContribution(circle, "amina", at);
    expect(roundView(circle).recipient.id).toBe("nyambura");

    circle = recordOwnContribution(circle, "chebet", at);
    circle = recordOwnContribution(circle, "amina", at);
    expect(roundView(circle).recipient.id).toBe("amina");
    expect(() => recordOwnContribution(circle, "amina", at)).toThrow(/does not pay into it/);

    circle = recordOwnContribution(circle, "chebet", at);
    circle = recordOwnContribution(circle, "nyambura", at);
    const view = roundView(circle);
    expect(view.recipient.id).toBe("chebet");
    expect(view.cycle.index).toBe(3);
    expect(view.completedRounds).toBe(3);
    expect(view.rows.map((row) => row.role)).toEqual(["receives", "waiting", "waiting"]);
  });

  it("keeps later payments on the address that already received sats", async () => {
    const open = createDemoChamaSisters();
    open.contributions = [];
    let circle = setOwnLightningAddress(open, "chebet", "first@pay.example.net");
    const at = "2026-10-01T12:00:00.000Z";
    circle = await payAndRecord(circle, "amina", 1000, at, async () => {});
    circle = setOwnLightningAddress(circle, "chebet", "second@pay.example.net");

    const view = roundView(circle);
    expect(view.recipient.lightningAddress).toBe("second@pay.example.net");
    expect(view.payDestination).toBe("first@pay.example.net");

    const sent: string[] = [];
    circle = await payAndRecord(circle, "nyambura", 1000, at, async (destination) => {
      sent.push(destination);
    });
    expect(sent).toEqual(["first@pay.example.net"]);
    expect(circle.cycles[0]?.status).toBe("complete");
  });

  it("records the address that was paid even if the profile address changes mid-send", async () => {
    const open = createDemoChamaSisters();
    open.contributions = [];
    const circle = setOwnLightningAddress(open, "chebet", "chebet@pay.example.net");
    const next = await payAndRecord(
      circle,
      "amina",
      1000,
      "2026-10-01T12:00:00.000Z",
      async () => {
        const chebet = circle.members.find((member) => member.id === "chebet");
        if (chebet) {
          chebet.lightningAddress = "stolen@evil.test";
        }
      },
    );
    expect(next.contributions.find((record) => record.payerId === "amina")?.destination).toBe(
      "chebet@pay.example.net",
    );
  });

  it("rejects a non-whole sats amount before asking the wallet to send", async () => {
    const ready = setOwnLightningAddress(
      createDemoChamaSisters(),
      "chebet",
      "chebet@pay.example.net",
    );
    let called = false;
    await expect(
      payAndRecord(ready, "amina", 1.5, "2026-10-01T12:00:00.000Z", async () => {
        called = true;
      }),
    ).rejects.toThrow(/whole sats/);
    expect(called).toBe(false);
  });

  it("trims a receive address and treats only example.com as a demo wallet", () => {
    const next = setOwnLightningAddress(
      createDemoChamaSisters(),
      "amina",
      "  Amina@Wallet.example.com  ",
    );
    expect(next.members.find((member) => member.id === "amina")?.lightningAddress).toBe(
      "Amina@Wallet.example.com",
    );
    expect(isDemoLightningAddress("  Person@Example.com ")).toBe(true);
    expect(isDemoLightningAddress("person@sub.example.com")).toBe(false);
  });

  it("will not point two members at one address or pay a member back to themselves", async () => {
    const circle = setOwnLightningAddress(
      createDemoChamaSisters(),
      "amina",
      "amina@pay.example.net",
    );
    expect(() =>
      setOwnLightningAddress(circle, "chebet", "AMINA@pay.example.net"),
    ).toThrow(/already belongs to another member/);

    const kept = setOwnLightningAddress(circle, "amina", "amina@pay.example.net");
    expect(kept.members.find((member) => member.id === "amina")?.lightningAddress).toBe(
      "amina@pay.example.net",
    );

    const shared = JSON.parse(JSON.stringify(circle)) as {
      members: Array<{ id: string; lightningAddress: string }>;
    };
    const chebet = shared.members.find((member) => member.id === "chebet");
    if (chebet) chebet.lightningAddress = "amina@pay.example.net";
    expect(parseChamaCircle(shared)).toBeNull();

    const payingSelf = createDemoChamaSisters();
    const recipient = payingSelf.members.find((member) => member.id === "chebet");
    const payer = payingSelf.members.find((member) => member.id === "amina");
    if (recipient && payer) recipient.lightningAddress = payer.lightningAddress;
    expect(() => recordOwnContribution(payingSelf, "amina", "2026-10-01T12:00:00.000Z")).toThrow(
      /own Lightning address/,
    );
  });

  it("drops a saved circle that could crash the round or fake a payment", () => {
    const saved = createDemoChamaSisters();
    expect(parseChamaCircle(JSON.parse(JSON.stringify(saved)))?.name).toBe("Chama Sisters");

    const missingSettlement = JSON.parse(JSON.stringify(saved)) as {
      contributions: Array<{ settlement?: string }>;
    };
    delete missingSettlement.contributions[0]?.settlement;
    expect(parseChamaCircle(missingSettlement)?.contributions[0]?.settlement).toBe("demo");

    const broken = JSON.parse(JSON.stringify(saved)) as {
      cycles: Array<{ recipientId: string }>;
    };
    broken.cycles[0]!.recipientId = "missing-member";
    expect(parseChamaCircle(broken)).toBeNull();

    const twoOpen = JSON.parse(JSON.stringify(saved)) as {
      cycles: Array<{ id: string; index: number; recipientId: string; status: string }>;
    };
    twoOpen.cycles.push({
      id: "cycle-extra",
      index: 1,
      recipientId: "nyambura",
      status: "open",
    });
    expect(parseChamaCircle(twoOpen)).toBeNull();

    const fakePaid = JSON.parse(JSON.stringify(saved)) as {
      contributions: Array<{ amountKes: number }>;
    };
    fakePaid.contributions[0]!.amountKes = 1;
    expect(parseChamaCircle(fakePaid)).toBeNull();

    const lightningWithoutSats = JSON.parse(JSON.stringify(saved)) as {
      contributions: Array<{ settlement: string; destination: string; amountSats?: number }>;
    };
    lightningWithoutSats.contributions[0]!.settlement = "lightning";
    lightningWithoutSats.contributions[0]!.destination = "chebet@pay.example.net";
    expect(parseChamaCircle(lightningWithoutSats)).toBeNull();
  });
});

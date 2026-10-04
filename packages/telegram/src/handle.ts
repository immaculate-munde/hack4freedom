/**
 * Telegram conversation → profile rules and the on-ramp.
 * Reminder preference is stored. Purchases never auto-send.
 */

import {
  assertInvestAmount,
  demoProfiles,
  investAllowance,
  type FinancialProfile,
  type OnboardingAnswers,
} from "@pesasense/core";
import {
  parseDestination,
  toBitcoinCoKeLightningAddress,
  toBitikaPhone,
} from "@pesasense/wallet";
import type { TelegramConfig } from "./config";
import { habitOffer, parseWholeKes, planWithAmount } from "./habit";
import { newSession, touchSession } from "./session";
import {
  breakdownText,
  investReviewText,
  profileSummary,
  readyButtons,
} from "./summary";
import type { TelegramStore } from "./store";
import type {
  TelegramInbound,
  TelegramPurchaseInput,
  TelegramPurchaseResult,
  TelegramReply,
  TelegramSession,
} from "./types";

export interface TelegramDeps {
  now(): number;
  store: TelegramStore;
  buildFromSms(text: string, onboarding: OnboardingAnswers): FinancialProfile;
  buildFromPdf(
    bytes: Uint8Array,
    password: string,
    onboarding: OnboardingAnswers,
  ): Promise<FinancialProfile>;
  downloadFile(fileId: string): Promise<Uint8Array>;
  startPurchase(input: TelegramPurchaseInput): Promise<TelegramPurchaseResult>;
  bitikaConfigured(): boolean;
  newIdempotencyKey(): string;
}

export type TelegramHandleResult = {
  replies: TelegramReply[];
  /** Answer callback_query so Telegram stops the loading spinner. */
  callbackQueryId: string | null;
};

const START_COPY = [
  "PesaSense helps you read your M-Pesa history and start a small Bitcoin habit.",
  "",
  "You send your statement here (PDF or SMS paste) so we can build your picture.",
  "That means the file leaves your phone and reaches this bot.",
  "You approve every purchase. We'll remind you on the 1st — we never auto-send M-Pesa or Bitcoin.",
  "",
  "Education, not financial advice. Bitcoin can lose value. Whole shillings only.",
  "",
  "A few optional questions next. Tap Skip anytime, or /skip.",
].join("\n");

function reply(text: string, buttons?: TelegramReply["buttons"]): TelegramReply {
  return buttons ? { text, buttons } : { text };
}

function save(
  deps: TelegramDeps,
  session: TelegramSession,
  config: TelegramConfig,
): TelegramSession {
  const next = touchSession(session, deps.now(), config.sessionTtlMs);
  deps.store.saveSession(next);
  return next;
}

function debtQuestion(): TelegramReply {
  return reply("Do you have debts we should keep in mind? (rent loans, Fuliza, school…)", [
    [
      { text: "Yes", callbackData: "debt:yes" },
      { text: "No", callbackData: "debt:no" },
      { text: "Skip", callbackData: "skip" },
    ],
  ]);
}

function debtNameQuestion(): TelegramReply {
  return reply("What do you call this debt?", [
    [{ text: "Skip", callbackData: "skip" }],
  ]);
}

function debtAmountQuestion(label: string): TelegramReply {
  return reply(
    `Noted: ${label}. About how much do you owe in whole KES? Tap Skip if you're not sure.`,
    [[{ text: "Skip", callbackData: "skip" }]],
  );
}

function chamaQuestion(): TelegramReply {
  return reply("Are you in a chama?", [
    [
      { text: "Yes", callbackData: "chama:yes" },
      { text: "No", callbackData: "chama:no" },
      { text: "Skip", callbackData: "skip" },
    ],
  ]);
}

function goalQuestion(): TelegramReply {
  return reply("What matters most right now?", [
    [{ text: "Emergency buffer", callbackData: "goal:buffer" }],
    [{ text: "Long-term saving", callbackData: "goal:long" }],
    [{ text: "Skip", callbackData: "skip" }],
  ]);
}

function importPrompt(): TelegramReply {
  return reply(
    [
      "Send your M-Pesa history:",
      "• Paste SMS messages (blank line between each), or",
      "• Upload a statement PDF (we'll ask for the password you set — never your national ID).",
      "",
      "Or try the labeled demo:",
    ].join("\n"),
    [[{ text: "Demo Amina (labeled demo)", callbackData: "demo:amina" }]],
  );
}

function afterProfile(
  session: TelegramSession,
  profile: FinancialProfile,
  deps: TelegramDeps,
  config: TelegramConfig,
): TelegramReply[] {
  const next = save(deps, { ...session, profile, step: "ready", pendingPdfFileId: null }, config);
  return [
    reply(profileSummary(next.profile!), readyButtons(next.profile!)),
  ];
}

export async function handleTelegram(
  chatId: number,
  inbound: TelegramInbound,
  deps: TelegramDeps,
  config: TelegramConfig,
  callbackQueryId: string | null = null,
): Promise<TelegramHandleResult> {
  deps.store.deleteExpired(deps.now());
  let session = deps.store.getSession(chatId);

  if (inbound.kind === "command" && inbound.command === "/start") {
    session = save(deps, newSession(chatId, deps.now(), config.sessionTtlMs, "ask_debt"), config);
    return {
      replies: [reply(START_COPY), debtQuestion()],
      callbackQueryId,
    };
  }

  if (!session) {
    session = save(deps, newSession(chatId, deps.now(), config.sessionTtlMs, "ask_debt"), config);
    return {
      replies: [
        reply("Session started. " + START_COPY.split("\n\n")[0]),
        debtQuestion(),
      ],
      callbackQueryId,
    };
  }

  if (inbound.kind === "command" && inbound.command === "/skip") {
    return {
      replies: await advanceSkip(session, deps, config),
      callbackQueryId,
    };
  }

  if (inbound.kind === "command" && inbound.command === "/help") {
    return {
      replies: [
        reply(
          "Commands: /start, /skip, /help.\nSend SMS paste or a PDF when asked. You approve every purchase.",
        ),
      ],
      callbackQueryId,
    };
  }

  if (inbound.kind === "callback") {
    return {
      replies: await onCallback(session, inbound.data, deps, config),
      callbackQueryId,
    };
  }

  if (inbound.kind === "document") {
    return {
      replies: await onDocument(session, inbound, deps, config),
      callbackQueryId,
    };
  }

  if (inbound.kind === "text" || (inbound.kind === "command" && inbound.args)) {
    const text =
      inbound.kind === "text" ? inbound.text : inbound.args;
    return {
      replies: await onText(session, text, deps, config),
      callbackQueryId,
    };
  }

  return {
    replies: [reply("Send /start to begin, or paste SMS / upload a PDF.")],
    callbackQueryId,
  };
}

async function advanceSkip(
  session: TelegramSession,
  deps: TelegramDeps,
  config: TelegramConfig,
): Promise<TelegramReply[]> {
  if (session.step === "ask_debt") {
    save(deps, { ...session, step: "ask_chama" }, config);
    return [chamaQuestion()];
  }
  if (session.step === "ask_debt_name") {
    const onboarding: OnboardingAnswers = {
      ...session.onboarding,
      debts: [],
    };
    save(deps, { ...session, onboarding, step: "ask_chama" }, config);
    return [reply("No debt details noted."), chamaQuestion()];
  }
  if (session.step === "ask_debt_amount") {
    // Name already stored with balance 0; Skip keeps that.
    save(deps, { ...session, step: "ask_chama" }, config);
    return [chamaQuestion()];
  }
  if (session.step === "ask_chama") {
    save(deps, { ...session, step: "ask_goal" }, config);
    return [goalQuestion()];
  }
  if (session.step === "ask_goal") {
    save(deps, { ...session, step: "awaiting_import" }, config);
    return [importPrompt()];
  }
  return [reply("Nothing to skip here. Send /start to begin again.")];
}

async function onCallback(
  session: TelegramSession,
  data: string,
  deps: TelegramDeps,
  config: TelegramConfig,
): Promise<TelegramReply[]> {
  if (data === "skip") {
    return advanceSkip(session, deps, config);
  }

  if (data.startsWith("debt:")) {
    if (data === "debt:yes") {
      save(deps, { ...session, step: "ask_debt_name" }, config);
      return [debtNameQuestion()];
    }
    const onboarding: OnboardingAnswers = {
      ...session.onboarding,
      debts: [],
    };
    save(deps, { ...session, onboarding, step: "ask_chama" }, config);
    return [reply("No debts noted."), chamaQuestion()];
  }

  if (data.startsWith("chama:")) {
    const yes = data === "chama:yes";
    const onboarding: OnboardingAnswers = {
      ...session.onboarding,
      chamaMemberships: yes
        ? [{ name: "My chama", monthlyContributionKes: 0, kind: "other" }]
        : [],
    };
    save(deps, { ...session, onboarding, step: "ask_goal" }, config);
    return [
      reply(yes ? "Chama noted." : "No chama noted."),
      goalQuestion(),
    ];
  }

  if (data.startsWith("goal:")) {
    const kind =
      data === "goal:buffer"
        ? ("emergency_buffer" as const)
        : data === "goal:long"
          ? ("long_horizon" as const)
          : ("other" as const);
    const onboarding: OnboardingAnswers = {
      ...session.onboarding,
      goal: { kind },
    };
    save(deps, { ...session, onboarding, step: "awaiting_import" }, config);
    return [reply("Thanks."), importPrompt()];
  }

  if (data === "demo:amina") {
    const profile = structuredClone(demoProfiles.amina);
    return afterProfile(session, profile, deps, config);
  }

  if (!session.profile) {
    return [reply("Import a statement first, or tap Demo Amina."), importPrompt()];
  }

  if (data === "breakdown") {
    return [reply(breakdownText(session.profile), readyButtons(session.profile))];
  }

  if (data === "habit") {
    const offer = habitOffer(session.profile);
    if (!offer.ok) {
      return [reply(offer.reason, readyButtons(session.profile))];
    }
    save(deps, { ...session, step: "habit_amount" }, config);
    return [
      reply(
        `How much each time? Whole KES, up to ${offer.maxKes.toLocaleString("en-KE")} (the safe floor).`,
      ),
    ];
  }

  if (data === "cadence:monthly" || data === "cadence:weekly") {
    if (session.step !== "habit_cadence" || !session.profile?.investmentPlan) {
      return [reply("Set the habit amount first."), ...(session.profile ? [reply(profileSummary(session.profile), readyButtons(session.profile))] : [])];
    }
    const cadence = data === "cadence:weekly" ? "weekly" : "monthly";
    const amount = session.profile.investmentPlan.amountKes;
    const profile = planWithAmount(session.profile, amount, cadence);
    save(deps, { ...session, profile, step: "ready" }, config);
    return [
      reply(
        `Habit saved: KES ${amount.toLocaleString("en-KE")} / ${cadence}. Nothing is sent until you approve a purchase.`,
        readyButtons(profile),
      ),
    ];
  }

  if (data === "remind") {
    const plan = session.profile.investmentPlan;
    if (!plan) {
      return [
        reply("Save the habit first. The reminder uses that saved amount.", readyButtons(session.profile)),
      ];
    }
    const reminder = {
      dayOfMonth: 1 as const,
      amountKes: plan.amountKes,
      cadence: plan.cadence,
      status: "chosen" as const,
      setAt: new Date(deps.now()).toISOString(),
    };
    save(deps, { ...session, reminder, step: "ready" }, config);
    return [
      reply(
        `Reminder set for the 1st: review KES ${plan.amountKes.toLocaleString("en-KE")}. You approve each purchase. Nothing is sent on its own.`,
        readyButtons(session.profile),
      ),
    ];
  }

  if (data === "invest") {
    const allowance = investAllowance(session.profile);
    if (!allowance.ok) {
      return [reply(allowance.reason, readyButtons(session.profile))];
    }
    if (!session.profile.investmentPlan?.amountKes) {
      return [
        reply("Save a habit amount first.", readyButtons(session.profile)),
      ];
    }
    if (!deps.bitikaConfigured()) {
      return [
        reply(
          "BITIKA_API_KEY is not configured on the server. Purchases stop here — same as the web app.",
          readyButtons(session.profile),
        ),
      ];
    }
    save(deps, { ...session, step: "invest_phone", purchasePhone: null, purchaseDestination: null }, config);
    return [
      reply(investReviewText(session.profile)),
      reply("Send the M-Pesa phone that will pay (07… or 254…)."),
    ];
  }

  if (data === "dest:bitcoincke") {
    if (session.step !== "invest_destination" || !session.purchasePhone) {
      return [reply("Start Review investment again.")];
    }
    try {
      const destination = toBitcoinCoKeLightningAddress(session.purchasePhone);
      save(
        deps,
        {
          ...session,
          purchaseDestination: destination,
          step: "invest_confirm",
        },
        config,
      );
      return confirmButtons(session.profile, session.purchasePhone, destination);
    } catch (error) {
      return [
        reply(error instanceof Error ? error.message : "Could not build that Lightning address."),
      ];
    }
  }

  if (data === "approve") {
    return runApprovedPurchase(session, deps, config);
  }

  if (data === "cancel_invest") {
    save(deps, { ...session, step: "ready", purchasePhone: null, purchaseDestination: null }, config);
    return [
      reply("Cancelled. Nothing was sent.", readyButtons(session.profile)),
    ];
  }

  return [reply("Unknown action. Send /start or use the buttons.")];
}

function confirmButtons(
  profile: FinancialProfile | null,
  phone: string,
  destination: string,
): TelegramReply[] {
  const amount = profile?.investmentPlan?.amountKes ?? 0;
  return [
    reply(
      [
        `Confirm purchase: KES ${amount.toLocaleString("en-KE")}`,
        `M-Pesa: ${phone}`,
        `Lightning: ${destination}`,
        "",
        "Bitcoin can lose value. Tap Approve only if you want to start this buy.",
      ].join("\n"),
      [
        [
          { text: "Approve", callbackData: "approve" },
          { text: "Cancel", callbackData: "cancel_invest" },
        ],
      ],
    ),
  ];
}

async function runApprovedPurchase(
  session: TelegramSession,
  deps: TelegramDeps,
  config: TelegramConfig,
): Promise<TelegramReply[]> {
  if (!session.profile || !session.purchasePhone || !session.purchaseDestination) {
    return [reply("Missing purchase details. Tap Review investment again.")];
  }
  if (session.step !== "invest_confirm") {
    return [reply("Approve only from the confirm step. Nothing was sent.")];
  }
  if (!deps.bitikaConfigured()) {
    return [
      reply(
        "BITIKA_API_KEY is not configured. Purchase stopped.",
        readyButtons(session.profile),
      ),
    ];
  }

  const amountKes = session.profile.investmentPlan?.amountKes;
  if (!amountKes) {
    return [reply("Save a habit amount first.", readyButtons(session.profile))];
  }

  try {
    assertInvestAmount(session.profile, amountKes);
    parseDestination(session.purchaseDestination);
    const phone = toBitikaPhone(session.purchasePhone);
    const purchase = await deps.startPurchase({
      amountKes,
      phone,
      destination: session.purchaseDestination,
      approvedByUser: true,
      idempotencyKey: deps.newIdempotencyKey(),
      profile: session.profile,
    });
    save(
      deps,
      {
        ...session,
        step: "ready",
        purchasePhone: null,
        purchaseDestination: null,
      },
      config,
    );
    const sats =
      typeof purchase.amountSats === "number"
        ? ` Estimated ${purchase.amountSats} sats.`
        : "";
    return [
      reply(
        `Purchase started (${purchase.purchaseId}). Status: ${purchase.status}.${sats} Check your phone for M-Pesa if live.`,
        readyButtons(session.profile),
      ),
    ];
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not start the purchase.";
    return [reply(message, readyButtons(session.profile))];
  }
}

async function onDocument(
  session: TelegramSession,
  inbound: Extract<TelegramInbound, { kind: "document" }>,
  deps: TelegramDeps,
  config: TelegramConfig,
): Promise<TelegramReply[]> {
  if (session.step !== "awaiting_import" && session.step !== "awaiting_pdf_password" && session.step !== "ready") {
    return [reply("Send /start first, then upload when asked for your statement.")];
  }
  const name = inbound.fileName.toLowerCase();
  const mime = inbound.mimeType ?? "";
  if (!name.endsWith(".pdf") && mime !== "application/pdf") {
    return [reply("Please send a PDF statement, or paste SMS text.")];
  }
  save(
    deps,
    {
      ...session,
      step: "awaiting_pdf_password",
      pendingPdfFileId: inbound.fileId,
    },
    config,
  );
  return [
    reply(
      "PDF received. Reply with the statement password (the one you set — for the demo fixture use demo-statement). We use it only to open the file and do not keep it.",
    ),
  ];
}

async function onText(
  session: TelegramSession,
  text: string,
  deps: TelegramDeps,
  config: TelegramConfig,
): Promise<TelegramReply[]> {
  if (session.step === "ask_debt_name") {
    const label = text.trim();
    if (!label) {
      return [debtNameQuestion()];
    }
    const onboarding: OnboardingAnswers = {
      ...session.onboarding,
      debts: [{ label, balanceKes: 0 }],
    };
    save(deps, { ...session, onboarding, step: "ask_debt_amount" }, config);
    return [debtAmountQuestion(label)];
  }

  if (session.step === "ask_debt_amount") {
    const amount = parseWholeKes(text);
    if (amount === null) {
      return [
        reply("Send a whole number of shillings, with no decimals. Or tap Skip.", [
          [{ text: "Skip", callbackData: "skip" }],
        ]),
      ];
    }
    const existing = session.onboarding.debts[0];
    const label = existing?.label ?? "Debt";
    const onboarding: OnboardingAnswers = {
      ...session.onboarding,
      debts: [{ label, balanceKes: amount }],
    };
    save(deps, { ...session, onboarding, step: "ask_chama" }, config);
    return [
      reply(`Noted: ${label} — KES ${amount.toLocaleString("en-KE")}.`),
      chamaQuestion(),
    ];
  }

  if (session.step === "awaiting_pdf_password") {
    if (!session.pendingPdfFileId) {
      save(deps, { ...session, step: "awaiting_import" }, config);
      return [reply("Upload the PDF again."), importPrompt()];
    }
    const password = text;
    // Password is only in this request scope — never written to the session.
    const fileId = session.pendingPdfFileId;
    try {
      const bytes = await deps.downloadFile(fileId);
      const profile = await deps.buildFromPdf(bytes, password, session.onboarding);
      return afterProfile(
        { ...session, pendingPdfFileId: null },
        profile,
        deps,
        config,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not read that PDF.";
      save(
        deps,
        { ...session, step: "awaiting_import", pendingPdfFileId: null },
        config,
      );
      return [
        reply(`${message}\n\nTry again, paste SMS, or use the labeled demo.`),
        importPrompt(),
      ];
    }
  }

  if (session.step === "awaiting_import" || (session.step === "ready" && looksLikeSms(text))) {
    try {
      const profile = deps.buildFromSms(text, session.onboarding);
      return afterProfile(session, profile, deps, config);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not read those messages.";
      return [
        reply(`${message}\n\nTry a fuller paste, a PDF, or Demo Amina.`),
        importPrompt(),
      ];
    }
  }

  if (session.step === "habit_amount") {
    if (!session.profile) {
      return [reply("Import a statement first."), importPrompt()];
    }
    const offer = habitOffer(session.profile);
    if (!offer.ok) {
      save(deps, { ...session, step: "ready" }, config);
      return [reply(offer.reason, readyButtons(session.profile))];
    }
    const amount = parseWholeKes(text);
    if (amount === null) {
      return [reply("Send a whole number of shillings, with no decimals.")];
    }
    if (amount > offer.maxKes) {
      return [
        reply(
          `That is above the safe floor (${offer.maxKes.toLocaleString("en-KE")} KES). Pick a smaller amount.`,
        ),
      ];
    }
    const profile = planWithAmount(session.profile, amount, "monthly");
    save(deps, { ...session, profile, step: "habit_cadence" }, config);
    return [
      reply("Monthly is the default. Weekly is optional.", [
        [
          { text: "Monthly", callbackData: "cadence:monthly" },
          { text: "Weekly", callbackData: "cadence:weekly" },
        ],
      ]),
    ];
  }

  if (session.step === "invest_phone") {
    try {
      const phone = toBitikaPhone(text);
      save(deps, { ...session, purchasePhone: phone, step: "invest_destination" }, config);
      return [
        reply("Send a Lightning address (you@host), or use bitcoin.co.ke from this phone.", [
          [{ text: "Use 07…@bitcoin.co.ke", callbackData: "dest:bitcoincke" }],
          [{ text: "Cancel", callbackData: "cancel_invest" }],
        ]),
      ];
    } catch (error) {
      return [
        reply(error instanceof Error ? error.message : "That phone does not look valid."),
      ];
    }
  }

  if (session.step === "invest_destination") {
    try {
      parseDestination(text);
      const destination = text.trim();
      save(
        deps,
        { ...session, purchaseDestination: destination, step: "invest_confirm" },
        config,
      );
      return confirmButtons(session.profile, session.purchasePhone ?? "", destination);
    } catch (error) {
      return [
        reply(error instanceof Error ? error.message : "Enter a Lightning address."),
      ];
    }
  }

  if (session.step === "ask_debt" || session.step === "ask_chama" || session.step === "ask_goal") {
    return advanceSkip(session, deps, config);
  }

  if (session.profile) {
    return [reply(profileSummary(session.profile), readyButtons(session.profile))];
  }

  return [importPrompt()];
}

function looksLikeSms(text: string): boolean {
  return /confirmed|m-pesa|mpesa|ksh/i.test(text) && text.length > 40;
}

/** Exported for unit tests that drive the state machine without Telegram HTTP. */
export const __testOnly = {
  START_COPY,
  debtQuestion,
  importPrompt,
  afterProfile,
};

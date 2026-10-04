/**
 * Telegram conversation → profile rules and the on-ramp.
 * Reminder preference is stored. Purchases never auto-send.
 *
 * Primary Q&A choices use ReplyKeyboardMarkup so the user's answer appears
 * as their own chat bubble. Inline callbacks never create a user message.
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
  largestPaymentsText,
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
  /** Optional toast for answerCallbackQuery (no chat echo). */
  callbackAnswerText?: string | null;
};

const START_COPY = [
  "PesaSense helps you read your M-Pesa history and start a small Bitcoin habit.",
  "",
  "If you share a statement here (PDF or SMS paste), that file leaves your phone and reaches this bot.",
  "You approve every purchase. We'll remind you on the 1st — we never auto-send M-Pesa or Bitcoin.",
  "",
  "Education, not financial advice. Bitcoin can lose value. Whole shillings only.",
].join("\n");

/** Short education pages — no statement, no purchase, no invented sats. */
const LEARN_PAGES: string[] = [
  [
    "What is a small Bitcoin habit?",
    "",
    "A habit here means setting aside a whole-shilling amount you choose — often monthly by default, with weekly as an optional cadence.",
    "It is not a licence, not a fund, and not an automatic buy. You decide the amount after we help you read your money picture.",
  ].join("\n"),
  [
    "How Lightning and reminders work",
    "",
    "When you later buy, sats go to a Lightning address you control (your own wallet).",
    "A reminder on the 1st only nudges you to review — it does not send M-Pesa or Bitcoin.",
    "You approve each purchase yourself. Nothing auto-sends.",
  ].join("\n"),
  [
    "Risk and the surplus floor (high level)",
    "",
    "Bitcoin can lose value. This chat is education, not financial advice.",
    "When you use the habit path, we look at a surplus floor — a cautious reading of what might be left after commitments — and cap a habit at that floor.",
    "Learning here does not start a purchase and does not need a statement upload.",
  ].join("\n"),
];

type ReplyOptions = {
  replyKeyboard?: string[][];
  removeKeyboard?: boolean;
};

function reply(text: string, options?: ReplyOptions): TelegramReply {
  if (!options) return { text };
  return { text, ...options };
}

function pathMenuKeyboard(): string[][] {
  return [["Start a small habit"], ["Learn about Bitcoin"]];
}

function startMenuReply(): TelegramReply {
  return reply(START_COPY, { replyKeyboard: pathMenuKeyboard() });
}

function learnEndKeyboard(): string[][] {
  return [["Start a small habit"], ["Ask something else"]];
}

function learnPageReply(pageIndex: number): TelegramReply {
  const text = LEARN_PAGES[pageIndex] ?? LEARN_PAGES[LEARN_PAGES.length - 1]!;
  const isLast = pageIndex >= LEARN_PAGES.length - 1;
  if (isLast) {
    return reply(text, { replyKeyboard: learnEndKeyboard() });
  }
  return reply(text, {
    replyKeyboard: [["Next"], ["Back to menu"]],
  });
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

function beginHabitPath(
  session: TelegramSession,
  deps: TelegramDeps,
  config: TelegramConfig,
): TelegramReply[] {
  save(deps, { ...session, step: "ask_debt", learnPage: null }, config);
  return [
    reply(
      "Let's set up a small habit. A few optional questions first — choose Skip anytime, or /skip.",
      { removeKeyboard: true },
    ),
    debtQuestion(),
  ];
}

function showMenu(
  session: TelegramSession,
  deps: TelegramDeps,
  config: TelegramConfig,
): TelegramReply[] {
  save(
    deps,
    { ...session, step: "menu", pendingPdfFileId: null, learnPage: null },
    config,
  );
  return [
    reply("Pick a path — habit setup or learning. No purchase starts from this menu.", {
      replyKeyboard: pathMenuKeyboard(),
    }),
  ];
}

function debtQuestion(): TelegramReply {
  return reply("Do you have debts we should keep in mind? (rent loans, Fuliza, school…)", {
    replyKeyboard: [["Yes", "No", "Skip"]],
  });
}

function debtNameQuestion(): TelegramReply {
  return reply("What do you call this debt?", {
    replyKeyboard: [["Skip"]],
  });
}

function debtAmountQuestion(label: string): TelegramReply {
  return reply(
    `Noted: ${label}. About how much do you owe in whole KES? Choose Skip if you're not sure.`,
    { replyKeyboard: [["Skip"]] },
  );
}

function chamaQuestion(): TelegramReply {
  return reply("Are you in a chama?", {
    replyKeyboard: [["Yes", "No", "Skip"]],
  });
}

function chamaNameQuestion(): TelegramReply {
  return reply("What do you call this chama?", {
    replyKeyboard: [["Skip"]],
  });
}

function chamaAmountQuestion(label: string): TelegramReply {
  return reply(
    `Noted: ${label}. About how much do you contribute monthly in whole KES? Choose Skip if you're not sure.`,
    { replyKeyboard: [["Skip"]] },
  );
}

function goalQuestion(): TelegramReply {
  return reply("What matters most right now?", {
    replyKeyboard: [["Emergency buffer"], ["Long-term saving"], ["Skip"]],
  });
}

function importPrompt(): TelegramReply {
  return reply(
    [
      "Send your M-Pesa history:",
      "• Paste SMS messages (blank line between each) — no password needed, or",
      "• Upload a statement PDF — we will ask for the statement password next (never your national ID).",
      "",
      "Or try the labeled demo:",
    ].join("\n"),
    { replyKeyboard: [["Demo Amina (labeled demo)"]] },
  );
}

/** Clear ask after a PDF arrives. Password stays request-scoped only. */
function pdfPasswordPrompt(): TelegramReply {
  return reply(
    [
      "Enter the password for this M-Pesa statement PDF.",
      "",
      "Use the password you set when you requested the statement — never your national ID.",
      "For the demo fixture, reply with: demo-statement",
      "",
      "We use it only to open the file and do not keep it.",
      "If this PDF has no password, choose Skip (no password).",
    ].join("\n"),
    { replyKeyboard: [["Skip (no password)"]] },
  );
}

function isPdfPasswordError(message: string): boolean {
  return /password/i.test(message);
}

function afterProfile(
  session: TelegramSession,
  profile: FinancialProfile,
  deps: TelegramDeps,
  config: TelegramConfig,
  options: { isDemo?: boolean } = {},
): TelegramReply[] {
  const next = save(
    deps,
    { ...session, profile, step: "ready", pendingPdfFileId: null, learnPage: null },
    config,
  );
  const ready = next.profile!;
  const replies: TelegramReply[] = [
    reply(profileSummary(ready, { isDemo: options.isDemo }), {
      replyKeyboard: readyButtons(ready),
    }),
  ];
  const largest = largestPaymentsText(ready);
  if (largest) {
    replies.push(reply(largest));
  }
  return replies;
}

async function tryOpenPendingPdf(
  session: TelegramSession,
  password: string,
  deps: TelegramDeps,
  config: TelegramConfig,
): Promise<TelegramReply[]> {
  if (!session.pendingPdfFileId) {
    save(deps, { ...session, step: "awaiting_import" }, config);
    return [reply("Upload the PDF again.", { removeKeyboard: true }), importPrompt()];
  }
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
    if (isPdfPasswordError(message)) {
      // Keep pendingPdfFileId so they can retry the PIN without re-uploading.
      save(
        deps,
        { ...session, step: "awaiting_pdf_password", pendingPdfFileId: fileId },
        config,
      );
      return [
        reply(
          "That password did not open the PDF. Enter the statement password again (or choose Skip if it has none).",
          { removeKeyboard: true },
        ),
        pdfPasswordPrompt(),
      ];
    }
    save(
      deps,
      { ...session, step: "awaiting_import", pendingPdfFileId: null },
      config,
    );
    return [
      reply(`${message}\n\nTry again, paste SMS, or use the labeled demo.`, {
        removeKeyboard: true,
      }),
      importPrompt(),
    ];
  }
}

/**
 * Map reply-keyboard labels (and typed equivalents) to the same callback ids
 * the state machine already understands.
 */
function choiceToCallback(session: TelegramSession, text: string): string | null {
  const t = text.trim();

  if (t === "Start a small habit") return "path:habit";
  if (t === "Learn about Bitcoin") return "path:learn";
  if (t === "Ask something else" || t === "Back to menu") return "menu";
  if (t === "Skip" || t === "Skip (no password)") return "skip";
  if (t === "Demo Amina (labeled demo)") return "demo:amina";
  if (t === "Emergency buffer") return "goal:buffer";
  if (t === "Long-term saving") return "goal:long";
  if (t === "Set habit") return "habit";
  if (t === "Review investment") return "invest";
  if (t === "Show breakdown") return "breakdown";
  if (t === "Remind me on the 1st") return "remind";
  if (t === "Use 07…@bitcoin.co.ke") return "dest:bitcoincke";

  if (t === "Next" && session.step === "learn") {
    const next = (session.learnPage ?? 0) + 1;
    return `learn:${next}`;
  }

  if (t === "Yes") {
    if (session.step === "ask_debt") return "debt:yes";
    if (session.step === "ask_chama") return "chama:yes";
  }
  if (t === "No") {
    if (session.step === "ask_debt") return "debt:no";
    if (session.step === "ask_chama") return "chama:no";
  }

  if (session.step === "habit_cadence") {
    if (t === "Monthly") return "cadence:monthly";
    if (t === "Weekly") return "cadence:weekly";
  }

  if (session.step === "invest_confirm") {
    if (t === "Approve") return "approve";
    if (t === "Cancel") return "cancel_invest";
  }

  if (session.step === "invest_destination" && t === "Cancel") {
    return "cancel_invest";
  }

  return null;
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
    session = save(deps, newSession(chatId, deps.now(), config.sessionTtlMs, "menu"), config);
    return {
      replies: [startMenuReply()],
      callbackQueryId,
    };
  }

  if (!session) {
    session = save(deps, newSession(chatId, deps.now(), config.sessionTtlMs, "menu"), config);
    return {
      replies: [
        reply("Session started.", { removeKeyboard: true }),
        startMenuReply(),
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
          [
            "Commands: /start, /skip, /help.",
            "",
            "Paths after /start:",
            "• Start a small habit — optional questions → statement → summary → habit → reminder → review/approve.",
            "• Learn about Bitcoin — short education in chat (no statement, no purchase).",
            "",
            "Choices appear as your own messages (reply buttons). Send SMS paste or a PDF only when the habit path asks. You approve every purchase.",
          ].join("\n"),
        ),
      ],
      callbackQueryId,
    };
  }

  if (inbound.kind === "callback") {
    // Legacy inline buttons still in chat history — no bot "You chose" echo.
    const replies = await onCallback(session, inbound.data, deps, config);
    return {
      replies,
      callbackQueryId,
      callbackAnswerText: null,
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
    replies: [
      reply("Send /start to begin, or use the reply buttons.", {
        replyKeyboard: pathMenuKeyboard(),
      }),
    ],
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
  if (session.step === "ask_chama_name") {
    const onboarding: OnboardingAnswers = {
      ...session.onboarding,
      chamaMemberships: [],
    };
    save(deps, { ...session, onboarding, step: "ask_goal" }, config);
    return [reply("No chama details noted."), goalQuestion()];
  }
  if (session.step === "ask_chama_amount") {
    // Name already stored with contribution 0; Skip keeps that.
    save(deps, { ...session, step: "ask_goal" }, config);
    return [goalQuestion()];
  }
  if (session.step === "ask_goal") {
    save(deps, { ...session, step: "awaiting_import" }, config);
    return [importPrompt()];
  }
  if (session.step === "awaiting_pdf_password") {
    // Unprotected PDFs: try opening with an empty password (never persist it).
    return tryOpenPendingPdf(session, "", deps, config);
  }
  return [reply("Nothing to skip here. Send /start to begin again.")];
}

async function onCallback(
  session: TelegramSession,
  data: string,
  deps: TelegramDeps,
  config: TelegramConfig,
): Promise<TelegramReply[]> {
  if (data === "menu") {
    return showMenu(session, deps, config);
  }

  if (data === "path:habit") {
    return beginHabitPath(session, deps, config);
  }

  if (data === "path:learn" || data === "learn:0") {
    save(deps, { ...session, step: "learn", pendingPdfFileId: null, learnPage: 0 }, config);
    return [learnPageReply(0)];
  }

  if (data.startsWith("learn:")) {
    const page = Number(data.slice("learn:".length));
    if (!Number.isInteger(page) || page < 0 || page >= LEARN_PAGES.length) {
      return showMenu(session, deps, config);
    }
    save(deps, { ...session, step: "learn", learnPage: page }, config);
    return [learnPageReply(page)];
  }

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
    if (data === "chama:yes") {
      save(deps, { ...session, step: "ask_chama_name" }, config);
      return [chamaNameQuestion()];
    }
    const onboarding: OnboardingAnswers = {
      ...session.onboarding,
      chamaMemberships: [],
    };
    save(deps, { ...session, onboarding, step: "ask_goal" }, config);
    return [reply("No chama noted."), goalQuestion()];
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
    if (session.step === "menu" || session.step === "learn") {
      return [
        reply("Demo statements are part of the habit path. Pick Start a small habit first."),
        ...showMenu(session, deps, config),
      ];
    }
    const profile = structuredClone(demoProfiles.amina);
    return afterProfile(session, profile, deps, config, { isDemo: true });
  }

  if (!session.profile) {
    if (session.step === "menu" || session.step === "learn") {
      return showMenu(session, deps, config);
    }
    return [
      reply("Import a statement first, or choose Demo Amina."),
      importPrompt(),
    ];
  }

  if (data === "breakdown") {
    return [
      reply(breakdownText(session.profile), {
        replyKeyboard: readyButtons(session.profile),
      }),
    ];
  }

  if (data === "habit") {
    const offer = habitOffer(session.profile);
    if (!offer.ok) {
      return [
        reply(offer.reason, { replyKeyboard: readyButtons(session.profile) }),
      ];
    }
    save(deps, { ...session, step: "habit_amount" }, config);
    return [
      reply(
        `How much each time? Whole KES, up to ${offer.maxKes.toLocaleString("en-KE")} (the safe floor).`,
        { removeKeyboard: true },
      ),
    ];
  }

  if (data === "cadence:monthly" || data === "cadence:weekly") {
    if (session.step !== "habit_cadence" || !session.profile?.investmentPlan) {
      return [
        reply("Set the habit amount first."),
        ...(session.profile
          ? [
              reply(profileSummary(session.profile), {
                replyKeyboard: readyButtons(session.profile),
              }),
            ]
          : []),
      ];
    }
    const cadence = data === "cadence:weekly" ? "weekly" : "monthly";
    const amount = session.profile.investmentPlan.amountKes;
    const profile = planWithAmount(session.profile, amount, cadence);
    save(deps, { ...session, profile, step: "ready" }, config);
    return [
      reply(
        `Habit saved: KES ${amount.toLocaleString("en-KE")} / ${cadence}. Nothing is sent until you approve a purchase.`,
        { replyKeyboard: readyButtons(profile) },
      ),
    ];
  }

  if (data === "remind") {
    const plan = session.profile.investmentPlan;
    if (!plan) {
      return [
        reply("Save the habit first. The reminder uses that saved amount.", {
          replyKeyboard: readyButtons(session.profile),
        }),
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
        { replyKeyboard: readyButtons(session.profile) },
      ),
    ];
  }

  if (data === "invest") {
    const allowance = investAllowance(session.profile);
    if (!allowance.ok) {
      return [
        reply(allowance.reason, { replyKeyboard: readyButtons(session.profile) }),
      ];
    }
    if (!session.profile.investmentPlan?.amountKes) {
      return [
        reply("Save a habit amount first.", {
          replyKeyboard: readyButtons(session.profile),
        }),
      ];
    }
    if (!deps.bitikaConfigured()) {
      return [
        reply(
          "BITIKA_API_KEY is not configured on the server. Purchases stop here — same as the web app.",
          { replyKeyboard: readyButtons(session.profile) },
        ),
      ];
    }
    save(deps, { ...session, step: "invest_phone", purchasePhone: null, purchaseDestination: null }, config);
    return [
      reply(investReviewText(session.profile), { removeKeyboard: true }),
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
      reply("Cancelled. Nothing was sent.", {
        replyKeyboard: readyButtons(session.profile),
      }),
    ];
  }

  return [reply("Unknown action. Send /start or use the reply buttons.")];
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
        "Bitcoin can lose value. Send Approve only if you want to start this buy.",
      ].join("\n"),
      { replyKeyboard: [["Approve", "Cancel"]] },
    ),
  ];
}

async function runApprovedPurchase(
  session: TelegramSession,
  deps: TelegramDeps,
  config: TelegramConfig,
): Promise<TelegramReply[]> {
  if (!session.profile || !session.purchasePhone || !session.purchaseDestination) {
    return [reply("Missing purchase details. Choose Review investment again.")];
  }
  if (session.step !== "invest_confirm") {
    return [reply("Approve only from the confirm step. Nothing was sent.")];
  }
  if (!deps.bitikaConfigured()) {
    return [
      reply("BITIKA_API_KEY is not configured. Purchase stopped.", {
        replyKeyboard: readyButtons(session.profile),
      }),
    ];
  }

  const amountKes = session.profile.investmentPlan?.amountKes;
  if (!amountKes) {
    return [
      reply("Save a habit amount first.", {
        replyKeyboard: readyButtons(session.profile),
      }),
    ];
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
        { replyKeyboard: readyButtons(session.profile) },
      ),
    ];
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not start the purchase.";
    return [
      reply(message, { replyKeyboard: readyButtons(session.profile) }),
    ];
  }
}

async function onDocument(
  session: TelegramSession,
  inbound: Extract<TelegramInbound, { kind: "document" }>,
  deps: TelegramDeps,
  config: TelegramConfig,
): Promise<TelegramReply[]> {
  if (session.step === "menu" || session.step === "learn") {
    return [
      reply(
        "Learning and the menu do not need a statement. Choose Start a small habit when you want to import.",
        { replyKeyboard: pathMenuKeyboard() },
      ),
    ];
  }
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
    reply("PDF received.", { removeKeyboard: true }),
    pdfPasswordPrompt(),
  ];
}

async function onText(
  session: TelegramSession,
  text: string,
  deps: TelegramDeps,
  config: TelegramConfig,
): Promise<TelegramReply[]> {
  const choice = choiceToCallback(session, text);
  if (choice) {
    return onCallback(session, choice, deps, config);
  }

  if (session.step === "menu") {
    return showMenu(session, deps, config);
  }

  if (session.step === "learn") {
    return [
      reply(
        "You're in the learning path — no statement or purchase from here. Choose Next, or use the buttons below.",
        { replyKeyboard: learnEndKeyboard() },
      ),
    ];
  }

  if (session.step === "ask_debt") {
    return [debtQuestion()];
  }

  if (session.step === "ask_chama") {
    return [chamaQuestion()];
  }

  if (session.step === "ask_goal") {
    return [goalQuestion()];
  }

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
        reply("Send a whole number of shillings, with no decimals. Or choose Skip.", {
          replyKeyboard: [["Skip"]],
        }),
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

  if (session.step === "ask_chama_name") {
    const name = text.trim();
    if (!name) {
      return [chamaNameQuestion()];
    }
    const onboarding: OnboardingAnswers = {
      ...session.onboarding,
      chamaMemberships: [{ name, monthlyContributionKes: 0, kind: "other" }],
    };
    save(deps, { ...session, onboarding, step: "ask_chama_amount" }, config);
    return [chamaAmountQuestion(name)];
  }

  if (session.step === "ask_chama_amount") {
    const amount = parseWholeKes(text);
    if (amount === null) {
      return [
        reply("Send a whole number of shillings, with no decimals. Or choose Skip.", {
          replyKeyboard: [["Skip"]],
        }),
      ];
    }
    const existing = session.onboarding.chamaMemberships[0];
    const name = existing?.name ?? "Chama";
    const onboarding: OnboardingAnswers = {
      ...session.onboarding,
      chamaMemberships: [{ name, monthlyContributionKes: amount, kind: "other" }],
    };
    save(deps, { ...session, onboarding, step: "ask_goal" }, config);
    return [
      reply(`Noted: ${name} — KES ${amount.toLocaleString("en-KE")}/month.`),
      goalQuestion(),
    ];
  }

  if (session.step === "awaiting_pdf_password") {
    // Password is only in this request scope — never written to the session.
    return tryOpenPendingPdf(session, text, deps, config);
  }

  if (session.step === "awaiting_import" || (session.step === "ready" && looksLikeSms(text))) {
    try {
      const profile = deps.buildFromSms(text, session.onboarding);
      return afterProfile(session, profile, deps, config);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not read those messages.";
      return [
        reply(`${message}\n\nTry a fuller paste, a PDF, or Demo Amina.`, {
          removeKeyboard: true,
        }),
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
      return [
        reply(offer.reason, { replyKeyboard: readyButtons(session.profile) }),
      ];
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
      reply("Monthly is the default. Weekly is optional.", {
        replyKeyboard: [["Monthly", "Weekly"]],
      }),
    ];
  }

  if (session.step === "habit_cadence") {
    return [
      reply("Monthly is the default. Weekly is optional.", {
        replyKeyboard: [["Monthly", "Weekly"]],
      }),
    ];
  }

  if (session.step === "invest_phone") {
    try {
      const phone = toBitikaPhone(text);
      save(deps, { ...session, purchasePhone: phone, step: "invest_destination" }, config);
      return [
        reply("Send a Lightning address (you@host), or use bitcoin.co.ke from this phone.", {
          replyKeyboard: [["Use 07…@bitcoin.co.ke"], ["Cancel"]],
        }),
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
        reply(error instanceof Error ? error.message : "Enter a Lightning address.", {
          replyKeyboard: [["Use 07…@bitcoin.co.ke"], ["Cancel"]],
        }),
      ];
    }
  }

  if (session.step === "invest_confirm") {
    return confirmButtons(
      session.profile,
      session.purchasePhone ?? "",
      session.purchaseDestination ?? "",
    );
  }

  if (session.profile) {
    return [
      reply(profileSummary(session.profile), {
        replyKeyboard: readyButtons(session.profile),
      }),
    ];
  }

  return [importPrompt()];
}

function looksLikeSms(text: string): boolean {
  return /confirmed|m-pesa|mpesa|ksh/i.test(text) && text.length > 40;
}

/** Exported for unit tests that drive the state machine without Telegram HTTP. */
export const __testOnly = {
  START_COPY,
  LEARN_PAGES,
  debtQuestion,
  importPrompt,
  pdfPasswordPrompt,
  afterProfile,
  pathMenuKeyboard,
};

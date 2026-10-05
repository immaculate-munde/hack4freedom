import type { LearnTopic } from "./types";

/**
 * Interactive Bitcoin education topics.
 * Tone: warm, clear, East Africa–aware where relevant. No return promises.
 */
export const LEARN_TOPICS: LearnTopic[] = [
  {
    id: "what-is-bitcoin",
    level: "beginner",
    title: "What is Bitcoin?",
    summary: "Money on the internet that you can hold yourself — no bank in the middle.",
    commonQuestion: "People ask: what even is Bitcoin?",
    sourceIds: ["bitcoinOrg", "whitepaper"],
    beats: [
      {
        id: "wib-q",
        question: "What even is Bitcoin?",
        sensiSays:
          "Habari — I'm Sensi. Bitcoin is digital money that moves on a shared public network. No single bank or company runs it.",
        body: "Think of it as a way to send value to someone else without asking a middle person to approve the transfer.",
        imageKey: "sensi-ask",
        imageAlt: "Sensi asking a common question about Bitcoin",
      },
      {
        id: "wib-explain",
        sensiSays:
          "The Bitcoin whitepaper (2008) described peer-to-peer electronic cash — people sending value directly to each other.",
        body: "There will only ever be 21 million bitcoin. That fixed supply is part of the design. The price still moves a lot day to day.",
        imageKey: "bitcoin",
        imageAlt: "Simple illustration of the Bitcoin network",
      },
      {
        id: "wib-check",
        question: "Quick check",
        sensiSays: "Which sentence is closest to the idea?",
        imageKey: "sensi-think",
        imageAlt: "Sensi thinking through a check question",
        choices: [
          {
            id: "a",
            label: "Bitcoin is run by one bank that can print more anytime",
            correct: false,
            feedback:
              "Not quite. No single bank runs Bitcoin, and new coins follow fixed rules — not a manager's decision.",
          },
          {
            id: "b",
            label: "Bitcoin is digital money on a shared network you can hold yourself",
            correct: true,
            feedback:
              "Yes. It is digital money on a public network. You can hold it yourself with a wallet you control.",
          },
          {
            id: "c",
            label: "Bitcoin always goes up in value",
            correct: false,
            feedback:
              "No — the price moves both ways. Education is not a promise of gains.",
          },
        ],
      },
    ],
  },
  {
    id: "why-save-bitcoin",
    level: "beginner",
    title: "Why do people save in Bitcoin?",
    summary: "Why some people set aside a little for years — and why that is not a guarantee.",
    commonQuestion: "People ask: why would anyone save in Bitcoin?",
    sourceIds: ["bitcoinOrg", "bisCbdcs"],
    beats: [
      {
        id: "wsb-q",
        question: "Why do people save in Bitcoin at all?",
        sensiSays:
          "Some people like that Bitcoin is scarce, portable, and not controlled by one local institution.",
        body: "Others want a long-term option separate from day-to-day M-Pesa spending. That is a preference — not a rule you must follow.",
        imageKey: "sensi-ask",
        imageAlt: "Sensi introducing why people save in Bitcoin",
      },
      {
        id: "wsb-explain",
        sensiSays:
          "The same features that attract savers also come with risk: the value can fall sharply.",
        body: "Institutions that study crypto markets often stress volatility and consumer protection. A patient habit only makes sense for money you can leave alone for years.",
        imageKey: "bitcoin",
        imageAlt: "Illustration of long-term saving versus short-term needs",
      },
      {
        id: "wsb-check",
        question: "Quick check",
        sensiSays: "When might Bitcoin be a poor fit?",
        imageKey: "sensi-think",
        imageAlt: "Sensi checking understanding about time horizon",
        choices: [
          {
            id: "a",
            label: "Money you need for next week's rent",
            correct: true,
            feedback:
              "Right. Short-term needs belong in a safer cushion — not in something that can drop quickly.",
          },
          {
            id: "b",
            label: "Money you can leave alone for several years",
            correct: false,
            feedback:
              "That longer horizon is closer to how patient savers think about it — but value can still fall.",
          },
          {
            id: "c",
            label: "Money you expect to double next month",
            correct: false,
            feedback:
              "Expecting quick gains is speculation. This learning path does not promise returns.",
          },
        ],
      },
    ],
  },
  {
    id: "wallets-and-keys",
    level: "beginner",
    title: "Wallets & keys",
    summary: "Your wallet holds keys — not coins in a drawer. Protect the recovery words.",
    commonQuestion: "People ask: what is a wallet, really?",
    sourceIds: ["bitcoinOrgVocab", "bitcoinOrgProtect"],
    beats: [
      {
        id: "wak-q",
        question: "What is a Bitcoin wallet?",
        sensiSays:
          "A wallet is software (or hardware) that holds your keys. The bitcoin lives on the network; the keys prove it is yours.",
        body: "If someone else gets your keys or recovery words, they can take the bitcoin. PesaSense never asks for those words.",
        imageKey: "sensi-ask",
        imageAlt: "Sensi explaining wallets",
      },
      {
        id: "wak-explain",
        sensiSays:
          "Recovery words (a seed phrase) are the backup. Write them down offline. Never share them in chat, SMS, or email.",
        body: "Self-custody means you hold the keys. That freedom also means you are responsible for backups.",
        imageKey: "keys",
        imageAlt: "Illustration of keys and recovery words",
      },
      {
        id: "wak-check",
        question: "Quick check",
        sensiSays: "Someone messages you: “Send your 12 words to unlock a bonus.” What do you do?",
        imageKey: "sensi-think",
        imageAlt: "Sensi warning about recovery-word scams",
        choices: [
          {
            id: "a",
            label: "Send the words — it might be official support",
            correct: false,
            feedback:
              "Never. Real support does not need your recovery words. Anyone with them can empty the wallet.",
          },
          {
            id: "b",
            label: "Ignore it and keep the words offline",
            correct: true,
            feedback:
              "Yes. Keep recovery words offline and private. No bonus is worth losing your bitcoin.",
          },
          {
            id: "c",
            label: "Take a photo and store it in WhatsApp",
            correct: false,
            feedback:
              "Cloud chats are easy to leak. Prefer pen and paper in a safe place you control.",
          },
        ],
      },
    ],
  },
  {
    id: "sats-and-small-amounts",
    level: "beginner",
    title: "Sats & small amounts",
    summary: "You can start small. A satoshi is a tiny piece of a bitcoin.",
    commonQuestion: "People ask: do I need a whole bitcoin?",
    sourceIds: ["bitcoinOrgVocab", "bitcoinOrg"],
    beats: [
      {
        id: "sas-q",
        question: "Do I need a whole bitcoin?",
        sensiSays:
          "No. One bitcoin divides into 100 million satoshis — often called sats. People commonly buy small amounts.",
        body: "In Kenya, a habit might be a few hundred shillings at a time — converted to sats when you buy. Whole shillings only in PesaSense.",
        imageKey: "sensi-ask",
        imageAlt: "Sensi explaining sats",
      },
      {
        id: "sas-explain",
        sensiSays:
          "Small amounts still move with the market. Tiny does not mean risk-free.",
        body: "Starting small can help you learn the steps — wallet, buy, confirm — without stretching money meant for bills.",
        imageKey: "sats",
        imageAlt: "Illustration of sats as small pieces of bitcoin",
      },
      {
        id: "sas-check",
        question: "Quick check",
        sensiSays: "Which statement is true?",
        imageKey: "sensi-yes",
        imageAlt: "Sensi confirming a sats fact",
        choices: [
          {
            id: "a",
            label: "You must buy a full bitcoin to get started",
            correct: false,
            feedback: "False. Bitcoin is divisible; sats let people hold small amounts.",
          },
          {
            id: "b",
            label: "Sats are small pieces of a bitcoin",
            correct: true,
            feedback: "Correct — sats are the small units of bitcoin.",
          },
          {
            id: "c",
            label: "Small buys cannot lose value",
            correct: false,
            feedback: "Size does not remove market risk. Value can still fall.",
          },
        ],
      },
    ],
  },
  {
    id: "lightning-sending",
    level: "intermediate",
    title: "Lightning & sending",
    summary: "Lightning is a faster way to send bitcoin for everyday payments.",
    commonQuestion: "People ask: what is Lightning?",
    sourceIds: ["lightningDev", "bitcoinOrg"],
    beats: [
      {
        id: "ls-q",
        question: "What is the Lightning Network?",
        sensiSays:
          "Lightning is a payment layer built on Bitcoin. It is designed for faster, smaller payments than waiting on every on-chain confirmation.",
        body: "In PesaSense, buys can go to a Lightning address you control — for example an address you set up yourself.",
        imageKey: "sensi-ask",
        imageAlt: "Sensi introducing Lightning",
      },
      {
        id: "ls-explain",
        sensiSays:
          "You still approve each purchase. A reminder on the 1st only asks you to check — it does not send M-Pesa or bitcoin by itself.",
        body: "Always double-check the destination address before you approve. Sending to the wrong place is usually irreversible.",
        imageKey: "lightning",
        imageAlt: "Illustration of Lightning payments",
      },
      {
        id: "ls-check",
        question: "Quick check",
        sensiSays: "A reminder pops up on the 1st. What does it mean?",
        imageKey: "sensi-think",
        imageAlt: "Sensi clarifying reminders versus automatic sends",
        choices: [
          {
            id: "a",
            label: "M-Pesa and bitcoin already left automatically",
            correct: false,
            feedback:
              "No. Reminders ask you to check. You approve each purchase yourself.",
          },
          {
            id: "b",
            label: "It is a nudge to review — nothing sends on its own",
            correct: true,
            feedback:
              "Yes. You stay in control. Nothing sends without your approval.",
          },
          {
            id: "c",
            label: "Lightning means there is no risk",
            correct: false,
            feedback:
              "Lightning changes how payments move. It does not remove market or user-error risk.",
          },
        ],
      },
    ],
  },
  {
    id: "risks-and-scams",
    level: "beginner",
    title: "Risks & scams",
    summary: "Price can fall. Scams often promise certainty or ask for your words.",
    commonQuestion: "People ask: how do people get tricked?",
    sourceIds: ["bitcoinOrgProtect", "bitcoinOrg"],
    beats: [
      {
        id: "ras-q",
        question: "What should I watch for?",
        sensiSays:
          "Two big themes: market risk (value can fall) and scams (someone trying to take your money or keys).",
        body: "Guaranteed returns, “I will trade for you,” and anyone asking for recovery words are classic red flags.",
        imageKey: "sensi-ask",
        imageAlt: "Sensi warning about risks and scams",
      },
      {
        id: "ras-explain",
        sensiSays:
          "Real Bitcoin has no special manager who can guarantee profit. If it sounds too certain, pause.",
        body: "Also protect yourself: never share seed phrases, and do not rush because a stranger creates urgency.",
        imageKey: "shield",
        imageAlt: "Illustration of scam warning signs",
      },
      {
        id: "ras-check",
        question: "Quick check",
        sensiSays: "Which is a scam flag?",
        imageKey: "sensi-think",
        imageAlt: "Sensi checking scam recognition",
        choices: [
          {
            id: "a",
            label: "“Guaranteed 30% every month — just send me your coins”",
            correct: true,
            feedback:
              "Yes. Guaranteed returns plus sending coins to someone else is a hard stop.",
          },
          {
            id: "b",
            label: "“Write your recovery words on paper and store them safely offline”",
            correct: false,
            feedback:
              "That is normal security advice — as long as nobody else sees the words.",
          },
          {
            id: "c",
            label: "“Bitcoin can lose value; take your time”",
            correct: false,
            feedback:
              "That is honest education, not a scam pitch.",
          },
        ],
      },
    ],
  },
  {
    id: "habit-to-invest",
    level: "intermediate",
    title: "Habit → invest (PesaSense)",
    summary: "How PesaSense turns a money picture into an optional small Bitcoin habit.",
    commonQuestion: "People ask: how does PesaSense fit in?",
    sourceIds: ["bitcoinOrg"],
    beats: [
      {
        id: "hti-q",
        question: "How does PesaSense relate to learning Bitcoin?",
        sensiSays:
          "First we help you see money left after bills — a careful picture from your M-Pesa history and a few questions.",
        body: "Then you may choose a small habit amount in whole shillings. Learning here does not start a purchase.",
        imageKey: "sensi",
        imageAlt: "Sensi explaining the PesaSense path",
      },
      {
        id: "hti-explain",
        sensiSays:
          "A habit is a plan you revisit — not a fund and not an automatic buy. You approve every purchase.",
        body: "Many people build an emergency cushion first. Bitcoin is for money you can leave alone, not for next week's rent.",
        imageKey: "habit",
        imageAlt: "Illustration of habit then invest steps",
      },
      {
        id: "hti-check",
        question: "Quick check",
        sensiSays: "What does setting a habit in PesaSense mean?",
        imageKey: "sensi-yes",
        imageAlt: "Sensi confirming habit meaning",
        choices: [
          {
            id: "a",
            label: "Bitcoin buys start sending by themselves every day",
            correct: false,
            feedback:
              "No. You approve each purchase. Reminders do not send money on their own.",
          },
          {
            id: "b",
            label: "You plan a small amount; purchases still need your OK",
            correct: true,
            feedback:
              "Exactly. Education and planning first — you stay in control of every buy.",
          },
          {
            id: "c",
            label: "PesaSense promises your bitcoin will grow",
            correct: false,
            feedback:
              "We never promise growth. This is education, not financial advice.",
          },
        ],
      },
    ],
  },
];

export function getLearnTopic(id: string): LearnTopic | undefined {
  return LEARN_TOPICS.find((topic) => topic.id === id);
}

export function listLearnTopicsByLevel(level?: LearnTopic["level"]): LearnTopic[] {
  if (!level) return LEARN_TOPICS;
  return LEARN_TOPICS.filter((topic) => topic.level === level);
}

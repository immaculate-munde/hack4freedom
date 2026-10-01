"use client";

import { useRouter } from "next/navigation";
import { RegulatoryDisclosure } from "../../components/regulatory-disclosure";

function ShieldLargeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="h-8 w-8 text-pine"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="h-5 w-5 text-moss"
    >
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="h-5 w-5 text-moss"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="h-5 w-5 text-moss"
    >
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="M21 2L11.5 11.5" />
      <path d="M15 6l4 4" />
    </svg>
  );
}

const PROMISES = [
  {
    Icon: PhoneIcon,
    heading: "Your data stays on your phone",
    body: "Your M-Pesa history is read and analysed on this device only. It is never uploaded to our servers.",
  },
  {
    Icon: CheckCircleIcon,
    heading: "No hidden fees or commissions",
    body: "PesaSense earns nothing from your purchases. We will always tell you exactly what a transaction costs before you confirm it.",
  },
  {
    Icon: KeyIcon,
    heading: "You control your money",
    body: "Any Bitcoin you buy goes straight to a wallet that only you hold the keys to. We cannot access or freeze it.",
  },
] as const;

export default function WelcomePage() {
  const router = useRouter();

  function proceed() {
    localStorage.setItem("hasSeenWelcome", "true");
    router.push("/");
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-paper">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 120% 60% at 50% 0%, rgb(31 77 58 / 10%), transparent 55%), radial-gradient(ellipse 80% 50% at 100% 100%, rgb(140 106 47 / 7%), transparent 50%)",
        }}
      />

      <div className="relative mx-auto flex min-h-full max-w-lg flex-col px-5 py-10 sm:px-8 sm:py-14">
        <header className="flex flex-col items-center text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-pine/10">
            <ShieldLargeIcon />
          </span>

          <h1 className="mt-6 font-serif text-4xl tracking-tight text-pine sm:text-5xl">
            Grow your money, safely.
          </h1>

          <p className="mt-4 max-w-sm text-base leading-7 text-ink/70">
            PesaSense reads your M-Pesa history privately, shows you what you
            can safely set aside, and helps you start a small, steady savings
            habit.
          </p>
        </header>

        <section aria-label="Our promises to you" className="mt-10 space-y-4">
          <p className="text-xs font-semibold tracking-widest text-moss uppercase">
            Our promises to you
          </p>

          {PROMISES.map(({ Icon, heading, body }) => (
            <div
              key={heading}
              className="flex items-start gap-4 rounded-2xl border border-sand bg-white/70 p-4 shadow-sm"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-moss/10">
                <Icon />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">{heading}</p>
                <p className="mt-1 text-sm leading-6 text-ink/65">{body}</p>
              </div>
            </div>
          ))}
        </section>

        <div className="mt-8">
          <RegulatoryDisclosure variant="full" />
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            id="welcome-get-started"
            onClick={proceed}
            className="btn btn-primary w-full py-4 text-base"
          >
            Get Started
          </button>

          <button
            type="button"
            id="welcome-exploring"
            onClick={proceed}
            className="btn btn-ghost w-full py-2 text-sm"
          >
            I&apos;m just exploring
          </button>
        </div>

        <footer className="mt-10 text-center text-[11px] leading-5 text-ink/40">
          PesaSense &nbsp;·&nbsp; Education, not financial advice
        </footer>
      </div>
    </div>
  );
}

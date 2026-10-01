"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SavingsLadder } from "../../components/savings-ladder";
import { ScenarioChart } from "../../components/scenario-chart";

// Mock data for the UI
const MOCK_BUFFER_MONTHS = 1.5;
const MOCK_CURRENT_STEP = 1;
const MOCK_SURPLUS_FLOOR = 1500;

export default function LearnPage() {
  const router = useRouter();
  const [amount, setAmount] = useState<string>("500");
  const [cadence, setCadence] = useState<"weekly" | "monthly">("monthly");
  const [error, setError] = useState<string | null>(null);

  const handleStartSaving = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    
    if (isNaN(num) || num <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    
    if (num > MOCK_SURPLUS_FLOOR) {
      setError(`Amount cannot exceed your safe surplus of KES ${MOCK_SURPLUS_FLOOR}.`);
      return;
    }
    
    setError(null);
    router.push("/invest");
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-12 pb-20 pt-6">
      <header>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-pine sm:text-4xl">
          Learn &amp; Grow Your Money
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink/75">
          Your path to building a secure, long-term financial habit.
        </p>
      </header>

      {/* Savings Ladder Section */}
      <section aria-labelledby="ladder-heading">
        <h2 id="ladder-heading" className="mb-5 font-serif text-2xl font-semibold text-pine">
          Your Savings Journey
        </h2>
        <SavingsLadder currentStep={MOCK_CURRENT_STEP} bufferMonths={MOCK_BUFFER_MONTHS} />
      </section>

      {/* Education Cards */}
      <section aria-labelledby="education-heading" className="space-y-4">
        <h2 id="education-heading" className="mb-5 font-serif text-2xl font-semibold text-pine">
          Bitcoin Basics
        </h2>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-sand bg-paper p-5 shadow-sm">
            <h3 className="font-semibold text-moss">What is Bitcoin?</h3>
            <p className="mt-2 text-sm leading-6 text-ink/80">
              It is digital money that you can hold yourself. There is no central bank, manager, or admin. It is built for long-term saving, not getting rich quick.
            </p>
          </div>
          
          <div className="rounded-2xl border border-sand bg-paper p-5 shadow-sm">
            <h3 className="font-semibold text-moss">Volatility</h3>
            <p className="mt-2 text-sm leading-6 text-ink/80">
              The price goes up and down, sometimes by a lot. This is normal. You protect yourself by holding for years and only saving what you can afford to leave alone.
            </p>
          </div>

          <div className="rounded-2xl border border-sand bg-paper p-5 shadow-sm sm:col-span-2">
            <h3 className="font-semibold text-moss">Not a trading app</h3>
            <p className="mt-2 text-sm leading-6 text-ink/80">
              PesaSense is here to help you save steadily over time. We do not support day trading, gambling, or borrowing against your savings.
            </p>
          </div>
        </div>
      </section>

      {/* Scam Warning */}
      <section>
        <div className="rounded-2xl border-2 border-red-800/20 bg-red-50 p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="mt-0.5 h-6 w-6 shrink-0 text-red-700"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="font-bold text-red-900">Security Warning</h3>
              <p className="mt-1 text-sm leading-6 text-red-800/90">
                Never share your 12-word seed phrase with anyone. Anyone who has those words can steal your money. PesaSense will never ask for them.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Forecast Chart Section */}
      <section aria-labelledby="forecast-heading">
        <h2 id="forecast-heading" className="mb-5 font-serif text-2xl font-semibold text-pine">
          What could happen to your savings?
        </h2>
        <ScenarioChart />
      </section>

      {/* Recurring Savings Setup */}
      <section aria-labelledby="setup-heading">
        <div className="rounded-3xl border border-sand bg-white/70 p-6 shadow-sm sm:p-8">
          <h2 id="setup-heading" className="font-serif text-2xl font-semibold text-pine">
            Start Saving
          </h2>
          <p className="mt-2 text-sm text-ink/75">
            Set up a steady habit based on your available surplus.
          </p>

          <form onSubmit={handleStartSaving} className="mt-8 space-y-6">
            <div>
              <label htmlFor="amount" className="block text-sm font-semibold text-ink">
                Amount (KES)
              </label>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-sm font-bold text-ink/50">KES</span>
                <input
                  id="amount"
                  type="number"
                  inputMode="numeric"
                  className="field max-w-[200px]"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 500"
                />
              </div>
              <p className="mt-2 text-xs text-ink/60">
                You can safely save up to <span className="font-semibold text-ink/80">KES {MOCK_SURPLUS_FLOOR}</span>.
              </p>
            </div>

            <div>
              <span className="block text-sm font-semibold text-ink">Frequency</span>
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setCadence("weekly")}
                  className={`flex-1 rounded-xl border py-3 text-sm font-semibold transition-colors ${
                    cadence === "weekly"
                      ? "border-pine bg-pine text-paper"
                      : "border-sand bg-paper text-ink hover:bg-sand/30"
                  }`}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setCadence("monthly")}
                  className={`flex-1 rounded-xl border py-3 text-sm font-semibold transition-colors ${
                    cadence === "monthly"
                      ? "border-pine bg-pine text-paper"
                      : "border-sand bg-paper text-ink hover:bg-sand/30"
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm font-semibold text-red-700" role="alert">
                {error}
              </p>
            )}

            <div className="pt-2">
              <button type="submit" className="btn btn-primary w-full py-4 text-base shadow-sm">
                Start Saving
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

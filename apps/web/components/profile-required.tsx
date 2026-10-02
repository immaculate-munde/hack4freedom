import Link from "next/link";

/** Shown when PROFILE_SOURCE=parsed and no profile is stored on this device yet. */
export function ProfileRequired() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <section className="card space-y-3">
        <h1 className="text-2xl font-semibold text-ink">No profile on this phone yet</h1>
        <p className="text-sm leading-6 text-slate">
          Demo personas are turned off. Paste your M-Pesa SMS on the import screen. The
          profile is built on this device and saved here — there is no separate profile
          server.
        </p>
        <Link href="/onboard" className="btn btn-primary inline-flex justify-center">
          Import M-Pesa messages
        </Link>
        <Link href="/onboarding" className="btn btn-ghost text-center text-sm">
          Answer onboarding questions first
        </Link>
      </section>
    </main>
  );
}

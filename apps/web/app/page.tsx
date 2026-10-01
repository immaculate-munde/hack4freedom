/**
 * Home.
 * After the first visit, the designed entry is the overview.
 * The welcome gate still runs for someone who has not tapped through.
 */
import { redirect } from "next/navigation";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ profile?: string }>;
}) {
  const params = await searchParams;
  const query = params.profile === "brian" ? "?profile=brian" : "";
  redirect(`/overview${query}`);
}

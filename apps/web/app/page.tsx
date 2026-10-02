/**
 * Home.
 * The landing page is the front door. A judge link with ?profile=brian
 * still opens that profile on the overview.
 */
import { redirect } from "next/navigation";
import { LandingPage } from "../components/landing-page";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ profile?: string }>;
}) {
  const params = await searchParams;
  if (params.profile === "brian") {
    redirect("/overview?profile=brian");
  }
  return <LandingPage />;
}

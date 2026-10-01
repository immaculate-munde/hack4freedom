/**
 * Trust screen.
 *
 * A short notice. The longer regulation page can grow here later.
 * Licensing lines in the notice are marked to verify in that component.
 */
import { PageFrame } from "../../components/page-frame";
import { RegulatoryDisclosure } from "../../components/regulatory-disclosure";

export default function TrustPage() {
  return (
    <PageFrame
      title="Who regulates what"
      description="What PesaSense is, and what it is not."
      backHref="/welcome"
      backLabel="Back to welcome"
    >
      <RegulatoryDisclosure />
    </PageFrame>
  );
}

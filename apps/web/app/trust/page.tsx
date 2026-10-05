"use client";

/**
 * Trust screen.
 *
 * A short notice. The longer regulation page can grow here later.
 * Licensing lines in the notice are marked to verify in that component.
 */
import { PageFrame } from "../../components/page-frame";
import { RegulatoryDisclosure } from "../../components/regulatory-disclosure";
import { useI18n } from "../../contexts/language-context";

export default function TrustPage() {
  const { t } = useI18n();
  return (
    <PageFrame
      title={t("trust.title")}
      description={t("trust.description")}
      backHref="/welcome"
      backLabel={t("trust.back")}
    >
      <RegulatoryDisclosure />
    </PageFrame>
  );
}

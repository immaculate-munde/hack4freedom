"use client";

import { useI18n } from "../contexts/language-context";

export function ShareImportHint({ className }: { className?: string }) {
  const { t } = useI18n();
  return <p className={className ?? "text-xs leading-5 text-ink-soft"}>{t("import.share.hint")}</p>;
}

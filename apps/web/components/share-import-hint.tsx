"use client";

import { useI18n } from "../contexts/language-context";

export function ShareImportHint({ className }: { className?: string }) {
  const { t } = useI18n();
  return <p className={className ?? "text-xs leading-5 text-ink/65"}>{t("import.share.hint")}</p>;
}

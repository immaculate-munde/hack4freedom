"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useI18n } from "../contexts/language-context";

/** Consistent page title block for Surplus, Invest, Wallet. */
export function PageFrame({
  title,
  description,
  backHref,
  backLabel,
  children,
  aside,
}: {
  title: string;
  description?: ReactNode;
  backHref?: string;
  backLabel?: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <main className="page-frame pb-24 md:pb-0">
      <div className="page-frame-primary">
        {backHref ? (
          <Link href={backHref} className="btn btn-ghost mb-2 inline-flex lg:hidden">
            {backLabel ?? t("common.back")}
          </Link>
        ) : null}
        <h1 className="page-title">{title}</h1>
        {description ? <div className="page-lead">{description}</div> : null}
        <div className="page-body">{children}</div>
      </div>
      {aside ? <div className="page-frame-aside">{aside}</div> : null}
    </main>
  );
}

"use client";

import { useState } from "react";
import { useI18n } from "../contexts/language-context";
import { ImportMpesaModal } from "./import-mpesa-modal";

export function ImportTrigger() {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="action-row">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="btn btn-primary"
          id="import-trigger-pdf"
        >
          {t("import.statement")}
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="btn btn-secondary"
          id="import-trigger-sms"
        >
          {t("import.pasteInstead")}
        </button>
      </div>
      <ImportMpesaModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

"use client";

import { useState } from "react";
import { ImportMpesaModal } from "./import-mpesa-modal";

export function ImportTrigger() {
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
          Import M-Pesa statement
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="btn btn-secondary"
          id="import-trigger-sms"
        >
          Paste messages instead
        </button>
      </div>
      <ImportMpesaModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

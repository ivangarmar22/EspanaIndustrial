"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-rule-strong bg-card px-4 text-sm hover:border-ink"
    >
      {copied ? (
        <Check className="size-4 text-ok" aria-hidden="true" />
      ) : (
        <Copy className="size-4" aria-hidden="true" />
      )}
      {copied ? "Copiado" : label}
      <span className="sr-only" role="status">
        {copied ? "Copiado al portapapeles" : ""}
      </span>
    </button>
  );
}

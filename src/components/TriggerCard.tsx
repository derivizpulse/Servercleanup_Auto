// CareFlow — Trigger explainer card (read-only: events originate outside this cleanup view)

import { cn } from "../lib/cn";
import { useState, type ReactNode } from "react";

export function TriggerCard({
  title,
  description,
  systemSteps,
  lastFired,
  inScopeCount,
  readOnlyNote,
  onFire,
  onFireLabel = "Run",
  afterFire,
  className,
}: {
  title: string;
  description: ReactNode;
  /** What Deriviz does when the external system signals this trigger */
  systemSteps: string[];
  lastFired: string | null;
  /** DB rows currently matching this trigger’s rules (exclusions apply in Overview actions) */
  inScopeCount: number;
  readOnlyNote: string;
  onFire?: () => void;
  onFireLabel?: string;
  afterFire?: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(true);
  const manual = typeof onFire === "function";

  return (
    <div className={cn("c-card flex flex-col", className)}>
      <div className="c-card-header">{title}</div>

      <div className="flex flex-col gap-3 p-3">
        <p className="text-[12px] leading-relaxed" style={{ color: "#5D6F7E" }}>
          {description}
        </p>

        <div
          className="rounded-[4px] border px-3 py-2.5"
          style={{ borderColor: "#D9E7EA", background: "#F4FAFB" }}
        >
          <p
            className="mb-2 text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "#007A8F" }}
          >
            When the signal is received, Deriviz applies this
          </p>
          <ol
            className="list-decimal space-y-1.5 pl-4 text-[12px] leading-relaxed"
            style={{ color: "#354756" }}
          >
            {systemSteps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>

        <div
          className="flex flex-wrap gap-4 rounded-[3px] border px-3 py-2 text-[11px]"
          style={{ borderColor: "#ECEFF2", background: "#F7F8FA" }}
        >
          <span style={{ color: "#96A3AF" }}>
            Last event from upstream:{" "}
            <span className="font-medium" style={{ color: "#354756" }}>
              {lastFired ? new Date(lastFired).toLocaleString() : "— (none in prototype session)"}
            </span>
          </span>
          <span style={{ color: "#96A3AF" }}>
            In scope:{" "}
            <span className="font-medium" style={{ color: "#354756" }}>
              {inScopeCount} DB{inScopeCount === 1 ? "" : "s"}
            </span>
          </span>
        </div>

        {manual ? (
          <button type="button" onClick={onFire} className="c-btn-primary self-start">
            {onFireLabel}
          </button>
        ) : (
          <p
            className="rounded-[3px] border px-3 py-2.5 text-[11px] leading-relaxed"
            style={{
              borderColor: "#C9D1DA",
              background: "#FAFBFC",
              color: "#5D6F7E",
            }}
          >
            {readOnlyNote}
          </p>
        )}
      </div>

      {afterFire && (
        <div
          className="border-t px-3 py-3"
          style={{ borderColor: "#ECEFF2" }}
        >
          <button
            type="button"
            className="mb-2 text-[11px] font-medium hover:underline focus:outline-none"
            style={{ color: "#007A8F" }}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "▾ Hide" : "▸ Show"} databases in scope
          </button>
          {open && (
            <div className="text-[12px]" style={{ color: "#354756" }}>
              {afterFire}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

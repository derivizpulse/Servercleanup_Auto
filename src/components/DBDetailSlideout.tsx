// CareFlow Design System — DB Detail Slideout panel
// Uses CareFlow modal shadow, header bg (#F7F8FA), border (#ECEFF2),
// body white, form label pattern, primary button token

import { useActivityForDb, useDerivizStore } from "../store/useDerivizStore";
import { ClassificationBadge, AutoBackedUpBadge } from "./Badge";
import { Toggle } from "./Toggle";
import { formatShortDate } from "../lib/classify";

const overrides: { value: "Retain" | "Delete" | "Backup & Delete"; label: string }[] = [
  { value: "Retain",          label: "Retain" },
  { value: "Delete",          label: "Delete" },
  { value: "Backup & Delete", label: "Backup & Delete" },
];

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-[2px]">
      <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "#96A3AF" }}>
        {label}
      </span>
      <span className="text-[12px]" style={{ color: "#354756" }}>{value}</span>
    </div>
  );
}

export function DBDetailSlideout({ dbId, onClose }: { dbId: string | null; onClose: () => void }) {
  const db        = useDerivizStore((s) => s.databases.find((d) => d.id === dbId) ?? null);
  const setExcluded = useDerivizStore((s) => s.setExcluded);
  const excluded  = useDerivizStore((s) => (dbId ? s.excludedIds.includes(dbId) : false));
  const setManual = useDerivizStore((s) => s.setManualOverride);
  const act       = useActivityForDb(dbId ?? "");

  if (!db) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[140]"
        style={{ background: "rgba(13,22,29,0.24)" }}
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 z-[150] flex h-full w-[480px] flex-col"
        style={{
          background: "#FFFFFF",
          borderLeft: "1px solid #ECEFF2",
          boxShadow: "0 4px 24px rgba(13,22,29,0.24)",
        }}
      >
        {/* Header — CareFlow modal header pattern */}
        <header
          className="flex h-[44px] shrink-0 items-center justify-between px-4"
          style={{ background: "#F7F8FA", borderBottom: "1px solid #ECEFF2" }}
        >
          <h2 className="text-[14px] font-semibold" style={{ color: "#5D6F7E" }}>
            Database details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-[24px] w-[24px] items-center justify-center rounded-[4px] text-[16px] transition-colors hover:bg-[#ECEFF2] focus:outline-none"
            style={{ color: "#96A3AF" }}
            aria-label="Close panel"
          >
            ✕
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* DB identity */}
          <div className="border-b px-4 py-4" style={{ borderColor: "#ECEFF2" }}>
            <p className="text-[16px] font-semibold" style={{ color: "#1E2228" }}>{db.name}</p>
            <p className="text-[12px] mt-0.5" style={{ color: "#5D6F7E" }}>
              {db.environment} · {db.sizeGb} GB
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              <ClassificationBadge classification={db.classification} />
              {db.autoBackedUp && <AutoBackedUpBadge />}
            </div>
          </div>

          {/* Action & Schedule */}
          <div className="border-b px-4 py-4 space-y-3" style={{ borderColor: "#ECEFF2" }}>
            <p className="section-hdr">Action &amp; Schedule</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Action"        value={db.action} />
              <Field label="Action date"   value={db.actionDate   ? formatShortDate(db.actionDate)   : "—"} />
              <Field label="Deletion date" value={db.deletionDate ? formatShortDate(db.deletionDate) : "—"} />
              <Field label="Size"          value={`${db.sizeGb} GB`} />
            </div>
          </div>

          {/* Exclude toggle */}
          <div className="border-b px-4 py-4" style={{ borderColor: "#ECEFF2" }}>
            <p className="section-hdr">Exclusion</p>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[12px] font-medium" style={{ color: "#354756" }}>
                  Exclude from automated actions
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "#96A3AF" }}>
                  This database will be skipped in trigger runs.
                </p>
              </div>
              <Toggle on={excluded} onChange={(v) => setExcluded(db.id, v)} ariaLabel="Exclude" />
            </div>
          </div>

          {/* Manual override */}
          <div className="border-b px-4 py-4" style={{ borderColor: "#ECEFF2" }}>
            <p className="section-hdr">Manual override</p>
            <label className="flex flex-col gap-1">
              <span className="text-[11px]" style={{ color: "#5D6F7E" }}>
                Assign action manually
              </span>
              <select
                className="c-select w-full"
                value={
                  ["Retain", "Delete", "Backup & Delete"].includes(db.action)
                    ? db.action
                    : "Retain"
                }
                onChange={(e) => {
                  const v = e.target.value as "Retain" | "Delete" | "Backup & Delete";
                  setManual(db.id, v);
                }}
              >
                {overrides.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
          </div>

          {/* Activity log */}
          <div className="px-4 py-4">
            <p className="section-hdr">Activity log</p>
            {act.length === 0 ? (
              <p className="text-[12px]" style={{ color: "#96A3AF" }}>
                No events for this database yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {act.map((a) => (
                  <li key={a.id} className="text-[12px]" style={{ color: "#354756" }}>
                    {a.message}
                    <span className="ml-1 text-[11px]" style={{ color: "#96A3AF" }}>
                      ({formatShortDate(a.at)})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Footer — CareFlow modal footer pattern */}
        <footer
          className="flex h-[44px] shrink-0 items-center justify-end gap-2 px-4"
          style={{ borderTop: "1px solid #ECEFF2", background: "#FFFFFF" }}
        >
          <button type="button" className="c-btn-outline" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </>
  );
}

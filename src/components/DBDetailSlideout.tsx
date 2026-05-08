// CareFlow Design System — DB Detail Slideout panel
// Uses CareFlow modal shadow, header bg (#F7F8FA), border (#ECEFF2),
// body white, form label pattern, primary button token

import { useEffect, useMemo, useState } from "react";
import { useActivityForDb, useDerivizStore } from "../store/useDerivizStore";
import { ClassificationBadge, AutoBackedUpBadge } from "./Badge";
import { Toggle } from "./Toggle";
import { formatShortDate } from "../lib/classify";

type SlideoutAction =
  | "lift_exclusion"
  | "reschedule"
  | "delete"
  | "backup"
  | "backup_delete";

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
  const scheduleDeletionByDate = useDerivizStore((s) => s.scheduleDeletionByDate);
  const liftExclusion = useDerivizStore((s) => s.liftExclusion);
  const setManual = useDerivizStore((s) => s.setManualOverride);
  const act       = useActivityForDb(dbId ?? "");
  const { minScheduleIso, maxScheduleIso } = useMemo(() => {
    const now = new Date();
    const min = new Date(now);
    min.setDate(min.getDate() + 1);
    const max = new Date(now);
    max.setMonth(max.getMonth() + 2);
    return {
      minScheduleIso: min.toISOString().slice(0, 10),
      maxScheduleIso: max.toISOString().slice(0, 10),
    };
  }, []);
  const [scheduleDate, setScheduleDate] = useState("");
  useEffect(() => {
    if (!db) return;
    if (db.deletionDate) {
      const iso = new Date(db.deletionDate).toISOString().slice(0, 10);
      if (iso >= minScheduleIso && iso <= maxScheduleIso) {
        setScheduleDate(iso);
        return;
      }
    }
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const fallback = d.toISOString().slice(0, 10);
    if (fallback < minScheduleIso) setScheduleDate(minScheduleIso);
    else if (fallback > maxScheduleIso) setScheduleDate(maxScheduleIso);
    else setScheduleDate(fallback);
  }, [db, minScheduleIso, maxScheduleIso]);
  const isLiveRow = Boolean(db && (db.classification === "Live" || db.name.toUpperCase().includes("_LIVE")));
  const [draftExcluded, setDraftExcluded] = useState(excluded);
  const status = draftExcluded
    ? "Excluded"
    : isLiveRow
      ? "Backup & Delete"
      : db?.action === "Delete" || db?.action === "Scheduled Delete"
      ? "Pending Deletion"
      : db?.action === "Backup & Delete"
        ? "Backup & Delete"
        : db?.action === "Backup"
          ? "Backup"
          : "Active";
  const [selectedAction, setSelectedAction] = useState<SlideoutAction>("reschedule");
  const [actionTouched, setActionTouched] = useState(false);
  const [dateTouched, setDateTouched] = useState(false);

  const actionOptions: { value: SlideoutAction; label: string }[] =
    status === "Excluded"
      ? [{ value: "lift_exclusion", label: "Lift Exclusion" }]
      : status === "Pending Deletion"
        ? [
            { value: "reschedule", label: "Reschedule" },
            { value: "delete", label: "Delete" },
            { value: "backup_delete", label: "Backup & Delete" },
          ]
        : status === "Backup & Delete"
          ? [
              { value: "reschedule", label: "Reschedule" },
              { value: "delete", label: "Delete" },
            ]
          : [
              { value: "delete", label: "Delete" },
              { value: "backup", label: "Backup" },
              { value: "backup_delete", label: "Backup & Delete" },
            ];

  useEffect(() => {
    setSelectedAction(actionOptions[0]?.value ?? "reschedule");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, excluded]);

  useEffect(() => {
    setDraftExcluded(excluded);
    setActionTouched(false);
    setDateTouched(false);
  }, [excluded, dbId]);

  if (!db) return null;

  function applyActionWithDate(action: SlideoutAction) {
    if (!db) return;
    if (!scheduleDate) return;
    if (scheduleDate < minScheduleIso || scheduleDate > maxScheduleIso) return;
    const deletionDateIso = new Date(`${scheduleDate}T00:00:00.000Z`).toISOString();
    if (action === "lift_exclusion") {
      liftExclusion(db.id);
      scheduleDeletionByDate(db.id, deletionDateIso);
      return;
    }
    if (action === "delete") {
      setManual(db.id, "Delete");
      scheduleDeletionByDate(db.id, deletionDateIso);
      return;
    }
    if (action === "backup") {
      setManual(db.id, "Backup");
      return;
    }
    if (action === "backup_delete") {
      setManual(db.id, "Backup & Delete");
      scheduleDeletionByDate(db.id, deletionDateIso);
      return;
    }
    scheduleDeletionByDate(db.id, deletionDateIso);
  }

  const canSaveAction =
    !!scheduleDate &&
    scheduleDate >= minScheduleIso &&
    scheduleDate <= maxScheduleIso;
  const exclusionChanged = draftExcluded !== excluded;
  const actionChanged = !draftExcluded && (actionTouched || dateTouched);
  const canSave = exclusionChanged || (actionChanged && canSaveAction);

  function handleSave() {
    if (!db) return;
    if (!canSave) return;
    if (exclusionChanged) {
      setExcluded(db.id, draftExcluded);
    }
    if (actionChanged && canSaveAction) {
      applyActionWithDate(selectedAction);
    }
    onClose();
  }

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
              <Field label="Account"       value={db.accountName ?? "—"} />
              <Field label="Conversion"    value={db.conversionName ?? "—"} />
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
              <Toggle on={draftExcluded} onChange={(v) => setDraftExcluded(v)} ariaLabel="Exclude" />
            </div>
          </div>

          {/* Quick actions */}
          <div className="border-b px-4 py-4 space-y-3" style={{ borderColor: "#ECEFF2" }}>
            <p className="section-hdr">Quick actions</p>
            <div
              className={draftExcluded ? "pointer-events-none opacity-60" : ""}
              aria-disabled={draftExcluded}
            >
              <label className="flex flex-col gap-1">
                <span className="text-[11px]" style={{ color: "#5D6F7E" }}>
                  Action
                </span>
                <select
                  className="c-select w-full"
                  disabled={draftExcluded}
                  value={selectedAction}
                  onChange={(e) => {
                    setSelectedAction(e.target.value as SlideoutAction);
                    setActionTouched(true);
                  }}
                >
                  {actionOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mt-3 flex flex-col gap-1">
                <span className="text-[11px]" style={{ color: "#5D6F7E" }}>
                  Action date context (required)
                </span>
                <input
                  type="date"
                  className="c-input w-full"
                  disabled={draftExcluded}
                  min={minScheduleIso}
                  max={maxScheduleIso}
                  value={scheduleDate}
                  onChange={(e) => {
                    setScheduleDate(e.target.value);
                    setDateTouched(true);
                  }}
                />
                <span className="text-[10px]" style={{ color: "#96A3AF" }}>
                  Choose a date from tomorrow to two months ahead.
                </span>
              </label>
            </div>
            {draftExcluded && (
              <p className="text-[11px]" style={{ color: "#96A3AF" }}>
                Turn off Exclusion to enable actions.
              </p>
            )}
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
          <button type="button" className="c-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="c-btn-primary" disabled={!canSave} onClick={handleSave}>
            Save
          </button>
        </footer>
      </div>
    </>
  );
}

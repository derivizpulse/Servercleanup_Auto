// CareFlow Design System — DB Detail Slideout panel
// Uses CareFlow modal shadow, header bg (#F7F8FA), border (#ECEFF2),
// body white, form label pattern, primary button token

import { useEffect, useMemo, useRef, useState } from "react";
import { useActivityForDb, useDerivizStore } from "../store/useDerivizStore";
import { ClassificationBadge, AutoBackedUpBadge } from "./Badge";
import { Toggle } from "./Toggle";
import { formatShortDate, parseDatabaseContext } from "../lib/classify";

type SlideoutAction =
  | "lift_exclusion"
  | "reschedule"
  | "delete"
  | "backup_delete";

/** Selected action while drafting “exclude” — empty until user picks (required). */
type ActionChoice = SlideoutAction | "";

function isoToUsMMDDYYYY(ymd: string): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
  const [y, mo, d] = ymd.split("-");
  return `${mo}/${d}/${y}`;
}

function formatDbDayUs(iso: string | null): string {
  if (!iso) return "—";
  const ymd = new Date(iso).toISOString().slice(0, 10);
  return isoToUsMMDDYYYY(ymd);
}

function isLiveDatabase(db: { name: string; classification: string | null }): boolean {
  return db.classification === "Live" || parseDatabaseContext(db.name).isLive;
}

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

export function DBDetailSlideout({
  dbId,
  onClose,
  readOnly = false,
}: {
  dbId: string | null;
  onClose: () => void;
  readOnly?: boolean;
}) {
  const db        = useDerivizStore((s) => s.databases.find((d) => d.id === dbId) ?? null);
  const setExcluded = useDerivizStore((s) => s.setExcluded);
  const logActivity = useDerivizStore((s) => s.logActivity);
  const excluded  = useDerivizStore((s) => (dbId ? s.excludedIds.includes(dbId) : false));
  const scheduleDeletionByDate = useDerivizStore((s) => s.scheduleDeletionByDate);
  const liftExclusion = useDerivizStore((s) => s.liftExclusion);
  const setManual = useDerivizStore((s) => s.setManualOverride);
  const backupInProgress = useDerivizStore((s) =>
    Boolean(
      dbId &&
        s.operationJobs.some(
          (j) =>
            j.dbId === dbId &&
            j.kind === "backup" &&
            (j.status === "queued" || j.status === "running")
        )
    )
  );
  const act       = useActivityForDb(dbId ?? "");
  const isLiveDb = useMemo(
    () => Boolean(db && isLiveDatabase(db)),
    [db]
  );
  const { minScheduleIso, maxScheduleIso } = useMemo(() => {
    const now = new Date();
    const min = new Date(now);
    const max = new Date(now);
    max.setMonth(max.getMonth() + 2);
    return {
      minScheduleIso: min.toISOString().slice(0, 10),
      maxScheduleIso: max.toISOString().slice(0, 10),
    };
  }, []);
  const [draftExcluded, setDraftExcluded] = useState(excluded);
  const applyingNewExclusion = draftExcluded && !excluded;
  /** Store still excluded, user turned draft toggle off — must pick a fresh date before save. */
  const liftingExclusionDraft = excluded && !draftExcluded;
  const [scheduleDateInput, setScheduleDateInput] = useState("");
  const scheduleIso = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduleDateInput)) return null;
    return scheduleDateInput;
  }, [scheduleDateInput]);

  useEffect(() => {
    if (!db) return;
    // Already excluded: don’t auto-fill the context field (cleared when user turns Exclude on).
    if (draftExcluded && excluded) return;
    // Turning exclusion on: keep field empty (toggle also clears).
    if (draftExcluded && !excluded) return;
    if (liftingExclusionDraft) return;
    if (db.deletionDate) {
      const iso = new Date(db.deletionDate).toISOString().slice(0, 10);
      if (iso >= minScheduleIso && iso <= maxScheduleIso) {
        setScheduleDateInput(iso);
        return;
      }
    }
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const fallback = d.toISOString().slice(0, 10);
    const pick =
      fallback < minScheduleIso ? minScheduleIso : fallback > maxScheduleIso ? maxScheduleIso : fallback;
    setScheduleDateInput(pick);
  }, [db, minScheduleIso, maxScheduleIso, draftExcluded, excluded, liftingExclusionDraft]);

  const [selectedAction, setSelectedAction] = useState<ActionChoice>("delete");
  const [showBackupConfirm, setShowBackupConfirm] = useState(false);
  const [actionTouched, setActionTouched] = useState(false);
  const [dateTouched, setDateTouched] = useState(false);
  const [liftSaveWarning, setLiftSaveWarning] = useState(false);
  const prevDraftExcludedRef = useRef(draftExcluded);
  const excludeDraftPairRef = useRef<string | null>(null);

  useEffect(() => {
    excludeDraftPairRef.current = null;
  }, [dbId]);

  useEffect(() => {
    const pair = `${draftExcluded}|${excluded}`;
    const prev = excludeDraftPairRef.current;
    if (prev !== null && applyingNewExclusion && prev === "false|false") {
      setScheduleDateInput("");
      setDateTouched(false);
      setSelectedAction("");
      setActionTouched(false);
    }
    excludeDraftPairRef.current = pair;
  }, [draftExcluded, excluded, applyingNewExclusion]);

  const actionOptions: { value: SlideoutAction; label: string }[] = useMemo(() => {
    if (draftExcluded && excluded) {
      return [{ value: "lift_exclusion", label: "Lift Exclusion" }];
    }
    const st =
      db?.action === "Delete" || db?.action === "Scheduled Delete"
        ? "Pending Deletion"
        : db?.action === "Backup & Delete"
          ? "Backup & Delete"
          : db?.action === "Backup"
            ? "Backup"
            : "Active";
    if (st === "Pending Deletion") {
      return [
        { value: "delete", label: "Delete" },
        { value: "backup_delete", label: "Backup & Delete" },
      ];
    }
    if (st === "Backup & Delete") {
      if (db && isLiveDatabase(db)) {
        return [
          { value: "backup_delete", label: "Backup & Delete" },
          { value: "delete", label: "Delete" },
        ];
      }
      return [
        { value: "reschedule", label: "Reschedule" },
        { value: "delete", label: "Delete" },
      ];
    }
    return [
      { value: "delete", label: "Delete" },
      { value: "backup_delete", label: "Backup & Delete" },
    ];
  }, [draftExcluded, excluded, db]);

  useEffect(() => {
    if (actionTouched) return;
    if (applyingNewExclusion) {
      setSelectedAction("");
      return;
    }
    if (liftingExclusionDraft) {
      const preferredAction: SlideoutAction =
        db?.action === "Backup & Delete"
          ? (isLiveDb ? "backup_delete" : "reschedule")
          : "delete";
      const hasPreferred = actionOptions.some((opt) => opt.value === preferredAction);
      setSelectedAction(hasPreferred ? preferredAction : (actionOptions[0]?.value ?? "delete"));
      return;
    }
    const preferredAction: SlideoutAction =
      draftExcluded && excluded
        ? "lift_exclusion"
        : db?.action === "Backup & Delete"
          ? (isLiveDb ? "backup_delete" : "reschedule")
          : "delete";
    const hasPreferred = actionOptions.some((opt) => opt.value === preferredAction);
    setSelectedAction(hasPreferred ? preferredAction : (actionOptions[0]?.value ?? "delete"));
  }, [
    applyingNewExclusion,
    liftingExclusionDraft,
    draftExcluded,
    excluded,
    db?.action,
    isLiveDb,
    actionOptions,
    actionTouched,
  ]);

  useEffect(() => {
    setDraftExcluded(excluded);
    setActionTouched(false);
    setDateTouched(false);
  }, [excluded, dbId]);

  useEffect(() => {
    const wasDraftExcluded = prevDraftExcludedRef.current;
    // Reverting exclusion (draft toggle off while still excluded): clear date — user must enter one to save.
    if (wasDraftExcluded && !draftExcluded && excluded && db) {
      setScheduleDateInput("");
      setDateTouched(false);
    }
    prevDraftExcludedRef.current = draftExcluded;
  }, [draftExcluded, excluded, db]);

  const scheduleDateOk =
    !!scheduleIso &&
    scheduleIso >= minScheduleIso &&
    scheduleIso <= maxScheduleIso;
  const exclusionChanged = draftExcluded !== excluded;
  const quickActionsDisabled = readOnly || draftExcluded;
  const exclusionTurnOn = exclusionChanged && applyingNewExclusion;
  const exclusionLiftOff = exclusionChanged && !draftExcluded && excluded;
  const actionChanged = !draftExcluded && (actionTouched || dateTouched);
  const canSave =
    !readOnly &&
    (exclusionTurnOn ||
      exclusionLiftOff ||
      (actionChanged && scheduleDateOk && !liftingExclusionDraft));
  const backupButtonDisabled = readOnly || draftExcluded || backupInProgress;

  useEffect(() => {
    if (!liftingExclusionDraft || scheduleDateOk) setLiftSaveWarning(false);
  }, [liftingExclusionDraft, scheduleDateOk]);

  function applyActionWithDate(action: SlideoutAction) {
    if (!db) return;
    if (!scheduleIso) return;
    if (scheduleIso < minScheduleIso || scheduleIso > maxScheduleIso) return;
    const deletionDateIso = new Date(`${scheduleIso}T00:00:00.000Z`).toISOString();
    if (action === "lift_exclusion") {
      liftExclusion(db.id);
      scheduleDeletionByDate(db.id, deletionDateIso);
      return;
    }
    if (action === "delete") {
      const alreadyOnDeleteSchedule =
        db.action === "Delete" || db.action === "Scheduled Delete";
      if (!alreadyOnDeleteSchedule) {
        setManual(db.id, "Delete");
      }
      scheduleDeletionByDate(db.id, deletionDateIso, "Delete");
      return;
    }
    if (action === "backup_delete") {
      setManual(db.id, "Backup & Delete");
      scheduleDeletionByDate(db.id, deletionDateIso, "Backup & Delete");
      return;
    }
    scheduleDeletionByDate(db.id, deletionDateIso);
  }

  function handleSave() {
    if (!db) return;
    if (exclusionLiftOff && !scheduleDateOk) {
      setLiftSaveWarning(true);
      return;
    }
    if (!canSave) return;
    setLiftSaveWarning(false);

    if (exclusionChanged) {
      if (draftExcluded) {
        if (!excluded) {
          logActivity("Excluded from automated actions", db.id);
        }
        setExcluded(db.id, true);
      } else {
        const deletionDateIso = new Date(`${scheduleIso}T00:00:00.000Z`).toISOString();
        liftExclusion(db.id);
        const act = selectedAction as SlideoutAction;
        if (act === "delete") {
          scheduleDeletionByDate(db.id, deletionDateIso, "Delete");
        } else if (act === "backup_delete") {
          scheduleDeletionByDate(db.id, deletionDateIso, "Backup & Delete");
        } else {
          scheduleDeletionByDate(db.id, deletionDateIso);
        }
      }
    }

    if (
      actionChanged &&
      scheduleDateOk &&
      !draftExcluded &&
      selectedAction !== "" &&
      !exclusionLiftOff
    ) {
      applyActionWithDate(selectedAction as SlideoutAction);
    }
    onClose();
  }

  function confirmBackupNow() {
    if (!db) return;
    setManual(db.id, "Backup");
    setShowBackupConfirm(false);
  }

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
            <div className="flex items-start justify-between gap-3">
              <p className="text-[16px] font-semibold" style={{ color: "#1E2228" }}>{db.name}</p>
              <button
                type="button"
                onClick={onClose}
                className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[4px] text-[16px] transition-colors hover:bg-[#ECEFF2] focus:outline-none"
                style={{ color: "#96A3AF" }}
                aria-label="Close panel"
              >
                ✕
              </button>
            </div>
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
              <Field label="Triggered date" value={formatDbDayUs(db.actionDate)} />
              <Field label="Deletion date" value={formatDbDayUs(db.deletionDate)} />
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
              <div className={readOnly ? "pointer-events-none opacity-60" : ""} aria-disabled={readOnly}>
                <Toggle
                  on={draftExcluded}
                  onChange={(v) => {
                    if (readOnly) return;
                    setDraftExcluded(v);
                    if (v && !excluded) {
                      setScheduleDateInput("");
                      setDateTouched(false);
                    }
                  }}
                  ariaLabel="Exclude"
                />
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="border-b px-4 py-4 space-y-3" style={{ borderColor: "#ECEFF2" }}>
            <div className="flex items-center justify-between">
              <p className="section-hdr">Quick actions</p>
              <button
                type="button"
                className={`h-[28px] px-2.5 text-[11px] ${
                  backupInProgress ? "c-btn-primary" : "c-btn-outline"
                } ${backupButtonDisabled ? "opacity-45 cursor-not-allowed" : ""}`}
                disabled={backupButtonDisabled}
                onClick={() => {
                  setShowBackupConfirm(true);
                }}
              >
                {backupInProgress ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="inline-block h-3 w-3 animate-spin rounded-full border border-white/70 border-t-transparent"
                      aria-hidden
                    />
                    Backup in progress
                  </span>
                ) : (
                  "Backup"
                )}
              </button>
            </div>
            <div
              className={quickActionsDisabled ? "pointer-events-none opacity-60" : ""}
              aria-disabled={quickActionsDisabled}
            >
              <label className="flex flex-col gap-1">
                <span className="text-[11px]" style={{ color: "#5D6F7E" }}>
                  Action
                </span>
                <select
                  className="c-select w-full"
                  disabled={quickActionsDisabled}
                  value={selectedAction}
                  onChange={(e) => {
                    setSelectedAction(e.target.value as ActionChoice);
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
                  Triggered date context
                </span>
                <input
                  type="date"
                  className="c-input w-full tabular-nums"
                  disabled={quickActionsDisabled}
                  min={minScheduleIso}
                  max={maxScheduleIso}
                  value={scheduleDateInput}
                  aria-label="Triggered date context"
                  onChange={(e) => {
                    setScheduleDateInput(e.target.value);
                    setDateTouched(true);
                  }}
                />
                <span className="text-[10px]" style={{ color: "#96A3AF" }}>
                  Choose from today through two months ahead.
                </span>
              </label>
            </div>
            {liftSaveWarning && liftingExclusionDraft ? (
              <p className="text-[11px] font-medium" style={{ color: "#B23838" }} role="alert">
                Enter a valid triggered date before lifting exclusion.
              </p>
            ) : null}
            {readOnly ? (
              <p className="text-[11px]" style={{ color: "#96A3AF" }}>
                Deleted records are read-only.
              </p>
            ) : draftExcluded ? (
              <p className="text-[11px]" style={{ color: "#96A3AF" }}>
                Turn off Exclusion to enable actions.
              </p>
            ) : liftingExclusionDraft ? (
              <p className="text-[11px]" style={{ color: "#96A3AF" }}>
                Enter triggered date (required) to lift exclusion and save your schedule.
              </p>
            ) : null}
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
          {!readOnly && (
            <button type="button" className="c-btn-primary" disabled={!canSave} onClick={handleSave}>
              Save
            </button>
          )}
        </footer>
      </div>

      {showBackupConfirm && !readOnly && (
        <>
          <div
            className="fixed inset-0 z-[190]"
            style={{ background: "rgba(13,22,29,0.28)" }}
            onClick={() => setShowBackupConfirm(false)}
            aria-hidden
          />
          <div
            className="fixed left-1/2 top-1/2 z-[200] w-[380px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[6px] bg-white"
            style={{ border: "1px solid #ECEFF2", boxShadow: "0 10px 28px rgba(13,22,29,0.30)" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="backup-confirm-title"
          >
            <div className="border-b px-4 py-3" style={{ borderColor: "#ECEFF2", background: "#F7F8FA" }}>
              <h3 id="backup-confirm-title" className="text-[14px] font-semibold" style={{ color: "#5D6F7E" }}>
                Confirm backup
              </h3>
            </div>
            <div className="space-y-2 px-4 py-4">
              <p className="text-[12px]" style={{ color: "#354756" }}>
                Start backup now for <span className="font-medium">{db.name}</span>?
              </p>
              <p className="text-[11px]" style={{ color: "#96A3AF" }}>
                Backup will begin immediately and appear in Operations as in progress.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t px-4 py-3" style={{ borderColor: "#ECEFF2" }}>
              <button
                type="button"
                className="c-btn-ghost"
                onClick={() => setShowBackupConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="c-btn-primary"
                onClick={confirmBackupNow}
              >
                Backup now
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

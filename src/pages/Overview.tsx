// Deriviz — Overview page
// Implements the wireframe sketch: sub-tabs, alert banner, 5 stat cards, new table

import { useEffect, useMemo, useRef, useState } from "react";
import { DBDetailSlideout } from "../components/DBDetailSlideout";
import { useDerivizStore } from "../store/useDerivizStore";
import { formatShortDate } from "../lib/classify";
import type { DatabaseRow } from "../types";

// ── helpers ──────────────────────────────────────────────────────────────────

function daysBetween(a: string, b: string) {
  return Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000
  );
}

function serverGroup(server: string): string {
  return server.split("-")[0] ?? server;
}

function daysUntil(iso: string | null, todayIso: string): number | null {
  if (!iso) return null;
  return daysBetween(todayIso, iso);
}

/** Reschedule / schedule deletion date pickers: earliest tomorrow, latest today + 2 calendar months. */
function getDeletionScheduleDateBounds(): { minIso: string; maxIso: string } {
  const today = new Date();
  const min = new Date(today);
  min.setDate(min.getDate() + 1);
  const max = new Date(today);
  max.setMonth(max.getMonth() + 2);
  return {
    minIso: min.toISOString().slice(0, 10),
    maxIso: max.toISOString().slice(0, 10),
  };
}

/** Compute a human-readable "Day X of Y — Z days remain" label */
function deletionCountdown(
  actionDate: string | null,
  deletionDate: string | null,
  windowDays: number | null,
  todayIso: string
): { label: string; urgent: boolean } | null {
  if (!deletionDate) return null;
  const remaining = daysUntil(deletionDate, todayIso);
  if (remaining === null) return null;
  if (remaining < 0) return { label: "Overdue", urgent: true };
  if (remaining === 0) return { label: `Expires today`, urgent: true };
  if (remaining === 1) return { label: "Tomorrow", urgent: true };
  if (windowDays && actionDate) {
    const elapsed = daysBetween(actionDate, todayIso);
    const day = Math.max(1, Math.min(elapsed + 1, windowDays));
    return { label: `${remaining}d remain · Day ${day} of ${windowDays}`, urgent: false };
  }
  return { label: `${remaining}d remain`, urgent: false };
}

function formatAsOf(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Effective status label for each row */
function rowStatus(db: ReturnType<typeof useDerivizStore.getState>["databases"][0], excluded: boolean): string {
  if (excluded) return "Excluded";
  if (db.action === "Delete" || db.action === "Scheduled Delete") return "Pending Deletion";
  if (db.action === "Backup & Delete") return "Backup & Delete";
  if (db.action === "Backup") return "Backup";
  return "Active";
}

function isUnmappedDatabase(db: DatabaseRow): boolean {
  return !db.accountName || !db.conversionName;
}

function normalizedDeliverableStatus(db: DatabaseRow): DatabaseRow["deliverableStatus"] {
  const raw = db.deliverableStatus as string | null;
  if (raw !== "SB/ITL Completed") return db.deliverableStatus;
  const nameU = db.name.toUpperCase();
  if (db.environment === "ITL" || nameU.includes("_ITL")) return "ITL Completed";
  return "SB Completed";
}

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  "Pending Deletion": { bg: "#FEF2F2", color: "#B23838", border: "#FECACA" },
  "Backup & Delete":  { bg: "#FFFBEB", color: "#C27803", border: "#FDE68A" },
  "Backup":           { bg: "#EFF6FF", color: "#1D61C8", border: "#BFDBFE" },
  "Excluded":         { bg: "#F7F8FA", color: "#5D6F7E", border: "#C9D1DA" },
  "Active":           { bg: "#F0FDF4", color: "#1B8A4A", border: "#BBF7D0" },
};

const STATUS_LEGEND = [
  { label: "Active", meaning: "Monitored, no delete flow yet." },
  { label: "Pending Deletion", meaning: "Delete or scheduled-delete queue." },
  { label: "Backup", meaning: "Backup only — no deletion scheduled." },
  { label: "Backup & Delete", meaning: "Backup first, then delete." },
  { label: "Excluded", meaning: "Removed from automated actions. Use 'Lift Exclusion' to re-enable." },
] as const;

const DELIVERABLE_LEGEND = [
  { label: "SB Completed", meaning: "SB stage milestone is complete." },
  { label: "ITL Completed", meaning: "ITL stage milestone is complete." },
  { label: "LIVE Completed", meaning: "Trigger 2 LIVE milestone is complete." },
  { label: "Blank", meaning: "No linked milestone completion yet." },
] as const;

const DELIVERABLE_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  "SB Completed": { bg: "#E0F2F5", color: "#007A8F", border: "#A8D8DF" },
  "ITL Completed": { bg: "#F1ECFE", color: "#6C3EB8", border: "#D5C6F7" },
  "LIVE Completed": { bg: "#FFF0E6", color: "#C2560C", border: "#FBCBA9" },
  "Blank": { bg: "#F7F8FA", color: "#5D6F7E", border: "#C9D1DA" },
};

/** Table columns that support client-side sort */
type SortableColumn =
  | "name"
  | "account"
  | "conversion"
  | "server"
  | "size"
  | "deliverable"
  | "status"
  | "actionDate";

function sortDatabases(
  rows: DatabaseRow[],
  col: SortableColumn,
  dir: "asc" | "desc",
  excludedIds: string[]
): DatabaseRow[] {
  const s = dir === "asc" ? 1 : -1;
  const next = [...rows];
  next.sort((a, b) => {
    const aEx = excludedIds.includes(a.id);
    const bEx = excludedIds.includes(b.id);
    const aSt = rowStatus(a, aEx);
    const bSt = rowStatus(b, bEx);
    let cmp = 0;
    switch (col) {
      case "name":
        cmp = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        break;
      case "account":
        cmp = (a.accountName ?? "").localeCompare(b.accountName ?? "", undefined, { sensitivity: "base" });
        break;
      case "conversion":
        cmp = (a.conversionName ?? "").localeCompare(b.conversionName ?? "", undefined, { sensitivity: "base" });
        break;
      case "server":
        cmp = serverGroup(a.server).localeCompare(serverGroup(b.server), undefined, { sensitivity: "base" });
        break;
      case "size":
        cmp = a.sizeGb - b.sizeGb;
        break;
      case "deliverable":
        {
          const ad = normalizedDeliverableStatus(a);
          const bd = normalizedDeliverableStatus(b);
          if (ad == null && bd == null) cmp = 0;
          else if (ad == null) cmp = 1;
          else if (bd == null) cmp = -1;
          else cmp = ad.localeCompare(bd, undefined, { sensitivity: "base" });
        }
        break;
      case "status":
        cmp = aSt.localeCompare(bSt, undefined, { sensitivity: "base" });
        break;
      case "actionDate": {
        const ad = a.deletionDate;
        const bd = b.deletionDate;
        if (ad == null && bd == null) cmp = 0;
        else if (ad == null) cmp = 1;
        else if (bd == null) cmp = -1;
        else cmp = ad < bd ? -1 : ad > bd ? 1 : 0;
        break;
      }
      default:
        cmp = 0;
    }
    if (cmp !== 0) return cmp * s;
    return a.id.localeCompare(b.id) * s;
  });
  return next;
}

// ── sub-tab types ─────────────────────────────────────────────────────────────
type SubTab = "All DB" | "Deleted" | "Audit Log";
const SUB_TABS: SubTab[] = ["All DB", "Deleted", "Audit Log"];
type MetricRange = "7d" | "30d" | "90d";
type ConfirmOverrideAction = "Delete" | "Backup & Delete";

const RANGE_DAYS: Record<MetricRange, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

// ── stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, highlight }: {
  label: string; value: string | number; sub: string; highlight?: boolean;
}) {
  return (
    <div className="c-card flex flex-col gap-1 p-3 min-w-[140px]">
      <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "#96A3AF" }}>
        {label}
      </p>
      <p
        className="text-[22px] font-semibold tabular-nums leading-tight"
        style={{ color: highlight ? "#B23838" : "#1E2228" }}
      >
        {value}
      </p>
      <p className="text-[11px]" style={{ color: "#96A3AF" }}>{sub}</p>
    </div>
  );
}

// ── action button ─────────────────────────────────────────────────────────────
function ActionBtn({
  label, variant = "outline", onClick,
}: { label: string; variant?: "outline" | "danger" | "ghost"; onClick: () => void }) {
  const styles = {
    outline: { border: "1px solid #007A8F", color: "#007A8F", background: "#FFFFFF" },
    danger:  { border: "1px solid #B23838", color: "#B23838", background: "#FFFFFF" },
    ghost:   { border: "1px solid #C9D1DA", color: "#5D6F7E", background: "#FFFFFF" },
  }[variant];
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="inline-flex h-[24px] items-center px-2 rounded-[3px] text-[11px] font-medium transition-colors"
      style={styles}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
    >
      {label}
    </button>
  );
}

function SearchableSelect({
  id,
  label,
  value,
  options,
  onChange,
  className,
}: {
  id: string;
  /** Short heading above the field (e.g. "Server") so filters are self-explanatory */
  label?: string;
  value: string;
  options: string[];
  onChange: (next: string) => void;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [hasTyped, setHasTyped] = useState(false);

  useEffect(() => {
    setQuery(value);
    setHasTyped(false);
  }, [value]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!rootRef.current) return;
      if (rootRef.current.contains(event.target as Node)) return;
      setIsOpen(false);
      setQuery(value);
      setHasTyped(false);
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [value]);

  const filteredOptions = useMemo(() => {
    if (!hasTyped) return options;
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, query, hasTyped]);

  function commit(next: string) {
    onChange(next);
    setQuery(next);
    setHasTyped(false);
    setIsOpen(false);
  }

  function resetToSelected() {
    setQuery(value);
    setHasTyped(false);
    setIsOpen(false);
  }

  return (
    <div className={`flex min-w-0 flex-col gap-1 ${className ?? ""}`}>
      {label && (
        <label
          htmlFor={id}
          className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.06em]"
          style={{ color: "#5D6F7E" }}
        >
          {label}
        </label>
      )}
      <div ref={rootRef} className="relative w-full min-w-0">
      <input
        id={id}
        className="c-input w-full pr-7"
        value={query}
        aria-label={label ? `${label} filter` : id}
        onFocus={() => {
          setIsOpen(true);
          setHasTyped(false);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setHasTyped(true);
          setIsOpen(true);
        }}
        onBlur={() => {
          // Allow option click handlers to run before closing/resetting.
          window.setTimeout(() => {
            if (!rootRef.current) return;
            const active = document.activeElement;
            if (active && rootRef.current.contains(active)) return;
            if (options.includes(query)) {
              commit(query);
              return;
            }
            resetToSelected();
          }, 0);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            resetToSelected();
            return;
          }
          if (e.key === "ArrowDown") {
            setIsOpen(true);
            return;
          }
          if (e.key === "Enter") {
            e.preventDefault();
            if (options.includes(query)) {
              commit(query);
              return;
            }
            if (filteredOptions.length > 0) {
              commit(filteredOptions[0]);
              return;
            }
            commit(options[0] ?? "");
          }
        }}
      />
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px]"
        style={{ color: "#5D6F7E" }}
        aria-label={label ? `Open ${label} options` : `Open ${id}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          if (isOpen) {
            resetToSelected();
            return;
          }
          setIsOpen(true);
        }}
      >
        {isOpen ? "▲" : "▼"}
      </button>

      {isOpen && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-[220] overflow-hidden rounded-[4px] bg-white"
          style={{ border: "1px solid #C9D1DA", boxShadow: "0 8px 24px rgba(13,22,29,0.16)" }}
        >
          <div className="max-h-[220px] overflow-auto py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const selected = opt === value;
                return (
                  <button
                    key={opt}
                    type="button"
                    className="flex w-full items-center px-2.5 py-1.5 text-left text-[12px] transition-colors"
                    style={{
                      background: selected ? "#E8F8FA" : "#FFFFFF",
                      color: selected ? "#006A80" : "#354756",
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => commit(opt)}
                  >
                    {opt}
                  </button>
                );
              })
            ) : (
              <div className="px-2.5 py-2 text-[11px]" style={{ color: "#96A3AF" }}>
                No records found
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

// ── bulk action types ─────────────────────────────────────────────────────────
type BulkCategory = "LIVE" | "SB" | "ITL" | "Standard";

function dbBulkCategory(db: DatabaseRow): BulkCategory {
  const nameU = db.name.toUpperCase();
  if (db.classification === "Live" || nameU.includes("_LIVE")) return "LIVE";
  if (db.environment === "SB" || nameU.includes("_SB")) return "SB";
  if (db.environment === "ITL" || nameU.includes("_ITL")) return "ITL";
  return "Standard";
}


type BulkAction = "Delete" | "Backup" | "Backup & Delete" | "Scheduled Delete" | "Reschedule";

// ─────────────────────────────────────────────────────────────────────────────
// BulkActionModal
// Design principle: smart defaults, minimal decisions, one confirm.
// The system determines the right action per category; user adjusts windows
// and deselects individual DBs they want to skip.
// ─────────────────────────────────────────────────────────────────────────────
function BulkActionModal({
  rows,
  onClose,
  onApply,
}: {
  rows: DatabaseRow[];
  onClose: () => void;
  onApply: (items: { dbId: string; action: BulkAction; windowDays?: number; date?: string }[]) => void;
}) {
  const scheduleBounds = getDeletionScheduleDateBounds();

  // Smart defaults — pre-assigned per category
  function defaultAction(cat: BulkCategory): BulkAction {
    if (cat === "LIVE") return "Backup & Delete";
    if (cat === "SB")   return "Scheduled Delete";
    if (cat === "ITL")  return "Scheduled Delete";
    return "Delete";
  }

  // Per-category overrideable action + window/date
  const [liveAction,  setLiveAction]  = useState<BulkAction>(() => defaultAction("LIVE"));
  const [sbAction,    setSbAction]    = useState<BulkAction>(() => defaultAction("SB"));
  const [itlAction,   setItlAction]   = useState<BulkAction>(() => defaultAction("ITL"));
  const [stdAction,   setStdAction]   = useState<BulkAction>(() => defaultAction("Standard"));
  const [liveWindow,  setLiveWindow]  = useState(30);
  const [sbWindow,    setSbWindow]    = useState(7);
  const [itlWindow,   setItlWindow]   = useState(7);
  const [liveDate,    setLiveDate]    = useState("");
  const [sbDate,      setSbDate]      = useState("");
  const [itlDate,     setItlDate]     = useState("");
  const [stdDate,     setStdDate]     = useState("");

  function catAction(cat: BulkCategory): BulkAction {
    if (cat === "LIVE")     return liveAction;
    if (cat === "SB")       return sbAction;
    if (cat === "ITL")      return itlAction;
    return stdAction;
  }

  // Which DBs to skip
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  function toggleSkip(id: string) {
    setSkipped((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const activeRows = useMemo(() => rows.filter((r) => !skipped.has(r.id)), [rows, skipped]);

  // Grouped counts for the summary strip
  const groups = useMemo(() => {
    const g: Partial<Record<BulkCategory, DatabaseRow[]>> = {};
    activeRows.forEach((r) => {
      const cat = dbBulkCategory(r);
      if (!g[cat]) g[cat] = [];
      g[cat]!.push(r);
    });
    return g;
  }, [activeRows]);

  const catOrder: BulkCategory[] = ["LIVE", "SB", "ITL", "Standard"];

  const CHIP: Record<BulkCategory, { label: string; bg: string; color: string; border: string }> = {
    LIVE:     { label: "LIVE", bg: "#FFF0E6", color: "#C2560C", border: "#FBCBA9" },
    SB:       { label: "SB",   bg: "#E0F2F5", color: "#007A8F", border: "#A8D8DF" },
    ITL:      { label: "ITL",  bg: "#F1ECFE", color: "#6C3EB8", border: "#D5C6F7" },
    Standard: { label: "Std",  bg: "#F7F8FA", color: "#5D6F7E", border: "#D9E0E7" },
  };

  const ACTION_OPTIONS: BulkAction[] = ["Delete", "Backup", "Backup & Delete", "Scheduled Delete", "Reschedule"];

  // canConfirm: reschedule categories must have a date
  const canConfirm = activeRows.length > 0 && !(
    (groups["LIVE"]     && liveAction === "Reschedule" && !liveDate) ||
    (groups["SB"]       && sbAction   === "Reschedule" && !sbDate)   ||
    (groups["ITL"]      && itlAction  === "Reschedule" && !itlDate)  ||
    (groups["Standard"] && stdAction  === "Reschedule" && !stdDate)
  );

  function handleConfirm() {
    const items = activeRows.map((r) => {
      const cat    = dbBulkCategory(r);
      const action = catAction(cat);
      if (action === "Backup & Delete") return { dbId: r.id, action, windowDays: liveWindow };
      if (action === "Scheduled Delete") {
        const win = cat === "SB" ? sbWindow : cat === "ITL" ? itlWindow : liveWindow;
        return { dbId: r.id, action, windowDays: win };
      }
      if (action === "Reschedule") {
        const dt = cat === "LIVE" ? liveDate : cat === "SB" ? sbDate : cat === "ITL" ? itlDate : stdDate;
        return { dbId: r.id, action, date: dt };
      }
      return { dbId: r.id, action };
    });
    onApply(items);
  }

  // Summary row — action is a compact select, window/date shown inline when needed
  function SummaryRow({ cat, catRows }: { cat: BulkCategory; catRows: DatabaseRow[] }) {
    const chip       = CHIP[cat];
    const action     = catAction(cat);
    const isDefault  = action === defaultAction(cat);
    const setAction  = cat === "LIVE" ? setLiveAction : cat === "SB" ? setSbAction : cat === "ITL" ? setItlAction : setStdAction;
    const window_    = cat === "SB" ? sbWindow : cat === "ITL" ? itlWindow : liveWindow;
    const setWindow_ = cat === "SB" ? setSbWindow : cat === "ITL" ? setItlWindow : setLiveWindow;
    const date_      = cat === "LIVE" ? liveDate : cat === "SB" ? sbDate : cat === "ITL" ? itlDate : stdDate;
    const setDate_   = cat === "LIVE" ? setLiveDate : cat === "SB" ? setSbDate : cat === "ITL" ? setItlDate : setStdDate;

    return (
      <div className="flex items-center gap-3 py-2.5 px-4 border-b last:border-b-0" style={{ borderColor: "#F3F4F6" }}>
        {/* Count bubble */}
        <span className="w-[20px] h-[20px] flex items-center justify-center rounded-full text-[10px] font-bold shrink-0"
          style={{ background: chip.bg, color: chip.color }}>
          {catRows.length}
        </span>
        {/* Category label */}
        <span className="text-[11px] font-medium w-[110px] shrink-0" style={{ color: "#354756" }}>
          {cat === "LIVE" ? "LIVE databases" : cat === "SB" ? "SB databases" : cat === "ITL" ? "ITL databases" : "Standard databases"}
        </span>
        <span className="text-[10px]" style={{ color: "#C9D1DA" }}>→</span>
        {/* Action select — pre-filled with smart default, editable */}
        <select
          className="c-select h-[26px] text-[11px] font-semibold flex-1"
          style={{ color: chip.color, borderColor: isDefault ? "transparent" : chip.border, background: isDefault ? chip.bg : "#FFFFFF" }}
          value={action}
          onChange={(e) => setAction(e.target.value as BulkAction)}
        >
          {ACTION_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        {/* Secondary control — window or date */}
        {(action === "Backup & Delete" || action === "Scheduled Delete") && (
          <select className="c-select h-[26px] text-[10px] w-[76px] shrink-0"
            value={window_} onChange={(e) => setWindow_(Number(e.target.value))}>
            {[3, 5, 7, 14, 30, 60].map((d) => <option key={d} value={d}>{d}d</option>)}
          </select>
        )}
        {action === "Reschedule" && (
          <input
            type="date"
            className="c-input h-[26px] text-[10px] shrink-0 w-[130px]"
            min={scheduleBounds.minIso}
            max={scheduleBounds.maxIso}
            title={`Deletion date: ${scheduleBounds.minIso} → ${scheduleBounds.maxIso} (tomorrow through two months ahead)`}
            value={date_}
            onChange={(e) => setDate_(e.target.value)}
            placeholder="Pick date"
          />
        )}
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-[180]" style={{ background: "rgba(13,22,29,0.3)" }} onClick={onClose} aria-hidden />
      <div
        className="fixed left-1/2 top-1/2 z-[190] w-[500px] max-h-[82vh] -translate-x-1/2 -translate-y-1/2 rounded-[8px] bg-white flex flex-col overflow-hidden"
        style={{ border: "1px solid #ECEFF2", boxShadow: "0 12px 40px rgba(13,22,29,0.22)" }}
        role="dialog" aria-modal="true"
      >
        {/* ── Header ── */}
        <div className="c-card-header flex items-center justify-between shrink-0">
          <div>
            <p className="text-[13px] font-semibold" style={{ color: "#354756" }}>Review bulk action</p>
            <p className="text-[11px] mt-0.5" style={{ color: "#96A3AF" }}>
              {rows.length} databases selected · uncheck rows to skip
            </p>
            <p className="text-[10px] mt-1 leading-snug" style={{ color: "#96A3AF" }}>
              Reschedule date range: tomorrow through two months from today (same as row Reschedule).
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-[16px] leading-none" style={{ color: "#96A3AF" }} aria-label="Close">✕</button>
        </div>

        {/* ── Action summary (what will happen) ── */}
        {activeRows.length > 0 && (
          <div className="shrink-0 mx-4 mt-3 mb-1 rounded-[6px] overflow-hidden" style={{ border: "1px solid #ECEFF2" }}>
            <div className="px-4 py-2 border-b" style={{ borderColor: "#F3F4F6", background: "#F7F8FA" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#96A3AF" }}>What will happen</p>
            </div>
            {catOrder.map((cat) => {
              const catRows = groups[cat];
              if (!catRows || catRows.length === 0) return null;
              return <SummaryRow key={cat} cat={cat} catRows={catRows} />;
            })}
          </div>
        )}

        {/* ── DB list (review + deselect) ── */}
        <div className="flex-1 overflow-y-auto mt-2 border-t" style={{ borderColor: "#ECEFF2" }}>
          <div className="px-4 py-2 flex items-center justify-between sticky top-0 bg-white z-10" style={{ borderBottom: "1px solid #F3F4F6" }}>
            <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#96A3AF" }}>
              Databases
            </span>
            {skipped.size > 0 && (
              <button type="button" className="text-[10px]" style={{ color: "#007A8F" }} onClick={() => setSkipped(new Set())}>
                Restore all
              </button>
            )}
          </div>
          {rows.map((r) => {
            const cat = dbBulkCategory(r);
            const chip = CHIP[cat];
            const isSkipped = skipped.has(r.id);
            return (
              <label
                key={r.id}
                className="flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none transition-colors"
                style={{
                  background: isSkipped ? "#FAFBFC" : "#FFFFFF",
                  opacity: isSkipped ? 0.45 : 1,
                  borderBottom: "1px solid #F9FAFB",
                }}
              >
                <input
                  type="checkbox" checked={!isSkipped}
                  onChange={() => toggleSkip(r.id)}
                  className="h-[14px] w-[14px] rounded accent-[#007A8F] shrink-0"
                />
                <span
                  className="shrink-0 text-[9px] font-bold rounded-[3px] px-[5px] py-[2px]"
                  style={{ background: chip.bg, color: chip.color, border: `1px solid ${chip.border}` }}
                >
                  {chip.label}
                </span>
                <span className="flex-1 text-[12px] font-medium truncate" style={{ color: isSkipped ? "#96A3AF" : "#354756" }}>
                  {r.name}
                </span>
                <span className="shrink-0 text-[10px]" style={{ color: "#96A3AF" }}>{r.sizeGb} GB</span>
                {r.deletionDate && (
                  <span
                    className="shrink-0 text-[10px] font-medium rounded-[3px] px-1.5 py-0.5"
                    style={{ background: "#FEF2F2", color: "#B23838", border: "1px solid #FECACA" }}
                  >
                    Due {formatShortDate(r.deletionDate)}
                  </span>
                )}
              </label>
            );
          })}
        </div>

        {/* ── Footer ── */}
        <div
          className="shrink-0 flex items-center justify-between px-4 py-3 border-t"
          style={{ borderColor: "#ECEFF2", background: "#FAFBFC" }}
        >
          <p className="text-[11px]" style={{ color: "#96A3AF" }}>
            {skipped.size > 0 ? `${skipped.size} skipped` : `${activeRows.length} will be processed`}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" className="c-btn-ghost" onClick={onClose}>Cancel</button>
            <button
              type="button"
              className="c-btn-primary"
              disabled={!canConfirm}
              onClick={handleConfirm}
            >
              Confirm {activeRows.length} DB{activeRows.length !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export function Overview({
  requestedServerFilter,
  onServerFilterApplied,
}: {
  requestedServerFilter?: { server: string; token: number } | null;
  onServerFilterApplied?: () => void;
}) {
  const dbs         = useDerivizStore((s) => s.databases);
  const excludedIds = useDerivizStore((s) => s.excludedIds);
  const deletedIds  = useDerivizStore((s) => s.deletedIds);
  const deletedAtById = useDerivizStore((s) => s.deletedAtById);
  const activityLog = useDerivizStore((s) => s.activityLog);
  const scheduleDeletionByDate = useDerivizStore((s) => s.scheduleDeletionByDate);
  const deleteNow   = useDerivizStore((s) => s.deleteNow);
  const liftExclusion = useDerivizStore((s) => s.liftExclusion);
  const setManualOverride = useDerivizStore((s) => s.setManualOverride);
  const [subTab, setSubTab]         = useState<SubTab>("All DB");
  const [selected, setSelected]     = useState<string | null>(null);
  const [search, setSearch]         = useState("");
  const [serverFilter, setServerFilter] = useState("All Servers");
  const [accountFilter, setAccountFilter] = useState("All Accounts");
  const [conversionFilter, setConversionFilter] = useState("All Conversions");
  const [classFilter, setClassFilter]   = useState("All classifications");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [sortColumn, setSortColumn] = useState<SortableColumn>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [scheduleDbId, setScheduleDbId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [confirmDeleteDbId, setConfirmDeleteDbId] = useState<string | null>(null);
  const [confirmOverride, setConfirmOverride] = useState<{
    dbId: string;
    action: ConfirmOverrideAction;
  } | null>(null);
  const [showLegendInfo, setShowLegendInfo] = useState(false);
  const legendRef = useRef<HTMLDivElement | null>(null);
  const [metricRange, setMetricRange] = useState<MetricRange>("30d");
  const [nowIso, setNowIso] = useState<string>(() => new Date().toISOString());
  const [selectedDbIds, setSelectedDbIds] = useState<Set<string>>(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setNowIso(new Date().toISOString()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!showLegendInfo) return;
    function handleOutsideClick(event: MouseEvent) {
      if (!legendRef.current) return;
      if (legendRef.current.contains(event.target as Node)) return;
      setShowLegendInfo(false);
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showLegendInfo]);

  const todayIso = nowIso.slice(0, 10);

  // unique servers
  const servers = useMemo(
    () => ["All Servers", ...Array.from(new Set(dbs.map((d) => serverGroup(d.server))))],
    [dbs]
  );
  const accounts = useMemo(
    () => ["All Accounts", ...Array.from(new Set(dbs.map((d) => d.accountName).filter((x): x is string => Boolean(x))))],
    [dbs]
  );
  const conversions = useMemo(() => {
    const scoped = accountFilter === "All Accounts"
      ? dbs
      : dbs.filter((d) => d.accountName === accountFilter);
    return [
      "All Conversions",
      ...Array.from(new Set(scoped.map((d) => d.conversionName).filter((x): x is string => Boolean(x)))),
    ];
  }, [accountFilter, dbs]);
  const classificationOptions = ["All classifications", "Account", "Conversion", "Live", "Unmapped"];
  const statusOptions = ["All statuses", "Active", "Pending Deletion", "Backup", "Backup & Delete", "Excluded"];

  useEffect(() => {
    if (conversionFilter !== "All Conversions" && !conversions.includes(conversionFilter)) {
      setConversionFilter("All Conversions");
    }
  }, [conversionFilter, conversions]);

  useEffect(() => {
    if (!requestedServerFilter) return;
    const groupedServer = serverGroup(requestedServerFilter.server);
    if (servers.includes(groupedServer)) {
      setSubTab("All DB");
      setServerFilter(groupedServer);
      setAccountFilter("All Accounts");
      setConversionFilter("All Conversions");
      // Cleanup entry-point focus: show only pending deletions and sort by earliest expiry.
      setStatusFilter("Pending Deletion");
      setSortColumn("actionDate");
      setSortDir("asc");
    }
    onServerFilterApplied?.();
  }, [requestedServerFilter, servers, onServerFilterApplied]);

  // metrics
  const metrics = useMemo(() => {
    const active = dbs.filter((d) => !deletedIds.includes(d.id));
    const rangeDays = RANGE_DAYS[metricRange];
    const rangeStartMs = new Date(nowIso).getTime() - rangeDays * 86_400_000;
    const inRange = (iso: string | null) => {
      if (!iso) return false;
      const t = new Date(iso).getTime();
      return t >= rangeStartMs;
    };

    const pendingDel = active.filter((d) =>
      !excludedIds.includes(d.id) &&
      (d.action === "Delete" || d.action === "Scheduled Delete")
    );
    const backupDel = active.filter((d) =>
      !excludedIds.includes(d.id) && d.action === "Backup & Delete"
    );
    const excl = active.filter((d) => excludedIds.includes(d.id));
    const expiresToday = pendingDel.filter((d) => daysUntil(d.deletionDate, todayIso) === 0).length;
    const expiresIn24h = pendingDel.filter((d) => {
      const n = daysUntil(d.deletionDate, todayIso);
      return n !== null && n <= 1;
    });
    const storageRecovered = dbs
      .filter((d) => deletedIds.includes(d.id) && inRange(deletedAtById[d.id] ?? null))
      .reduce((a, b) => a + b.sizeGb, 0);
    const pendingCreatedInRange = pendingDel.filter((d) => inRange(d.actionDate)).length;
    const backupCreatedInRange = backupDel.filter((d) => inRange(d.actionDate)).length;
    const excludedCreatedInRange = excl.filter((d) => inRange(d.actionDate)).length;

    return {
      totalSynced: active.length,
      pendingDel: pendingDel.length,
      pendingCreatedInRange,
      expiresToday,
      backupDel: backupDel.length,
      backupCreatedInRange,
      excluded: excl.length,
      excludedCreatedInRange,
      storageRecovered: Math.round(storageRecovered),
      expiresIn24h,
      rangeDays,
    };
  }, [dbs, excludedIds, deletedIds, deletedAtById, metricRange, nowIso, todayIso]);

  // filter rows by sub-tab
  const visibleRows = useMemo(() => {
    let rows = dbs.filter((d) => !deletedIds.includes(d.id));
    if (subTab === "Deleted")
      rows = dbs.filter((d) => deletedIds.includes(d.id));

    // search
    if (search.trim())
      rows = rows.filter((d) => {
        const q = search.toLowerCase();
        return (
          d.name.toLowerCase().includes(q) ||
          (d.accountName ?? "").toLowerCase().includes(q) ||
          (d.conversionName ?? "").toLowerCase().includes(q)
        );
      });
    // server filter
    if (serverFilter !== "All Servers")
      rows = rows.filter((d) => serverGroup(d.server) === serverFilter);
    // account / conversion context filters (parsed from Account_Conversion[_LIVE][_n])
    if (accountFilter !== "All Accounts")
      rows = rows.filter((d) => d.accountName === accountFilter);
    if (conversionFilter !== "All Conversions")
      rows = rows.filter((d) => d.conversionName === conversionFilter);
    // classification filter
    if (classFilter !== "All classifications") {
      rows = rows.filter((d) => {
        if (classFilter === "Unmapped") return isUnmappedDatabase(d);
        return d.classification === classFilter;
      });
    }
    // status filter
    if (statusFilter === "Pending Deletion")
      rows = rows.filter((d) =>
        !excludedIds.includes(d.id) &&
        (d.action === "Delete" || d.action === "Scheduled Delete")
      );
    else if (statusFilter === "Backup & Delete")
      rows = rows.filter((d) => !excludedIds.includes(d.id) && d.action === "Backup & Delete");
    else if (statusFilter === "Backup")
      rows = rows.filter((d) => !excludedIds.includes(d.id) && d.action === "Backup");
    else if (statusFilter === "Excluded")
      rows = rows.filter((d) => excludedIds.includes(d.id));
    else if (statusFilter === "Active")
      rows = rows.filter((d) => !excludedIds.includes(d.id) && d.action === "None");

    return rows;
  }, [dbs, deletedIds, excludedIds, subTab, search, serverFilter, accountFilter, conversionFilter, classFilter, statusFilter]);

  const sortedRows = useMemo(
    () => sortDatabases(visibleRows, sortColumn, sortDir, excludedIds),
    [visibleRows, sortColumn, sortDir, excludedIds]
  );
  const showActionsColumn = subTab !== "Deleted";

  function setSort(key: SortableColumn) {
    if (key === sortColumn) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortColumn(key);
      setSortDir("asc");
    }
  }

  const scheduleDb = scheduleDbId ? dbs.find((d) => d.id === scheduleDbId) ?? null : null;
  const { minIso: minScheduleIso, maxIso: maxScheduleIso } = getDeletionScheduleDateBounds();

  function openScheduleModal(dbId: string, existingDate: string | null) {
    setScheduleDbId(dbId);
    if (existingDate) {
      const x = new Date(existingDate).toISOString().slice(0, 10);
      setScheduleDate(x < minScheduleIso ? minScheduleIso : x);
      return;
    }
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const iso = d.toISOString().slice(0, 10);
    setScheduleDate(iso > maxScheduleIso ? maxScheduleIso : iso);
  }

  function applyScheduledDate() {
    if (!scheduleDbId || !scheduleDate) return;
    if (scheduleDate < minScheduleIso || scheduleDate > maxScheduleIso) return;
    const deletionDateIso = new Date(`${scheduleDate}T00:00:00.000Z`).toISOString();
    scheduleDeletionByDate(scheduleDbId, deletionDateIso);
    setScheduleDbId(null);
    setScheduleDate("");
  }

  const confirmDeleteDb = confirmDeleteDbId
    ? dbs.find((d) => d.id === confirmDeleteDbId) ?? null
    : null;

  function closeDeleteConfirm() {
    setConfirmDeleteDbId(null);
  }

  function confirmDeleteNow() {
    if (!confirmDeleteDbId) return;
    deleteNow(confirmDeleteDbId);
    closeDeleteConfirm();
  }

  const confirmOverrideDb = confirmOverride
    ? dbs.find((d) => d.id === confirmOverride.dbId) ?? null
    : null;

  function closeOverrideConfirm() {
    setConfirmOverride(null);
  }

  function confirmOverrideAction() {
    if (!confirmOverride) return;
    setManualOverride(confirmOverride.dbId, confirmOverride.action);
    closeOverrideConfirm();
  }

  function handleBulkApply(
    items: { dbId: string; action: BulkAction; windowDays?: number; date?: string }[]
  ) {
    const today = new Date();
    const bounds = getDeletionScheduleDateBounds();
    items.forEach(({ dbId, action, windowDays, date }) => {
      if (action === "Reschedule" && date) {
        if (date < bounds.minIso || date > bounds.maxIso) return;
        const deletionDateIso = new Date(`${date}T00:00:00.000Z`).toISOString();
        scheduleDeletionByDate(dbId, deletionDateIso);
      } else if (action === "Scheduled Delete" && windowDays) {
        const d = new Date(today);
        d.setDate(d.getDate() + windowDays);
        scheduleDeletionByDate(dbId, d.toISOString().slice(0, 10));
      } else if (action === "Backup & Delete") {
        setManualOverride(dbId, "Backup & Delete");
      } else if (action === "Backup") {
        setManualOverride(dbId, "Backup");
      } else if (action === "Delete") {
        setManualOverride(dbId, "Delete");
      }
    });
    setShowBulkModal(false);
    setSelectedDbIds(new Set());
  }

  return (
    <div
      className={subTab === "Audit Log" ? "space-y-4" : "flex min-h-0 flex-col gap-4"}
      style={subTab !== "Audit Log" ? { height: "calc(100svh - 6.5rem)", minHeight: 360 } : undefined}
    >
      {/* ── Sub-tabs ─────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex border-b"
        style={{ borderColor: "#ECEFF2" }}
      >
        {SUB_TABS.map((t) => {
          const isActive = subTab === t;
          const count = t === "Deleted" ? deletedIds.length : undefined;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setSubTab(t)}
              className="relative min-h-[40px] px-4 py-2.5 text-[12px] font-medium transition-[color,border-color] focus:outline-none flex items-center gap-1.5"
              style={{
                color: isActive ? "#007A8F" : "#5D6F7E",
                borderBottom: isActive ? "2px solid #007A8F" : "2px solid transparent",
                marginBottom: "-1px",
              }}
            >
              {t}
              {/* Fixed-width badge slot so count 0 vs 1+ does not shift the tab bar */}
              {count !== undefined && (
                <span
                  className="inline-flex h-[16px] w-[20px] shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                  style={{
                    background: count > 0 ? "#F7F8FA" : "transparent",
                    color:      count > 0 ? "#5D6F7E"  : "#C9D1DA",
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Alert — show on All DB and Deleted (not Audit Log) so switching those tabs does not jump layout */}
      {subTab !== "Audit Log" && metrics.expiresIn24h.length > 0 && (
        <div
          className="shrink-0 flex min-h-[44px] items-center gap-3 rounded-[4px] px-3 py-2.5"
          style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}
        >
          <span className="text-[14px]">⚠️</span>
          <p className="flex-1 text-[12px]" style={{ color: "#B23838" }}>
            <strong>{metrics.expiresIn24h.length} database{metrics.expiresIn24h.length > 1 ? "s" : ""}</strong>
            {" "}scheduled for deletion in the next 24 hours — Review before the exclusion window closes.
          </p>
          <button
            type="button"
            className="shrink-0 text-[11px] font-semibold hover:underline focus:outline-none"
            style={{ color: "#B23838" }}
            onClick={() => { setSubTab("All DB"); setStatusFilter("Pending Deletion"); }}
          >
            Review →
          </button>
        </div>
      )}

      {/* ── Stat cards ────────────────────────────────────────────────────── */}
      {subTab !== "Audit Log" && (
        <>
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px]" style={{ color: "#5D6F7E" }}>
              As of <span className="font-medium" style={{ color: "#354756" }}>{formatAsOf(nowIso)}</span>
            </p>
            <div ref={legendRef} className="relative flex items-center gap-2">
              <span className="text-[11px]" style={{ color: "#5D6F7E" }}>Range</span>
              <select
                className="c-select min-w-[124px]"
                value={metricRange}
                onChange={(e) => setMetricRange(e.target.value as MetricRange)}
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              <button
                type="button"
                aria-label="Open status legend"
                className="inline-flex h-[24px] w-[24px] items-center justify-center rounded-full border bg-white transition-colors hover:bg-[#F7F8FA] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007A8F] focus-visible:ring-offset-1"
                style={{ borderColor: "#007A8F" }}
                onClick={() => setShowLegendInfo((v) => !v)}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                  <circle cx="7" cy="7" r="6.25" fill="#FFFFFF" stroke="#007A8F" strokeWidth="1" />
                  <rect x="6.35" y="5.75" width="1.3" height="4.3" rx="0.65" fill="#007A8F" />
                  <circle cx="7" cy="3.85" r="0.85" fill="#007A8F" />
                </svg>
              </button>

              {showLegendInfo && (
                <div
                  className="c-card absolute right-0 top-[calc(100%+6px)] z-[230] w-[540px] max-w-[calc(100vw-24px)] overflow-hidden"
                >
                  <div className="c-card-header flex items-center justify-between">
                    <p className="text-[12px] font-medium" style={{ color: "#5D6F7E", fontWeight: 500 }}>
                      Status reference
                    </p>
                    <button
                      type="button"
                      className="text-[12px] transition-colors hover:text-[#5D6F7E]"
                      style={{ color: "#96A3AF" }}
                      onClick={() => setShowLegendInfo(false)}
                      aria-label="Close status legend"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="grid gap-3 p-3 md:grid-cols-2">
                    <div>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.04em]" style={{ color: "#96A3AF" }}>
                        Status
                      </p>
                      <ul className="space-y-1.5">
                        {STATUS_LEGEND.map((item) => {
                          const s = STATUS_STYLE[item.label] ?? STATUS_STYLE["Active"];
                          return (
                            <li
                              key={item.label}
                              className="rounded-[3px] border px-2 py-1"
                              style={{ borderColor: "#ECEFF2", background: "#FFFFFF" }}
                            >
                              <div
                                className="mb-1 inline-flex rounded-[3px] px-1.5 py-0.5 text-[10px] font-medium"
                                style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
                              >
                                {item.label}
                              </div>
                              <p
                                className="overflow-hidden whitespace-nowrap text-ellipsis text-[10px] leading-[14px]"
                                style={{ color: "#5D6F7E" }}
                                title={item.meaning}
                              >
                                {item.meaning}
                              </p>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.04em]" style={{ color: "#96A3AF" }}>
                        Deliverable / Conv. Status
                      </p>
                      <ul className="space-y-1.5">
                        {DELIVERABLE_LEGEND.map((item) => {
                          const s = DELIVERABLE_STYLE[item.label] ?? DELIVERABLE_STYLE["Blank"];
                          return (
                            <li
                              key={item.label}
                              className="rounded-[3px] border px-2 py-1"
                              style={{ borderColor: "#ECEFF2", background: "#FFFFFF" }}
                            >
                              <div
                                className="mb-1 inline-flex rounded-[3px] px-1.5 py-0.5 text-[10px] font-medium"
                                style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
                              >
                                {item.label}
                              </div>
                              <p
                                className="overflow-hidden whitespace-nowrap text-ellipsis text-[10px] leading-[14px]"
                                style={{ color: "#5D6F7E" }}
                                title={item.meaning}
                              >
                                {item.meaning}
                              </p>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            <StatCard
              label="Total Synced"
              value={metrics.totalSynced}
              sub="Current snapshot across servers"
            />
            <StatCard
              label="Pending Deletion"
              value={metrics.pendingCreatedInRange}
              sub={`Current total ${metrics.pendingDel} · ${metrics.expiresToday} expire${metrics.expiresToday === 1 ? "s" : ""} today`}
              highlight={metrics.expiresToday > 0}
            />
            <StatCard
              label="Backup & Delete"
              value={metrics.backupCreatedInRange}
              sub={`Current total ${metrics.backupDel}`}
            />
            <StatCard
              label="Excluded"
              value={metrics.excludedCreatedInRange}
              sub={`Current total ${metrics.excluded}`}
            />
            <StatCard
              label="Storage Recovered"
              value={`${metrics.storageRecovered} GB`}
              sub={`Deleted in last ${metrics.rangeDays} days`}
            />
          </div>
        </>
      )}

      {/* ── Audit Log tab ─────────────────────────────────────────────────── */}
      {subTab === "Audit Log" && (
        <div className="c-card overflow-hidden">
          <div className="c-card-header">Audit Log</div>
          <p className="px-4 py-2 text-[11px]" style={{ color: "#96A3AF", background: "#FAFBFC" }}>
            Every event records the database and server when applicable. System-wide events show “All”.
          </p>
          <div className="max-h-[min(70vh,600px)] overflow-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead
                className="sticky top-0 z-10"
                style={{ background: "#F7F8FA", borderBottom: "1px solid #ECEFF2" }}
              >
                <tr>
                  {["Time", "Server", "Database", "Type", "Event"].map((h) => (
                    <th key={h} className="cf-th whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activityLog.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-[12px]" style={{ color: "#96A3AF" }}>
                      No activity yet.
                    </td>
                  </tr>
                )}
                {activityLog.map((a) => {
                  const typeLabel =
                    a.category === "trigger" ? "Trigger"
                    : a.category === "system" ? "System"
                    : "User";
                  return (
                    <tr
                      key={a.id}
                      className="border-b"
                      style={{ borderColor: "#ECEFF2" }}
                    >
                      <td className="cf-td align-top tabular-nums" style={{ color: "#5D6F7E" }}>
                        {new Date(a.at).toLocaleString()}
                      </td>
                      <td
                        className="cf-td align-top font-medium"
                        style={{ color: a.server && a.server !== "All" ? "#007A8F" : "#5D6F7E" }}
                      >
                        {a.server ?? (a.dbId ? "—" : "All")}
                      </td>
                      <td className="cf-td align-top font-medium" style={{ color: "#354756" }}>
                        {a.dbName ?? (a.dbId ? a.dbId.slice(0, 8) + "…" : "—")}
                      </td>
                      <td className="cf-td align-top">
                        <span
                          className="text-[10px] font-medium uppercase tracking-wide"
                          style={{
                            color: typeLabel === "Trigger" ? "#C27803" : typeLabel === "System" ? "#96A3AF" : "#007A8F",
                          }}
                        >
                          {typeLabel}
                        </span>
                      </td>
                      <td className="cf-td align-top max-w-md" style={{ color: "#354756" }}>
                        {a.message}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Table (all tabs except Audit Log) — header + filters fixed; only tbody scrolls ─ */}
      {subTab !== "Audit Log" && (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          {/* Filters row */}
          <div className="shrink-0 flex flex-wrap items-end gap-x-3 gap-y-2">
            <div className="flex min-w-[200px] flex-1 flex-col gap-1">
              <label
                htmlFor="overview-db-search"
                className="text-[10px] font-semibold uppercase tracking-[0.06em]"
                style={{ color: "#5D6F7E" }}
              >
                Search
              </label>
              <input
                id="overview-db-search"
                className="c-input w-full"
                placeholder="DB name, account, conversion…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search databases"
              />
            </div>
            <SearchableSelect
              id="server-filter"
              label="Server"
              className="min-w-[148px]"
              value={serverFilter}
              options={servers}
              onChange={setServerFilter}
            />
            <SearchableSelect
              id="account-filter"
              label="Account"
              className="min-w-[152px]"
              value={accountFilter}
              options={accounts}
              onChange={setAccountFilter}
            />
            <SearchableSelect
              id="conversion-filter"
              label="Conversion"
              className="min-w-[152px]"
              value={conversionFilter}
              options={conversions}
              onChange={setConversionFilter}
            />
            <SearchableSelect
              id="classification-filter"
              label="Classification"
              className="min-w-[168px]"
              value={classFilter}
              options={classificationOptions}
              onChange={setClassFilter}
            />
            <SearchableSelect
              id="status-filter"
              label="Status"
              className="min-w-[168px]"
              value={statusFilter}
              options={statusOptions}
              onChange={setStatusFilter}
            />
          </div>

          {/* Table — scrolls inside card; thead stays at top of scrollport */}
          <div
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[4px]"
            style={{ border: "1px solid #ECEFF2" }}
          >
            <div className="min-h-0 flex-1 overflow-auto overscroll-y-contain">
              <table className="w-full border-collapse min-w-[1100px]">
                <thead
                  className="sticky top-0 z-10"
                  style={{ boxShadow: "0 1px 0 0 #ECEFF2" }}
                >
                  <tr style={{ background: "#F7F8FA", borderBottom: "1px solid #ECEFF2" }}>
                    {/* Checkbox header */}
                    <th
                      className="cf-th w-8 shrink-0"
                      style={{ background: "#F7F8FA", paddingLeft: "10px", paddingRight: "4px" }}
                      scope="col"
                    >
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded accent-[#007A8F]"
                        aria-label="Select all"
                        checked={visibleRows.length > 0 && visibleRows.every((r) => selectedDbIds.has(r.id))}
                        ref={(el) => {
                          if (el)
                            el.indeterminate =
                              visibleRows.some((r) => selectedDbIds.has(r.id)) &&
                              !visibleRows.every((r) => selectedDbIds.has(r.id));
                        }}
                        onChange={(e) => {
                          setSelectedDbIds((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) visibleRows.forEach((r) => next.add(r.id));
                            else visibleRows.forEach((r) => next.delete(r.id));
                            return next;
                          });
                        }}
                      />
                    </th>
                    {(
                      showActionsColumn
                        ? ([
                            { label: "DB Name", key: "name" as const },
                            { label: "Account", key: "account" as const },
                            { label: "Conversion", key: "conversion" as const },
                            { label: "Server", key: "server" as const },
                            { label: "Status", key: "status" as const },
                            { label: "Size", key: "size" as const },
                            { label: "Deliverable / Conv. Status", key: "deliverable" as const },
                            { label: "Action Date", key: "actionDate" as const },
                            { label: "Actions", key: null as null },
                          ] as const)
                        : ([
                            { label: "DB Name", key: "name" as const },
                            { label: "Account", key: "account" as const },
                            { label: "Conversion", key: "conversion" as const },
                            { label: "Server", key: "server" as const },
                            { label: "Status", key: "status" as const },
                            { label: "Size", key: "size" as const },
                            { label: "Deliverable / Conv. Status", key: "deliverable" as const },
                            { label: "Action Date", key: "actionDate" as const },
                          ] as const)
                    ).map(({ label, key: sortKey }) => (
                      <th
                        key={label}
                        className="cf-th p-0"
                        style={{ background: "#F7F8FA" }}
                        scope="col"
                        aria-sort={
                          !sortKey
                            ? "none"
                            : sortKey === sortColumn
                              ? sortDir === "asc"
                                ? "ascending"
                                : "descending"
                              : "none"
                        }
                      >
                        {sortKey ? (
                          <button
                            type="button"
                            onClick={() => setSort(sortKey)}
                            className="flex w-full min-h-[40px] items-center justify-start gap-1.5 border-0 px-3 py-2 text-left text-[11px] font-medium uppercase leading-tight tracking-[0.04em] text-[#5D6F7E] transition-colors hover:bg-[#EDF0F3] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#007A8F] active:bg-[#E4E8EC]"
                            style={{ background: "#F7F8FA" }}
                          >
                            <span className="min-w-0 flex-1 select-none whitespace-normal sm:whitespace-nowrap">
                              {label}
                            </span>
                            <span
                              className="shrink-0 text-[9px] leading-[10px] tabular-nums"
                              style={{ color: sortKey === sortColumn ? "#007A8F" : "#C9D1DA" }}
                              aria-hidden
                            >
                              {sortKey === sortColumn ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
                            </span>
                          </button>
                        ) : (
                          <span className="inline-block px-3 py-2">{label}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {visibleRows.length === 0 && (
                    <tr>
                      <td colSpan={showActionsColumn ? 10 : 9} className="py-14 text-center">
                        <p className="text-[13px] font-medium" style={{ color: "#354756" }}>
                          No databases match
                        </p>
                        <p className="text-[12px] mt-1" style={{ color: "#96A3AF" }}>
                          Try adjusting filters or the search term.
                        </p>
                      </td>
                    </tr>
                  )}

                  {sortedRows.map((r, i) => {
                    const isExcluded   = excludedIds.includes(r.id);
                    const status       = rowStatus(r, isExcluded);
                    const statusStyle  = STATUS_STYLE[status] ?? STATUS_STYLE["Active"];
                    const countdown    = deletionCountdown(r.actionDate, r.deletionDate, r.windowDays, todayIso);
                    const daysLeft     = daysUntil(r.deletionDate, todayIso);
                    const isUrgent     = daysLeft !== null && daysLeft <= 1;

                    return (
                      <tr
                        key={r.id}
                        onClick={() => setSelected(r.id)}
                        className="min-h-[52px] cursor-pointer align-middle transition-colors"
                        style={{ background: i % 2 === 0 ? "#FFFFFF" : "#F7F8FA" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#EDF6F7")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? "#FFFFFF" : "#F7F8FA")}
                      >
                        {/* Checkbox */}
                        <td
                          className="cf-td align-middle w-8"
                          style={{ paddingLeft: "10px", paddingRight: "4px" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 rounded accent-[#007A8F]"
                            checked={selectedDbIds.has(r.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              setSelectedDbIds((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(r.id);
                                else next.delete(r.id);
                                return next;
                              });
                            }}
                          />
                        </td>
                        {/* DB Name */}
                        <td className="cf-td align-middle">
                          <span className="font-medium hover:underline" style={{ color: "#007A8F" }}>
                            {r.name}
                          </span>
                        </td>

                        {/* Account */}
                        <td className="cf-td align-middle" style={{ color: "#354756" }}>
                          {r.accountName ?? "—"}
                        </td>

                        {/* Conversion */}
                        <td className="cf-td align-middle" style={{ color: "#5D6F7E" }}>
                          {r.conversionName ?? "—"}
                        </td>

                        {/* Server */}
                        <td className="cf-td align-middle" style={{ color: "#5D6F7E" }}>{serverGroup(r.server)}</td>

                        {/* Status + countdown — reserved 2-line block so all rows same height */}
                        <td className="cf-td align-middle">
                          <div className="flex min-h-[44px] flex-col justify-center gap-0.5">
                            <span
                              className="c-tag w-fit"
                              style={{
                                background: statusStyle.bg,
                                color:      statusStyle.color,
                                border:     `1px solid ${statusStyle.border}`,
                              }}
                            >
                              {status}
                            </span>
                            <div
                              className="min-h-[14px] text-[10px] leading-[14px] flex items-center gap-1"
                              style={{ color: countdown?.urgent ? "#B23838" : "#96A3AF" }}
                            >
                              {countdown ? (
                                <>
                                  {countdown.urgent && "⚠️ "}
                                  {countdown.label}
                                </>
                              ) : (
                                <span className="invisible text-[10px] leading-[14px]" aria-hidden>
                                  Day 0 of 0
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Size */}
                        <td className="cf-td align-middle" style={{ color: "#354756" }}>{r.sizeGb} GB</td>

                        {/* Deliverable / Conv. Status */}
                        <td className="cf-td align-middle">
                          {normalizedDeliverableStatus(r) ? (
                            (() => {
                              const deliverable = normalizedDeliverableStatus(r) as keyof typeof DELIVERABLE_STYLE;
                              const ds = DELIVERABLE_STYLE[deliverable] ?? DELIVERABLE_STYLE.Blank;
                              return (
                                <span
                                  className="inline-flex min-h-[22px] items-center gap-1.5 rounded-[3px] px-2 py-0.5 text-[11px] font-medium"
                                  style={{ background: ds.bg, color: ds.color, border: `1px solid ${ds.border}` }}
                                >
                                  {deliverable}
                                </span>
                              );
                            })()
                          ) : (
                            <span className="inline-flex min-h-[22px] items-center" aria-label="No linked deliverable status" />
                          )}
                        </td>

                        {/* Action Date */}
                        <td className="cf-td align-middle">
                          {r.deletionDate ? (
                            <span
                              style={{ color: isUrgent ? "#B23838" : "#5D6F7E" }}
                              className={isUrgent ? "font-semibold" : ""}
                            >
                              {formatShortDate(r.deletionDate)}
                            </span>
                          ) : (
                            <span style={{ color: "#C9D1DA" }}>—</span>
                          )}
                        </td>

                        {showActionsColumn && (
                          <td className="cf-td align-middle" onClick={(e) => e.stopPropagation()}>
                            {selectedDbIds.has(r.id) ? (
                              <span className="inline-flex items-center gap-1 text-[10px]" style={{ color: "#007A8F" }}>
                                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
                                  <circle cx="8" cy="8" r="7" stroke="#007A8F" strokeWidth="1.5"/>
                                  <path d="M5 8l2 2 4-4" stroke="#007A8F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                In bulk
                              </span>
                            ) : (
                            <div className="flex min-h-[44px] min-w-0 flex-wrap content-center items-center justify-start gap-1.5">
                              {isExcluded ? (
                                <ActionBtn
                                  label="Lift Exclusion"
                                  variant="ghost"
                                  onClick={() => liftExclusion(r.id)}
                                />
                              ) : status === "Pending Deletion" ? (
                                <>
                                  <ActionBtn label="Reschedule" variant="outline" onClick={() => openScheduleModal(r.id, r.deletionDate)} />
                                  <ActionBtn label="Delete Now" variant="danger"  onClick={() => setConfirmDeleteDbId(r.id)} />
                                </>
                              ) : status === "Backup & Delete" ? (
                                <>
                                  <ActionBtn label="Reschedule" variant="outline" onClick={() => openScheduleModal(r.id, r.deletionDate)} />
                                  <ActionBtn label="Details"  variant="ghost"   onClick={() => setSelected(r.id)} />
                                </>
                              ) : status === "Active" ? (
                                <>
                                  <ActionBtn
                                    label="Delete"
                                    variant="danger"
                                    onClick={() => setConfirmOverride({ dbId: r.id, action: "Delete" })}
                                  />
                                  <ActionBtn
                                    label="Backup"
                                    variant="outline"
                                    onClick={() => setConfirmOverride({ dbId: r.id, action: "Backup & Delete" })}
                                  />
                                </>
                              ) : (
                                <ActionBtn label="Details" variant="ghost" onClick={() => setSelected(r.id)} />
                              )}
                            </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table footer — always visible (below row scroll) */}
            <div
              className="shrink-0 flex items-center justify-between px-3 py-2"
              style={{ borderTop: "1px solid #ECEFF2", background: "#F7F8FA" }}
            >
              <p className="text-[11px]" style={{ color: "#96A3AF" }}>
                Showing {visibleRows.length} of {dbs.filter((d) => !deletedIds.includes(d.id)).length} databases
              </p>
              {/* Classification quick legend */}
              <div className="flex items-center gap-3">
                {[
                  { label: "Account",    bg: "#E0F2F5", color: "#007A8F" },
                  { label: "Conversion", bg: "#FFFBEB", color: "#C27803" },
                  { label: "Live",       bg: "#FFF7ED", color: "#C2620E" },
                  { label: "Unmapped",   bg: "#F7F8FA", color: "#5D6F7E" },
                ].map(({ label, bg, color }) => (
                  <span key={label} className="flex items-center gap-1 text-[10px]" style={{ color }}>
                    <span className="inline-block h-[8px] w-[8px] rounded-full" style={{ background: bg, border: `1px solid ${color}` }} />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── DB Detail Slideout ────────────────────────────────────────────── */}
      {selected && (
        <DBDetailSlideout dbId={selected} onClose={() => setSelected(null)} />
      )}

      {/* ── Floating Bulk Action Bar ──────────────────────────────────────── */}
      {selectedDbIds.size > 0 && (
        <div
          className="fixed bottom-5 left-1/2 z-[150] -translate-x-1/2 flex items-center gap-3 rounded-[6px] px-4 py-2.5"
          style={{ background: "#0D161D", boxShadow: "0 4px 20px rgba(13,22,29,0.4)", minWidth: "320px" }}
        >
          <span className="text-[12px] font-medium" style={{ color: "#FFFFFF" }}>
            {selectedDbIds.size} DB{selectedDbIds.size > 1 ? "s" : ""} selected
          </span>
          <button
            type="button"
            className="ml-auto flex items-center gap-1.5 rounded-[4px] px-3 py-1.5 text-[12px] font-medium transition-opacity hover:opacity-90"
            style={{ background: "#007A8F", color: "#FFFFFF" }}
            onClick={() => setShowBulkModal(true)}
          >
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none" aria-hidden className="shrink-0">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Bulk Action
          </button>
          <button
            type="button"
            className="text-[11px] transition-opacity hover:opacity-70"
            style={{ color: "#96A3AF" }}
            onClick={() => setSelectedDbIds(new Set())}
            aria-label="Clear selection"
          >
            Clear
          </button>
        </div>
      )}

      {/* ── Bulk Action Modal ─────────────────────────────────────────────── */}
      {showBulkModal && (() => {
        const selectedRows = dbs.filter((r) => selectedDbIds.has(r.id));
        return (
          <BulkActionModal
            rows={selectedRows}
            onClose={() => setShowBulkModal(false)}
            onApply={handleBulkApply}
          />
        );
      })()}

      {/* Schedule override modal (replaces Exclude in table actions) */}
      {scheduleDb && (
        <>
          <div
            className="fixed inset-0 z-[160]"
            style={{ background: "rgba(13,22,29,0.24)" }}
            onClick={() => { setScheduleDbId(null); setScheduleDate(""); }}
            aria-hidden
          />
          <div
            className="fixed left-1/2 top-1/2 z-[170] w-[420px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[6px] bg-white"
            style={{ border: "1px solid #ECEFF2", boxShadow: "0 8px 28px rgba(13,22,29,0.28)" }}
          >
            <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "#ECEFF2", background: "#F7F8FA" }}>
              <h3 className="text-[14px] font-semibold" style={{ color: "#5D6F7E" }}>Schedule deletion date</h3>
              <button
                type="button"
                className="text-[16px]"
                style={{ color: "#96A3AF" }}
                onClick={() => { setScheduleDbId(null); setScheduleDate(""); }}
                aria-label="Close schedule dialog"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 px-4 py-4">
              <p className="text-[12px]" style={{ color: "#354756" }}>
                <span className="font-medium">{scheduleDb.name}</span>
              </p>
              <p className="text-[11px]" style={{ color: "#5D6F7E" }}>
                Reschedule range: <strong style={{ color: "#354756" }}>tomorrow</strong> through{" "}
                <strong style={{ color: "#354756" }}>two months from today</strong> (
                {formatShortDate(minScheduleIso)} – {formatShortDate(maxScheduleIso)}). This DB will follow your selected schedule.
              </p>
              <label className="flex flex-col gap-1">
                <span className="text-[11px]" style={{ color: "#5D6F7E" }}>Deletion date</span>
                <input
                  type="date"
                  className="c-input w-full"
                  min={minScheduleIso}
                  max={maxScheduleIso}
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                />
              </label>
            </div>
            <div className="flex items-center justify-end gap-2 border-t px-4 py-3" style={{ borderColor: "#ECEFF2" }}>
              <button
                type="button"
                className="c-btn-ghost"
                onClick={() => { setScheduleDbId(null); setScheduleDate(""); }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="c-btn-primary"
                disabled={!scheduleDate || scheduleDate < minScheduleIso || scheduleDate > maxScheduleIso}
                onClick={applyScheduledDate}
              >
                Save date
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete confirmation modal */}
      {confirmDeleteDb && (
        <>
          <div
            className="fixed inset-0 z-[180]"
            style={{ background: "rgba(13,22,29,0.24)" }}
            onClick={closeDeleteConfirm}
            aria-hidden
          />
          <div
            className="fixed left-1/2 top-1/2 z-[190] w-[420px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[6px] bg-white"
            style={{ border: "1px solid #ECEFF2", boxShadow: "0 8px 28px rgba(13,22,29,0.28)" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-delete-title"
          >
            <div
              className="flex items-center justify-between border-b px-4 py-3"
              style={{ borderColor: "#ECEFF2", background: "#F7F8FA" }}
            >
              <h3 id="confirm-delete-title" className="text-[14px] font-semibold" style={{ color: "#5D6F7E" }}>
                Confirm delete now
              </h3>
              <button
                type="button"
                className="text-[16px]"
                style={{ color: "#96A3AF" }}
                onClick={closeDeleteConfirm}
                aria-label="Close delete confirmation dialog"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 px-4 py-4">
              <p className="text-[12px]" style={{ color: "#354756" }}>
                You are about to delete <span className="font-medium">{confirmDeleteDb.name}</span>.
              </p>
              <p className="text-[11px]" style={{ color: "#5D6F7E" }}>
                This action executes immediate cleanup for this database and cannot be undone from this screen.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 border-t px-4 py-3" style={{ borderColor: "#ECEFF2" }}>
              <button type="button" className="c-btn-ghost" onClick={closeDeleteConfirm}>
                Cancel
              </button>
              <button type="button" className="c-btn-primary" onClick={confirmDeleteNow}>
                Delete now
              </button>
            </div>
          </div>
        </>
      )}

      {/* Manual override confirmation modal (Delete / Backup) */}
      {confirmOverride && confirmOverrideDb && (
        <>
          <div
            className="fixed inset-0 z-[180]"
            style={{ background: "rgba(13,22,29,0.24)" }}
            onClick={closeOverrideConfirm}
            aria-hidden
          />
          <div
            className="fixed left-1/2 top-1/2 z-[190] w-[420px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[6px] bg-white"
            style={{ border: "1px solid #ECEFF2", boxShadow: "0 8px 28px rgba(13,22,29,0.28)" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-override-title"
          >
            <div
              className="flex items-center justify-between border-b px-4 py-3"
              style={{ borderColor: "#ECEFF2", background: "#F7F8FA" }}
            >
              <h3 id="confirm-override-title" className="text-[14px] font-semibold" style={{ color: "#5D6F7E" }}>
                Confirm action
              </h3>
              <button
                type="button"
                className="text-[16px]"
                style={{ color: "#96A3AF" }}
                onClick={closeOverrideConfirm}
                aria-label="Close action confirmation dialog"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 px-4 py-4">
              <p className="text-[12px]" style={{ color: "#354756" }}>
                Apply <span className="font-medium">{confirmOverride.action === "Delete" ? "Delete" : "Backup & Delete"}</span> for{" "}
                <span className="font-medium">{confirmOverrideDb.name}</span>?
              </p>
              <p className="text-[11px]" style={{ color: "#5D6F7E" }}>
                {confirmOverride.action === "Delete"
                  ? "This will set this database to the delete flow immediately."
                  : "This will set this database to backup before delete flow."}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 border-t px-4 py-3" style={{ borderColor: "#ECEFF2" }}>
              <button type="button" className="c-btn-ghost" onClick={closeOverrideConfirm}>
                Cancel
              </button>
              <button type="button" className="c-btn-primary" onClick={confirmOverrideAction}>
                Confirm
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Deriviz — Overview page (CareFlow tokens: cf-* Tailwind + index.css components)

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { DBDetailSlideout } from "../components/DBDetailSlideout";
import { useDerivizStore } from "../store/useDerivizStore";
import { formatShortDate } from "../lib/classify";
import { cn } from "../lib/cn";
import {
  activityEntryMatchesTeam,
  matchesTeamFilter,
  serverGroup,
  teamFilterLabel,
  type TeamFilter,
} from "../lib/teams";
import type { DatabaseRow } from "../types";

// ── helpers ──────────────────────────────────────────────────────────────────

function daysBetween(a: string, b: string) {
  // Compare by calendar date only (UTC midnight) to avoid time-of-day
  // off-by-one issues like "6d remain · Day 1 of 5".
  const aDate = new Date(a).toISOString().slice(0, 10);
  const bDate = new Date(b).toISOString().slice(0, 10);
  const aUtc = Date.parse(`${aDate}T00:00:00.000Z`);
  const bUtc = Date.parse(`${bDate}T00:00:00.000Z`);
  return Math.trunc((bUtc - aUtc) / 86_400_000);
}

function daysUntil(iso: string | null, todayIso: string): number | null {
  if (!iso) return null;
  return daysBetween(todayIso, iso);
}

function isoDateOnly(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
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

function addDaysToIsoDate(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

type LiftExclusionDecision =
  | { kind: "simple" }
  | { kind: "auto_next_day"; nextDateIso: string }
  | { kind: "choose_date"; suggestedDateIso: string; frameEndIso: string };

function getLiftExclusionDecision(
  db: DatabaseRow,
  minScheduleIso: string,
  maxScheduleIso: string,
  todayIso: string
): LiftExclusionDecision {
  // Apply special handling only for LIVE backup+delete flows that have an implementation/action anchor.
  if (db.action !== "Backup & Delete" || !db.actionDate) return { kind: "simple" };

  const frameEndIso = addDaysToIsoDate(new Date(db.actionDate).toISOString().slice(0, 10), 30);
  if (todayIso >= frameEndIso) {
    return { kind: "auto_next_day", nextDateIso: minScheduleIso };
  }

  const suggestedDateIso = frameEndIso > minScheduleIso ? frameEndIso : minScheduleIso;
  return {
    kind: "choose_date",
    suggestedDateIso: suggestedDateIso > maxScheduleIso ? maxScheduleIso : suggestedDateIso,
    frameEndIso,
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
  "Deleted":          { bg: "#F3F4F6", color: "#374151", border: "#D1D5DB" },
  "Pending Deletion": { bg: "#FEF2F2", color: "#B23838", border: "#FECACA" },
  "Backup & Delete":  { bg: "#FFFBEB", color: "#C27803", border: "#FDE68A" },
  "Backup":           { bg: "#EFF6FF", color: "#1D61C8", border: "#BFDBFE" },
  "Excluded":         { bg: "#F7F8FA", color: "#5D6F7E", border: "#C9D1DA" },
  "Active":           { bg: "#F0FDF4", color: "#1B8A4A", border: "#BBF7D0" },
};

const STATUS_LEGEND = [
  { label: "Active", meaning: "Monitored; no delete flow yet." },
  { label: "Pending Deletion", meaning: "Delete queued — adjust date in the panel and save." },
  { label: "Backup & Delete", meaning: "Backup first, then delete on schedule." },
  { label: "Excluded", meaning: "Skipped by automation; excluding takes action + triggered date. Turn off to lift." },
  { label: "Deleted", meaning: "Off active list; kept under Deleted for audit." },
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
        const ad = a.actionDate;
        const bd = b.actionDate;
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

/** Keep table row order stable while the detail slideout is open so saves do not reshuffle rows. */
function orderRowsByPinnedIds(
  rows: DatabaseRow[],
  pin: string[],
  sortColumn: SortableColumn,
  sortDir: "asc" | "desc",
  excludedIds: string[]
): DatabaseRow[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const ordered: DatabaseRow[] = [];
  const seen = new Set<string>();
  for (const id of pin) {
    const r = byId.get(id);
    if (r) {
      ordered.push(r);
      seen.add(id);
    }
  }
  const rest = rows.filter((r) => !seen.has(r.id));
  if (rest.length) ordered.push(...sortDatabases(rest, sortColumn, sortDir, excludedIds));
  return ordered;
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
    <div className="c-card flex min-h-[128px] min-w-[140px] flex-col overflow-hidden p-0">
      <div className="c-card-header !rounded-none py-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-cf-secondary">
          {label}
        </span>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-1 px-3 py-3">
        <p
          className={cn(
            "text-[22px] font-semibold tabular-nums leading-tight",
            highlight ? "text-cf-danger" : "text-cf-gs-100"
          )}
        >
          {value}
        </p>
        <p className="text-[11px] leading-snug text-cf-muted">{sub}</p>
      </div>
    </div>
  );
}

// ── action button ─────────────────────────────────────────────────────────────
function ActionBtn({
  label, variant = "outline", onClick,
}: { label: string; variant?: "outline" | "danger" | "ghost"; onClick: () => void }) {
  const variantClass =
    variant === "outline"
      ? "border-cf-primary bg-white text-cf-primary hover:bg-cf-primary-light/50"
      : variant === "danger"
        ? "border-cf-danger bg-white text-cf-danger hover:bg-cf-danger-bg"
        : "border-cf-gs-20 bg-white text-cf-secondary hover:bg-cf-gs-5";
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn(
        "inline-flex h-6 items-center rounded-cf-sm border px-2 text-[11px] font-medium transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-cf-primary focus-visible:ring-offset-1",
        variantClass
      )}
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
        <label htmlFor={id} className="cf-field-label shrink-0">
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
        className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-cf-secondary transition-colors hover:text-cf-text"
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
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-[220] overflow-hidden rounded-cf border border-cf-gs-20 bg-white shadow-modal">
          <div className="max-h-[220px] overflow-auto py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const selected = opt === value;
                return (
                  <button
                    key={opt}
                    type="button"
                    className={cn(
                      "flex w-full items-center px-2.5 py-1.5 text-left text-[12px] transition-colors",
                      selected
                        ? "bg-cf-primary-light font-medium text-cf-primary"
                        : "bg-white text-cf-text hover:bg-cf-gs-5"
                    )}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => commit(opt)}
                  >
                    {opt}
                  </button>
                );
              })
            ) : (
              <div className="px-2.5 py-2 text-[11px] text-cf-muted">
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

// ── main page ─────────────────────────────────────────────────────────────────
export function Overview({
  teamFilter,
  requestedServerFilter,
  onServerFilterApplied,
}: {
  teamFilter: TeamFilter;
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
  const [sortColumn, setSortColumn] = useState<SortableColumn>("actionDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [scheduleDbId, setScheduleDbId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [confirmDeleteDbId, setConfirmDeleteDbId] = useState<string | null>(null);
  const [liftExclusionPrompt, setLiftExclusionPrompt] = useState<{
    dbId: string;
    dbName: string;
    frameEndIso: string;
  } | null>(null);
  const [liftExclusionDate, setLiftExclusionDate] = useState("");
  const [confirmOverride, setConfirmOverride] = useState<{
    dbId: string;
    action: ConfirmOverrideAction;
  } | null>(null);
  const [showLegendInfo, setShowLegendInfo] = useState(false);
  const legendRef = useRef<HTMLDivElement | null>(null);
  const [metricRange, setMetricRange] = useState<MetricRange>("30d");
  const [nowIso, setNowIso] = useState<string>(() => new Date().toISOString());
  /** Freeze row order while editing and after Save until sort changes (avoids row “jumping”). */
  const [detailPinOrder, setDetailPinOrder] = useState<string[] | null>(null);
  const lastDetailSelectedRef = useRef<string | null>(null);
  const lastDetailSortKeyRef = useRef<string | null>(null);
  const lastClosedDetailIdRef = useRef<string | null>(null);

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
  const teamScopedDbs = useMemo(
    () => dbs.filter((d) => matchesTeamFilter(d.server, teamFilter)),
    [dbs, teamFilter]
  );
  const effectiveDeletedIds = useMemo(() => {
    const next = new Set(deletedIds);
    dbs.forEach((d) => {
      if (next.has(d.id)) return;
      if (excludedIds.includes(d.id)) return;
      if (!d.deletionDate) return;
      const status = rowStatus(d, false);
      if (status !== "Pending Deletion" && status !== "Backup & Delete") return;
      // Automated cleanup should remove due rows from active/pending view.
      if (isoDateOnly(d.deletionDate) <= todayIso) next.add(d.id);
    });
    return Array.from(next);
  }, [dbs, deletedIds, excludedIds, todayIso]);

  // unique servers
  const servers = useMemo(
    () => ["All Servers", ...Array.from(new Set(teamScopedDbs.map((d) => serverGroup(d.server))))],
    [teamScopedDbs]
  );
  const accounts = useMemo(
    () => [
      "All Accounts",
      ...Array.from(new Set(teamScopedDbs.map((d) => d.accountName).filter((x): x is string => Boolean(x)))),
    ],
    [teamScopedDbs]
  );
  const conversions = useMemo(() => {
    const scoped = accountFilter === "All Accounts"
      ? teamScopedDbs
      : teamScopedDbs.filter((d) => d.accountName === accountFilter);
    return [
      "All Conversions",
      ...Array.from(new Set(scoped.map((d) => d.conversionName).filter((x): x is string => Boolean(x)))),
    ];
  }, [accountFilter, teamScopedDbs]);
  const classificationOptions = ["All classifications", "Account", "Conversion", "Live", "Unmapped"];
  const statusOptions = ["All statuses", "Active", "Pending Deletion", "Backup & Delete", "Excluded"];
  const scopedActivityLog = useMemo(
    () => activityLog.filter((entry) => activityEntryMatchesTeam(entry, dbs, teamFilter)),
    [activityLog, dbs, teamFilter]
  );
  const teamDeletedCount = useMemo(
    () =>
      effectiveDeletedIds.filter((id) => {
        const db = dbs.find((d) => d.id === id);
        return db ? matchesTeamFilter(db.server, teamFilter) : false;
      }).length,
    [dbs, effectiveDeletedIds, teamFilter]
  );

  useEffect(() => {
    if (conversionFilter !== "All Conversions" && !conversions.includes(conversionFilter)) {
      setConversionFilter("All Conversions");
    }
  }, [conversionFilter, conversions]);

  useEffect(() => {
    if (serverFilter !== "All Servers" && !servers.includes(serverFilter)) {
      setServerFilter("All Servers");
    }
  }, [serverFilter, servers, teamFilter]);

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
    const active = teamScopedDbs.filter((d) => !effectiveDeletedIds.includes(d.id));
    const rangeDays = RANGE_DAYS[metricRange];
    const rangeStartMs = new Date(nowIso).getTime() - rangeDays * 86_400_000;
    const inRange = (iso: string | null) => {
      if (!iso) return false;
      const t = new Date(iso).getTime();
      return t >= rangeStartMs;
    };

    const pendingDel = active.filter((d) => rowStatus(d, excludedIds.includes(d.id)) === "Pending Deletion");
    const backupDel = active.filter((d) => rowStatus(d, excludedIds.includes(d.id)) === "Backup & Delete");
    const excl = active.filter((d) => excludedIds.includes(d.id));
    const expiresToday = pendingDel.filter((d) => daysUntil(d.deletionDate, todayIso) === 0).length;
    const expiresIn24h = pendingDel.filter((d) => {
      const n = daysUntil(d.deletionDate, todayIso);
      return n !== null && n <= 1;
    });
    const storageRecovered = teamScopedDbs
      .filter((d) => effectiveDeletedIds.includes(d.id) && inRange(deletedAtById[d.id] ?? nowIso))
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
  }, [teamScopedDbs, excludedIds, effectiveDeletedIds, deletedAtById, metricRange, nowIso, todayIso]);

  // filter rows by sub-tab
  const visibleRows = useMemo(() => {
    let rows = teamScopedDbs.filter((d) => !effectiveDeletedIds.includes(d.id));
    if (subTab === "Deleted")
      rows = teamScopedDbs.filter((d) => effectiveDeletedIds.includes(d.id));

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
      rows = rows.filter((d) => rowStatus(d, excludedIds.includes(d.id)) === "Pending Deletion");
    else if (statusFilter === "Backup & Delete")
      rows = rows.filter((d) => rowStatus(d, excludedIds.includes(d.id)) === "Backup & Delete");
    else if (statusFilter === "Excluded")
      rows = rows.filter((d) => rowStatus(d, excludedIds.includes(d.id)) === "Excluded");
    else if (statusFilter === "Active")
      rows = rows.filter((d) => rowStatus(d, excludedIds.includes(d.id)) === "Active");

    return rows;
  }, [teamScopedDbs, effectiveDeletedIds, excludedIds, subTab, search, serverFilter, accountFilter, conversionFilter, classFilter, statusFilter]);

  const sortedRows = useMemo(
    () => sortDatabases(visibleRows, sortColumn, sortDir, excludedIds),
    [visibleRows, sortColumn, sortDir, excludedIds]
  );

  useLayoutEffect(() => {
    const sortKey = `${sortColumn}:${sortDir}`;

    if (!selected) {
      if (lastDetailSelectedRef.current) {
        lastClosedDetailIdRef.current = lastDetailSelectedRef.current;
      }
      // Keep frozen order after closing the slideout (e.g. Save). Clear pin when sort changes.
      if (lastDetailSortKeyRef.current !== null && sortKey !== lastDetailSortKeyRef.current) {
        setDetailPinOrder(null);
      }
      lastDetailSortKeyRef.current = sortKey;
      lastDetailSelectedRef.current = null;
      return;
    }

    const selChanged = selected !== lastDetailSelectedRef.current;
    const sortChanged =
      lastDetailSortKeyRef.current !== null && sortKey !== lastDetailSortKeyRef.current;
    const reopeningSameRowWhilePinned =
      (detailPinOrder?.length ?? 0) > 0 &&
      selected === lastClosedDetailIdRef.current &&
      selChanged;

    lastDetailSelectedRef.current = selected;
    lastDetailSortKeyRef.current = sortKey;

    if (sortChanged) {
      setDetailPinOrder(sortDatabases(visibleRows, sortColumn, sortDir, excludedIds).map((r) => r.id));
      return;
    }
    if (selChanged && !reopeningSameRowWhilePinned) {
      setDetailPinOrder(sortDatabases(visibleRows, sortColumn, sortDir, excludedIds).map((r) => r.id));
    }
  }, [selected, visibleRows, sortColumn, sortDir, excludedIds, detailPinOrder]);

  useEffect(() => {
    setDetailPinOrder(null);
    lastClosedDetailIdRef.current = null;
  }, [subTab]);

  const tableRows = useMemo(() => {
    if (!detailPinOrder?.length) return sortedRows;
    return orderRowsByPinnedIds(visibleRows, detailPinOrder, sortColumn, sortDir, excludedIds);
  }, [visibleRows, sortedRows, detailPinOrder, sortColumn, sortDir, excludedIds]);

  // Keep row-level action buttons inside the detail slideout to reduce table noise.
  const showActionsColumn = false;

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

  function openLiftExclusionFlow(db: DatabaseRow) {
    const decision = getLiftExclusionDecision(db, minScheduleIso, maxScheduleIso, todayIso);
    if (decision.kind === "simple") {
      liftExclusion(db.id);
      return;
    }
    if (decision.kind === "auto_next_day") {
      const deletionDateIso = new Date(`${decision.nextDateIso}T00:00:00.000Z`).toISOString();
      scheduleDeletionByDate(db.id, deletionDateIso);
      return;
    }
    setLiftExclusionPrompt({
      dbId: db.id,
      dbName: db.name,
      frameEndIso: decision.frameEndIso,
    });
    setLiftExclusionDate(decision.suggestedDateIso);
  }

  function closeLiftExclusionPrompt() {
    setLiftExclusionPrompt(null);
    setLiftExclusionDate("");
  }

  function confirmLiftExclusionDate() {
    if (!liftExclusionPrompt || !liftExclusionDate) return;
    if (liftExclusionDate < minScheduleIso || liftExclusionDate > maxScheduleIso) return;
    const deletionDateIso = new Date(`${liftExclusionDate}T00:00:00.000Z`).toISOString();
    scheduleDeletionByDate(liftExclusionPrompt.dbId, deletionDateIso);
    closeLiftExclusionPrompt();
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

  return (
    <div
      className={subTab === "Audit Log" ? "space-y-4" : "flex min-h-0 flex-col gap-4"}
      style={subTab !== "Audit Log" ? { height: "calc(100svh - 6.5rem)", minHeight: 360 } : undefined}
    >
      {/* ── Sub-tabs ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex border-b border-cf-border-soft bg-white">
        {SUB_TABS.map((t) => {
          const isActive = subTab === t;
          const count = t === "Deleted" ? teamDeletedCount : undefined;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setSubTab(t)}
              className={cn(
                "relative flex min-h-[40px] items-center gap-1.5 px-4 py-2.5 text-[12px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cf-primary",
                isActive
                  ? "border-b-2 border-cf-primary text-cf-primary"
                  : "border-b-2 border-transparent text-cf-secondary hover:text-cf-text"
              )}
              style={{ marginBottom: "-1px" }}
            >
              {t}
              {/* Fixed-width badge slot so count 0 vs 1+ does not shift the tab bar */}
              {count !== undefined && (
                <span
                  className={cn(
                    "inline-flex h-[16px] w-[20px] shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                    count > 0 ? "bg-cf-surface text-cf-secondary" : "bg-transparent text-cf-gs-20"
                  )}
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
        <div className="shrink-0 flex min-h-[44px] items-center gap-3 rounded-cf border border-cf-danger-border bg-cf-danger-bg px-3 py-2.5 shadow-card">
          <span className="text-[14px]" aria-hidden>
            ⚠️
          </span>
          <p className="flex-1 text-[12px] text-cf-danger">
            <strong>{metrics.expiresIn24h.length} database{metrics.expiresIn24h.length > 1 ? "s" : ""}</strong>
            {" "}scheduled for deletion in the next 24 hours — Review before the exclusion window closes.
          </p>
          <button
            type="button"
            className="shrink-0 text-[11px] font-semibold text-cf-danger underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-cf-danger focus-visible:ring-offset-1"
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
            <p className="text-[11px] text-cf-secondary">
              As of <span className="font-medium text-cf-text">{formatAsOf(nowIso)}</span>
              <span className="text-cf-muted"> · {teamFilterLabel(teamFilter)}</span>
            </p>
            <div ref={legendRef} className="relative flex items-center gap-2">
              <span className="text-[11px] font-medium text-cf-secondary">Range</span>
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
                className="inline-flex h-[24px] w-[24px] items-center justify-center rounded-full border border-cf-primary bg-white text-cf-primary transition-colors hover:bg-cf-primary-light/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-cf-primary focus-visible:ring-offset-1"
                onClick={() => setShowLegendInfo((v) => !v)}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="text-cf-primary">
                  <circle cx="7" cy="7" r="6.25" fill="none" stroke="currentColor" strokeWidth="1" />
                  <rect x="6.35" y="5.75" width="1.3" height="4.3" rx="0.65" fill="currentColor" />
                  <circle cx="7" cy="3.85" r="0.85" fill="currentColor" />
                </svg>
              </button>

              {showLegendInfo && (
                <div
                  className="c-card absolute right-0 top-[calc(100%+6px)] z-[230] w-[540px] max-w-[calc(100vw-24px)] overflow-hidden"
                >
                  <div className="c-card-header flex items-center justify-between">
                    <p className="text-[12px] font-medium text-cf-secondary">
                      Status reference
                    </p>
                    <button
                      type="button"
                      className="text-[12px] text-cf-muted transition-colors hover:text-cf-secondary"
                      onClick={() => setShowLegendInfo(false)}
                      aria-label="Close status legend"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="grid gap-3 p-3 md:grid-cols-2">
                    <div>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-cf-muted">
                        Status
                      </p>
                      <ul className="space-y-1.5">
                        {STATUS_LEGEND.map((item) => {
                          const s = STATUS_STYLE[item.label] ?? STATUS_STYLE["Active"];
                          return (
                            <li
                              key={item.label}
                              className="rounded-cf-sm border border-cf-border-soft bg-white px-2 py-1"
                            >
                              <div
                                className="mb-1 inline-flex rounded-[3px] px-1.5 py-0.5 text-[10px] font-medium"
                                style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
                              >
                                {item.label}
                              </div>
                              <p className="text-[10px] leading-[15px] text-cf-secondary">
                                {item.meaning}
                              </p>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-cf-muted">
                        Deliverable / Conv. Status
                      </p>
                      <ul className="space-y-1.5">
                        {DELIVERABLE_LEGEND.map((item) => {
                          const s = DELIVERABLE_STYLE[item.label] ?? DELIVERABLE_STYLE["Blank"];
                          return (
                            <li
                              key={item.label}
                              className="rounded-cf-sm border border-cf-border-soft bg-white px-2 py-1"
                            >
                              <div
                                className="mb-1 inline-flex rounded-[3px] px-1.5 py-0.5 text-[10px] font-medium"
                                style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
                              >
                                {item.label}
                              </div>
                              <p className="text-[10px] leading-[15px] text-cf-secondary">
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
          <p className="border-b border-cf-border-soft bg-cf-surface px-4 py-2 text-[11px] text-cf-muted">
            Every event records the database and server when applicable. System-wide events show “All”.
          </p>
          <div className="max-h-[min(70vh,600px)] overflow-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead className="sticky top-0 z-10 border-b border-cf-border-soft bg-cf-surface">
                <tr>
                  {["Time", "Server", "Database", "Type", "Event"].map((h) => (
                    <th key={h} className="cf-th whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scopedActivityLog.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-[12px] text-cf-muted">
                      No activity yet.
                    </td>
                  </tr>
                )}
                {scopedActivityLog.map((a) => {
                  const typeLabel =
                    a.category === "trigger" ? "Trigger"
                    : a.category === "system" ? "System"
                    : "User";
                  return (
                    <tr key={a.id} className="border-b border-cf-border-soft">
                      <td className="cf-td align-top tabular-nums text-cf-secondary">
                        {new Date(a.at).toLocaleString()}
                      </td>
                      <td
                        className={cn(
                          "cf-td align-top font-medium",
                          a.server && a.server !== "All" ? "text-cf-primary" : "text-cf-secondary"
                        )}
                      >
                        {a.server ?? (a.dbId ? "—" : "All")}
                      </td>
                      <td className="cf-td align-top font-medium text-cf-text">
                        {a.dbName ?? (a.dbId ? a.dbId.slice(0, 8) + "…" : "—")}
                      </td>
                      <td className="cf-td align-top">
                        <span
                          className={cn(
                            "text-[10px] font-medium uppercase tracking-wide",
                            typeLabel === "Trigger" && "text-cf-warning",
                            typeLabel === "System" && "text-cf-muted",
                            typeLabel === "User" && "text-cf-primary"
                          )}
                        >
                          {typeLabel}
                        </span>
                      </td>
                      <td className="cf-td max-w-md align-top text-cf-text">
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
              <label htmlFor="overview-db-search" className="cf-field-label">
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

          {/* Table — CareFlow c-card chrome; tbody scrolls */}
          <div className="c-card flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-cf-border-soft bg-cf-surface px-3 py-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-cf-secondary">
                Databases
              </span>
              <span className="text-[11px] tabular-nums text-cf-muted">
                {visibleRows.length} shown · {dbs.filter((d) => !effectiveDeletedIds.includes(d.id)).length} active total
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-auto overscroll-y-contain border-t border-cf-border-soft">
              <table className="w-full min-w-[1100px] border-collapse">
                <thead className="sticky top-0 z-10 bg-cf-surface">
                  <tr className="border-b border-cf-border-soft bg-cf-surface">
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
                            { label: "Triggered Date", key: "actionDate" as const },
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
                            { label: "Triggered Date", key: "actionDate" as const },
                          ] as const)
                    ).map(({ label, key: sortKey }) => (
                      <th
                        key={label}
                        className="cf-th bg-cf-surface p-0"
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
                            className="flex w-full min-h-[40px] items-center justify-start gap-1.5 border-0 bg-cf-surface px-3 py-2 text-left text-[11px] font-medium uppercase leading-tight tracking-[0.04em] text-cf-secondary transition-colors hover:bg-cf-gs-10/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cf-primary active:bg-cf-gs-10"
                          >
                            <span className="min-w-0 flex-1 select-none whitespace-normal sm:whitespace-nowrap">
                              {label}
                            </span>
                            <span
                              className={cn(
                                "shrink-0 text-[9px] leading-[10px] tabular-nums",
                                sortKey === sortColumn ? "text-cf-primary" : "text-cf-gs-20"
                              )}
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
                      <td colSpan={showActionsColumn ? 9 : 8} className="py-14 text-center">
                        <p className="text-[13px] font-medium text-cf-text">
                          No databases match
                        </p>
                        <p className="mt-1 text-[12px] text-cf-muted">
                          Try adjusting filters or the search term.
                        </p>
                      </td>
                    </tr>
                  )}

                  {tableRows.map((r, i) => {
                    const isExcluded   = excludedIds.includes(r.id);
                    const status       = subTab === "Deleted" ? "Deleted" : rowStatus(r, isExcluded);
                    const statusStyle  = STATUS_STYLE[status] ?? STATUS_STYLE["Active"];
                    const countdown =
                      status === "Excluded" || status === "Deleted"
                        ? null
                        : deletionCountdown(r.actionDate, r.deletionDate, r.windowDays, todayIso);

                    return (
                      <tr
                        key={r.id}
                        onClick={() => setSelected(r.id)}
                        className={cn(
                          "min-h-[52px] cursor-pointer align-middle transition-colors",
                          i % 2 === 0 ? "bg-white" : "bg-cf-surface/80",
                          "hover:bg-cf-primary-light/45"
                        )}
                      >
                        {/* DB Name */}
                        <td className="cf-td align-middle">
                          <span className="font-medium text-cf-primary hover:underline">
                            {r.name}
                          </span>
                        </td>

                        {/* Account */}
                        <td className="cf-td align-middle text-cf-text">
                          {status === "Active" ? "—" : (r.accountName ?? "—")}
                        </td>

                        {/* Conversion */}
                        <td className="cf-td align-middle text-cf-secondary">
                          {status === "Active" ? "—" : (r.conversionName ?? "—")}
                        </td>

                        {/* Server */}
                        <td className="cf-td align-middle text-cf-secondary">{serverGroup(r.server)}</td>

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
                              className={cn(
                                "flex min-h-[14px] items-center gap-1 text-[10px] leading-[14px]",
                                countdown?.urgent ? "text-cf-danger" : "text-cf-muted"
                              )}
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
                        <td className="cf-td align-middle text-cf-text">{r.sizeGb} GB</td>

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

                        {/* Triggered Date (actionDate) */}
                        <td className="cf-td align-middle">
                          {r.actionDate ? (
                            <span className="text-cf-secondary">{formatShortDate(r.actionDate)}</span>
                          ) : (
                            <span className="text-cf-gs-20">—</span>
                          )}
                        </td>

                        {showActionsColumn && (
                          <td className="cf-td align-middle" onClick={(e) => e.stopPropagation()}>
                            <div className="flex min-h-[44px] min-w-0 flex-wrap content-center items-center justify-start gap-1.5">
                              {isExcluded ? (
                                <ActionBtn
                                  label="Lift Exclusion"
                                  variant="ghost"
                                  onClick={() => openLiftExclusionFlow(r)}
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
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ── DB Detail Slideout ────────────────────────────────────────────── */}
      {selected && (
        <DBDetailSlideout
          dbId={selected}
          onClose={() => setSelected(null)}
          readOnly={subTab === "Deleted"}
        />
      )}

      {/* Schedule override modal (replaces Exclude in table actions) */}
      {scheduleDb && (
        <>
          <div
            className="cf-modal-overlay fixed inset-0 z-[160]"
            onClick={() => { setScheduleDbId(null); setScheduleDate(""); }}
            aria-hidden
          />
          <div className="cf-modal-panel fixed left-1/2 top-1/2 z-[170] w-[420px] -translate-x-1/2 -translate-y-1/2 overflow-hidden">
            <div className="cf-modal-header">
              <h3 className="cf-modal-title">Schedule deletion date</h3>
              <button
                type="button"
                className="text-[16px] leading-none text-cf-muted transition-colors hover:text-cf-secondary"
                onClick={() => { setScheduleDbId(null); setScheduleDate(""); }}
                aria-label="Close schedule dialog"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 px-4 py-4">
              <p className="text-[12px] text-cf-text">
                <span className="font-medium">{scheduleDb.name}</span>
              </p>
              <p className="text-[11px] text-cf-secondary">
                Reschedule range: <strong className="text-cf-text">tomorrow</strong> through{" "}
                <strong className="text-cf-text">two months from today</strong> (
                {formatShortDate(minScheduleIso)} – {formatShortDate(maxScheduleIso)}). This DB will follow your selected schedule.
              </p>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-cf-secondary">Deletion date</span>
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
            <div className="cf-modal-footer">
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
          <div className="cf-modal-overlay fixed inset-0 z-[180]" onClick={closeDeleteConfirm} aria-hidden />
          <div
            className="cf-modal-panel fixed left-1/2 top-1/2 z-[190] w-[420px] -translate-x-1/2 -translate-y-1/2 overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-delete-title"
          >
            <div className="cf-modal-header">
              <h3 id="confirm-delete-title" className="cf-modal-title">
                Confirm delete now
              </h3>
              <button
                type="button"
                className="text-[16px] leading-none text-cf-muted transition-colors hover:text-cf-secondary"
                onClick={closeDeleteConfirm}
                aria-label="Close delete confirmation dialog"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 px-4 py-4">
              <p className="text-[12px] text-cf-text">
                You are about to delete <span className="font-medium">{confirmDeleteDb.name}</span>.
              </p>
              <p className="text-[11px] text-cf-secondary">
                This action executes immediate cleanup for this database and cannot be undone from this screen.
              </p>
            </div>

            <div className="cf-modal-footer">
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

      {/* Lift exclusion scheduling modal for LIVE 30-day frame */}
      {liftExclusionPrompt && (
        <>
          <div className="cf-modal-overlay fixed inset-0 z-[180]" onClick={closeLiftExclusionPrompt} aria-hidden />
          <div
            className="cf-modal-panel fixed left-1/2 top-1/2 z-[190] w-[430px] -translate-x-1/2 -translate-y-1/2 overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lift-exclusion-title"
          >
            <div className="cf-modal-header">
              <h3 id="lift-exclusion-title" className="cf-modal-title">
                Lift exclusion and schedule date
              </h3>
              <button
                type="button"
                className="text-[16px] leading-none text-cf-muted transition-colors hover:text-cf-secondary"
                onClick={closeLiftExclusionPrompt}
                aria-label="Close lift exclusion dialog"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 px-4 py-4">
              <p className="text-[12px] text-cf-text">
                <span className="font-medium">{liftExclusionPrompt.dbName}</span> is still inside the LIVE 30-day frame
                (ends {formatShortDate(liftExclusionPrompt.frameEndIso)}).
              </p>
              <p className="text-[11px] text-cf-secondary">
                Choose a new deletion date from <strong className="text-cf-text">tomorrow</strong> up to{" "}
                <strong className="text-cf-text">two months from today</strong> (
                {formatShortDate(minScheduleIso)} – {formatShortDate(maxScheduleIso)}).
              </p>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-cf-secondary">Deletion date</span>
                <input
                  type="date"
                  className="c-input w-full"
                  min={minScheduleIso}
                  max={maxScheduleIso}
                  value={liftExclusionDate}
                  onChange={(e) => setLiftExclusionDate(e.target.value)}
                />
              </label>
            </div>
            <div className="cf-modal-footer">
              <button type="button" className="c-btn-ghost" onClick={closeLiftExclusionPrompt}>
                Cancel
              </button>
              <button
                type="button"
                className="c-btn-primary"
                disabled={!liftExclusionDate || liftExclusionDate < minScheduleIso || liftExclusionDate > maxScheduleIso}
                onClick={confirmLiftExclusionDate}
              >
                Save date
              </button>
            </div>
          </div>
        </>
      )}

      {/* Manual override confirmation modal (Delete / Backup) */}
      {confirmOverride && confirmOverrideDb && (
        <>
          <div className="cf-modal-overlay fixed inset-0 z-[180]" onClick={closeOverrideConfirm} aria-hidden />
          <div
            className="cf-modal-panel fixed left-1/2 top-1/2 z-[190] w-[420px] -translate-x-1/2 -translate-y-1/2 overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-override-title"
          >
            <div className="cf-modal-header">
              <h3 id="confirm-override-title" className="cf-modal-title">
                Confirm action
              </h3>
              <button
                type="button"
                className="text-[16px] leading-none text-cf-muted transition-colors hover:text-cf-secondary"
                onClick={closeOverrideConfirm}
                aria-label="Close action confirmation dialog"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 px-4 py-4">
              <p className="text-[12px] text-cf-text">
                Apply <span className="font-medium">{confirmOverride.action === "Delete" ? "Delete" : "Backup & Delete"}</span> for{" "}
                <span className="font-medium">{confirmOverrideDb.name}</span>?
              </p>
              <p className="text-[11px] text-cf-secondary">
                {confirmOverride.action === "Delete"
                  ? "This will set this database to the delete flow immediately."
                  : "This will set this database to backup before delete flow."}
              </p>
            </div>

            <div className="cf-modal-footer">
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

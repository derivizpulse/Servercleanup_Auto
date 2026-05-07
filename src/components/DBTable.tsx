// CareFlow Design System — Database Table
// Exact CareFlow patterns: gs-5 header bg, gs-10 borders, gs-20 input borders,
// 12px body text, 11px th uppercase, CareFlow primary links

import { useState } from "react";
import { useDerivizStore } from "../store/useDerivizStore";
import { ClassificationBadge, AutoBackedUpBadge } from "./Badge";
import { CCheckbox, Toggle } from "./Toggle";
import { formatShortDate } from "../lib/classify";
import { cn } from "../lib/cn";
import type { SourceEnvironment } from "../types";

const envOptions: (SourceEnvironment | "All")[] = [
  "All", "Aquila", "Raven", "Build VM", "Mig", "Mig2", "SB", "ITL",
];
const classOptions = ["All", "Account", "Conversion", "Live", "Ungrouped"] as const;
const actionOptions = [
  "All", "None", "Delete", "Backup & Delete", "Scheduled Delete",
] as const;

export function DBTable({
  onRowClick,
  envFilter,
  setEnvFilter,
  classFilter,
  setClassFilter,
  actionFilter,
  setActionFilter,
  search,
  setSearch,
  enterprise = true,
}: {
  onRowClick: (id: string) => void;
  envFilter: string;
  setEnvFilter: (v: string) => void;
  classFilter: string;
  setClassFilter: (v: string) => void;
  actionFilter: string;
  setActionFilter: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  enterprise?: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const rows     = useDerivizStore((s) => s.databases);
  const setExcluded = useDerivizStore((s) => s.setExcluded);
  const excluded = useDerivizStore((s) => s.excludedIds);

  const filtered = rows.filter((r) => {
    if (envFilter !== "All" && r.environment !== envFilter) return false;
    if (classFilter !== "All" && r.classification !== classFilter) return false;
    if (actionFilter !== "All" && r.action !== actionFilter) return false;
    if (search.trim() && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const allIds = filtered.map((r) => r.id);
  const allPicked = allIds.length > 0 && allIds.every((id) => selected.has(id));

  const setAllSelected = (v: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (v) allIds.forEach((id) => next.add(id));
      else allIds.forEach((id) => next.delete(id));
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {/* ── Filters toolbar ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-3">
        {[
          { label: "Environment",     value: envFilter,    set: setEnvFilter,    opts: envOptions },
          { label: "Classification",  value: classFilter,  set: setClassFilter,  opts: classOptions },
          { label: "Action",          value: actionFilter, set: setActionFilter, opts: actionOptions },
        ].map(({ label, value, set, opts }) => (
          <label key={label} className="flex flex-col gap-1">
            <span
              className="text-[10px] font-medium uppercase tracking-wider"
              style={{ color: "#5D6F7E" }}
            >
              {label}
            </span>
            <select
              className="c-select min-w-[140px]"
              value={value}
              onChange={(e) => set(e.target.value)}
            >
              {(opts as readonly string[]).map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </label>
        ))}

        <label className="flex min-w-[200px] flex-1 flex-col gap-1">
          <span
            className="text-[10px] font-medium uppercase tracking-wider"
            style={{ color: "#5D6F7E" }}
          >
            Search
          </span>
          <input
            className="c-input w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by name…"
          />
        </label>

        {selected.size > 0 && (
          <div className="flex items-end pb-0.5">
            <span
              className="mr-2 text-[11px]"
              style={{ color: "#5D6F7E" }}
            >
              {selected.size} selected
            </span>
            <button
              type="button"
              className="c-btn-outline text-[11px]"
              style={{ height: "28px" }}
              onClick={() => setSelected(new Set())}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div
        className="overflow-hidden rounded-[4px]"
        style={{ border: "1px solid #ECEFF2", background: "#FFFFFF" }}
      >
        <div className="max-h-[min(70vh,720px)] overflow-auto">
          <table
            className={cn("w-full border-collapse text-left", enterprise ? "min-w-[1200px]" : "min-w-[1050px]")}
          >
            <thead className="sticky top-0 z-10">
              <tr style={{ borderBottom: "1px solid #ECEFF2" }}>
                {enterprise && (
                  <th className="cf-th w-10 px-2">
                    <CCheckbox
                      checked={allPicked}
                      onChange={setAllSelected}
                      ariaLabel="Select all"
                    />
                  </th>
                )}
                {["DB Name", "Environment", "Size", "Classification", "Action", "Action Date", "Deletion Date", "Exclude"].map((h) => (
                  <th key={h} className="cf-th">{h}</th>
                ))}
                {enterprise && <th className="cf-th w-8" aria-label="Row actions" />}
              </tr>
            </thead>

            <tbody>
              {filtered.map((r, i) => (
                <tr
                  key={r.id}
                  onClick={() => onRowClick(r.id)}
                  className="cursor-pointer transition-colors"
                  style={{
                    background: selected.has(r.id) ? "#E0F2F5" : i % 2 === 0 ? "#FFFFFF" : "#F7F8FA",
                  }}
                  onMouseEnter={(e) => {
                    if (!selected.has(r.id))
                      (e.currentTarget as HTMLTableRowElement).style.background = "#ECEFF2";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background =
                      selected.has(r.id) ? "#E0F2F5" : i % 2 === 0 ? "#FFFFFF" : "#F7F8FA";
                  }}
                >
                  {enterprise && (
                    <td className="cf-td w-10 px-2" onClick={(e) => e.stopPropagation()}>
                      <CCheckbox
                        checked={selected.has(r.id)}
                        onChange={(v) => {
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (v) next.add(r.id);
                            else next.delete(r.id);
                            return next;
                          });
                        }}
                        ariaLabel={`Select ${r.name}`}
                      />
                    </td>
                  )}
                  <td className="cf-td">
                    <span
                      className="font-medium hover:underline"
                      style={{ color: enterprise ? "#007A8F" : "#354756" }}
                    >
                      {r.name}
                    </span>
                  </td>
                  <td className="cf-td" style={{ color: "#5D6F7E" }}>{r.environment}</td>
                  <td className="cf-td">{r.sizeGb} GB</td>
                  <td className="cf-td" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-wrap items-center gap-1">
                      <ClassificationBadge classification={r.classification} />
                      {r.autoBackedUp && <AutoBackedUpBadge />}
                    </div>
                  </td>
                  <td className="cf-td">{r.action}</td>
                  <td className="cf-td" style={{ color: "#5D6F7E" }}>
                    {r.actionDate ? formatShortDate(r.actionDate) : "—"}
                  </td>
                  <td className="cf-td" style={{ color: "#5D6F7E" }}>
                    {r.deletionDate ? formatShortDate(r.deletionDate) : "—"}
                  </td>
                  <td className="cf-td" onClick={(e) => e.stopPropagation()}>
                    <Toggle
                      on={excluded.includes(r.id)}
                      onChange={(v) => setExcluded(r.id, v)}
                      ariaLabel={`Exclude ${r.name}`}
                    />
                  </td>
                  {enterprise && (
                    <td className="cf-td w-8 px-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="inline-flex h-[24px] w-[24px] items-center justify-center rounded-[3px] text-lg transition-colors"
                        style={{ color: "#96A3AF" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#ECEFF2")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        aria-label="More actions"
                      >
                        ⋮
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center py-14 text-center">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="mb-3" aria-hidden>
              <circle cx="20" cy="20" r="19" stroke="#C9D1DA" strokeWidth="2" />
              <path d="M13 20h14M20 13v14" stroke="#C9D1DA" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p className="text-[13px] font-medium" style={{ color: "#354756" }}>No databases found</p>
            <p className="text-[12px] mt-1" style={{ color: "#96A3AF" }}>Try adjusting your filters or search term.</p>
          </div>
        )}
      </div>

      {/* Row count */}
      <p className="text-right text-[11px]" style={{ color: "#96A3AF" }}>
        {filtered.length} of {rows.length} databases
      </p>
    </div>
  );
}

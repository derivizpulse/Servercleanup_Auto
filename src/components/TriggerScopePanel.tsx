// Operational view: which DBs are in scope for T1 / T2 automation + last-run summary.
// Lives on Overview so exclusions and status stay next to the main table.

import { useState } from "react";
import { useDerivizStore, useTrigger1Targets } from "../store/useDerivizStore";
import { Toggle } from "./Toggle";

function T1Line({ id, name, env }: { id: string; name: string; env: string }) {
  const ex = useDerivizStore((s) => s.excludedIds.includes(id));
  const setEx = useDerivizStore((s) => s.setExcluded);
  return (
    <li
      className="flex items-center justify-between py-2 last:border-0"
      style={{ borderBottom: "1px solid #ECEFF2" }}
    >
      <span>
        <span className="font-medium text-[12px]" style={{ color: "#354756" }}>{name}</span>
        <span className="ml-2 text-[12px]" style={{ color: "#5D6F7E" }}>· {env}</span>
      </span>
      <div className="flex items-center gap-2" style={{ color: "#96A3AF", fontSize: "11px" }}>
        <span>Exclude from batch</span>
        <Toggle on={ex} onChange={(v) => setEx(id, v)} ariaLabel={`Exclude ${name} from batch`} />
      </div>
    </li>
  );
}

export function TriggerScopePanel() {
  const [open, setOpen] = useState(false);
  const t1 = useTrigger1Targets();
  const t1Fired = useDerivizStore((s) => s.trigger1LastFired);
  const t2Fired = useDerivizStore((s) => s.trigger2LastFired);
  const dbs = useDerivizStore((s) => s.databases);
  const summary2 = useDerivizStore((s) => s.lastTrigger2Summary);
  const excludedIds = useDerivizStore((s) => s.excludedIds);

  const t1Eligible = t1.filter((d) => !excludedIds.includes(d.id));
  const t2InScope = dbs.filter((d) => {
    if (excludedIds.includes(d.id)) return false;
    const u = d.name.toUpperCase();
    if (u.includes("_LIVE")) return true;
    if (d.environment === "Build VM") return true;
    if (["SB", "ITL"].includes(d.environment)) return true;
    return false;
  });

  return (
    <div
      className="shrink-0 overflow-hidden rounded-[4px] border"
      style={{ borderColor: "#ECEFF2", background: "#FFFFFF" }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between border-b px-3 py-2.5 text-left text-[12px] font-medium transition-colors hover:bg-[#FAFBFC] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#007A8F]"
        style={{ color: "#007A8F", borderColor: "#ECEFF2" }}
        aria-expanded={open}
      >
        <span>{open ? "▾ Hide" : "▸ Show"} databases in trigger scope</span>
        <span className="text-[10px] font-normal tabular-nums" style={{ color: "#96A3AF" }}>
          T1: {t1Eligible.length} · T2: {t2InScope.length}
        </span>
      </button>

      {open && (
        <div className="space-y-3 p-3" style={{ background: "#FAFBFC" }}>
          <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "#96A3AF" }}>
            Last event from upstream (not an action in this app)
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]" style={{ color: "#5D6F7E" }}>
            <span>
              <span className="font-medium" style={{ color: "#354756" }}>Trigger 1: </span>
              {t1Fired ? new Date(t1Fired).toLocaleString() : "—"}
            </span>
            <span>
              <span className="font-medium" style={{ color: "#354756" }}>Trigger 2: </span>
              {t2Fired ? new Date(t2Fired).toLocaleString() : "—"}
            </span>
          </div>
          {summary2 ? (
            <p className="text-[11px] leading-relaxed" style={{ color: "#354756" }}>
              <span className="font-medium" style={{ color: "#1E2228" }}>After last run — </span>
              {summary2}
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3
                className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: "#5D6F7E" }}
              >
                Trigger 1 (Build VM / Staging Restorer) — opt out
              </h3>
              <ul className="list-none overflow-hidden rounded-[3px] border p-0" style={{ borderColor: "#ECEFF2", background: "#FFFFFF" }}>
                {t1Eligible.length === 0 && (
                  <li className="px-2 py-3 text-[12px]" style={{ color: "#96A3AF" }}>
                    None in scope, or all excluded.
                  </li>
                )}
                {t1Eligible.map((d) => (
                  <T1Line key={d.id} id={d.id} name={d.name} env={d.environment} />
                ))}
              </ul>
            </div>
            <div>
              <h3
                className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: "#5D6F7E" }}
              >
                Trigger 2 in-scope (status from automation)
              </h3>
              <ul className="list-none overflow-hidden rounded-[3px] border p-0" style={{ borderColor: "#ECEFF2", background: "#FFFFFF" }}>
                {t2InScope.length === 0 && (
                  <li className="px-2 py-3 text-[12px]" style={{ color: "#96A3AF" }}>
                    None in scope, or all excluded.
                  </li>
                )}
                {t2InScope.map((d) => (
                  <li
                    key={d.id}
                    className="border-b px-2 py-1.5 last:border-0"
                    style={{ borderColor: "#ECEFF2" }}
                  >
                    <span className="font-medium text-[12px]" style={{ color: "#354756" }}>{d.name}</span>
                    <span className="ml-2 text-[12px]" style={{ color: "#5D6F7E" }}>· {d.action}</span>
                    <span className="ml-1 text-[11px]" style={{ color: "#96A3AF" }}>
                      (del. {d.deletionDate ? new Date(d.deletionDate).toLocaleDateString() : "—"})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// CareFlow Design System — Settings page
// Uses c-card pattern, CareFlow toggle, CareFlow form labels

import { Toggle } from "../components/Toggle";
import { useState } from "react";

const classRules = [
  { pattern: "Name contains _LIVE", className: "Live" },
  { pattern: "Contains ACC or ACCOUNT", className: "Account" },
  { pattern: "Contains CONV or CONVERSION", className: "Conversion" },
  { pattern: "All other names", className: "Ungrouped" },
];

function SettingRow({ label, sub, on, onChange, id }: {
  label: string; sub?: string; on: boolean; onChange: (v: boolean) => void; id: string;
}) {
  return (
    <li
      className="flex items-center justify-between py-3"
      style={{ borderBottom: "1px solid #ECEFF2" }}
    >
      <div>
        <p className="text-[12px] font-medium" style={{ color: "#354756" }}>{label}</p>
        {sub && <p className="text-[11px] mt-0.5" style={{ color: "#96A3AF" }}>{sub}</p>}
      </div>
      <Toggle on={on} onChange={onChange} ariaLabel={id} />
    </li>
  );
}

export function Settings() {
  const [sync, setSync] = useState({ aquila: true, raven: true, build: true, vms: false });

  return (
    <div className="w-full min-w-0 space-y-5">
      <div>
        <h1>Settings</h1>
        <p className="text-[12px] mt-1" style={{ color: "#5D6F7E" }}>
          Reference text below matches the product story; toggles are still mock in this prototype.
        </p>
      </div>

      {/* Product story — what Action date / Deletion date mean */}
      <div className="c-card">
        <div className="c-card-header">What syncs, how we classify, and what “action date” means</div>
        <div className="space-y-4 p-4 text-[12px] leading-relaxed" style={{ color: "#354756" }}>
          <section>
            <h3 className="mb-1.5 text-[12px] font-semibold" style={{ color: "#1E2228" }}>
              Sync scope
            </h3>
            <p style={{ color: "#5D6F7E" }}>
              Databases from <strong>non-CS</strong> environments are synced into Deriviz (e.g.{" "}
              <strong>Aquila, Raven, Build / Build VM, and generic VMs</strong>). The inventory is
              the source of truth for name and size in Deriviz.
            </p>
            <p className="mt-2" style={{ color: "#5D6F7E" }}>
              <strong>CS-side</strong> environments (e.g. <strong>Mig, Mig2, SB, ITL</strong>
              ) are <em>not</em> full sync sources here; they are referenced for trigger outcomes and
              lifecycle rules (e.g. scheduled deletions, naming), not as the primary “synced from”
              list for the story above.
            </p>
          </section>

          <section>
            <h3 className="mb-1.5 text-[12px] font-semibold" style={{ color: "#1E2228" }}>
              Classification (naming)
            </h3>
            <p style={{ color: "#5D6F7E" }}>
              Each row is tagged using naming rules — e.g. <strong>Account</strong> and{" "}
              <strong>Conversion</strong> when names match the patterns you define. Everything
              that does not match falls under <strong>Ungrouped</strong> (and <strong>Live</strong>{" "}
              when the name includes <code className="text-[11px]">_LIVE</code> as in your spec).
            </p>
          </section>

          <section>
            <h3 className="mb-1.5 text-[12px] font-semibold" style={{ color: "#1E2228" }}>
              How we define <em>action date</em> and <em>deletion date</em>
            </h3>
            <p style={{ color: "#5D6F7E" }}>
              <strong>Action date</strong> is the <strong>anchor in time</strong> when a lifecycle
              action is <strong>recorded</strong> in Deriviz — not when files are actually deleted
              on disk. Usually it is:
            </p>
            <ul className="ml-4 mt-1.5 list-disc space-y-1" style={{ color: "#5D6F7E" }}>
              <li>
                The <strong>trigger event time</strong> (e.g. when “SB completed” or “ITL completed”
                is marked, or when “conversion marked as implemented”),
              </li>
              <li>Or a <strong>user action</strong> in the portal (override, mark excluded, etc.).</li>
            </ul>
            <p className="mt-2" style={{ color: "#5D6F7E" }}>
              <strong>Deletion date</strong> (and “scheduled delete on …”) is then derived as{" "}
              <strong>action date + the policy window</strong> for that path, for example:
            </p>
            <ul className="ml-4 mt-1.5 list-disc space-y-1" style={{ color: "#5D6F7E" }}>
              <li>
                <strong>5 days</strong> — Staging Restorer / Build VM restores (after Trigger 1 or
                the Build-VM part of Trigger 2),
              </li>
              <li>
                <strong>7 days</strong> — source/staging used for SB / ITL paths
                (Trigger 2),
              </li>
              <li>
                <strong>30 days</strong> — <code className="text-[11px]">XXXXXXX_LIVE</code> / Live
                backup-&amp;-delete path (Trigger 2, auto-backup first).
              </li>
            </ul>
            <p className="mt-2 rounded-[3px] border px-3 py-2 text-[11px]" style={{ background: "#F7F8FA", borderColor: "#ECEFF2", color: "#5D6F7E" }}>
              <strong>Short version:</strong> action date = <em>when the schedule was created or the
              trigger fired</em>; deletion date = <em>the deadline the policy assigns</em> from
              that anchor. Exclusions in the portal override automation for the chosen databases.
            </p>
          </section>

          <section>
            <h3 className="mb-1.5 text-[12px] font-semibold" style={{ color: "#1E2228" }}>
              Triggers in one line
            </h3>
            <p style={{ color: "#5D6F7E" }}>
              <strong>Trigger 1 — SB completed / ITL completed.</strong> Staging Restorer
              “minified” DBs in Build VM from blob; relevance is for destination push. Plan: delete
              those VM restores and matching blob backup files within 5 days; user can{" "}
              <strong>exclude</strong> retainers in the portal.
            </p>
            <p className="mt-2" style={{ color: "#5D6F7E" }}>
              <strong>Trigger 2 — Conversion implemented.</strong> (1) Live DBs: backup
              (auto-backup) source and staging in Stager, names including <code className="text-[11px]">_LIVE</code>{" "}
              treated as Live. (2) Build VM: schedule delete of Staging Restorer DBs in 5 days. (3) SB
              / ITL: schedule deletion in 7 days, using naming rules.
            </p>
          </section>
        </div>
      </div>

      {/* Environment sync */}
      <div className="c-card">
        <div className="c-card-header">Environment Sync</div>
        <div className="px-4 pb-1">
          <ul>
            <SettingRow label="Aquila"                 on={sync.aquila} onChange={(v) => setSync((s) => ({ ...s, aquila: v }))} id="aquila" />
            <SettingRow label="Raven"                  on={sync.raven}  onChange={(v) => setSync((s) => ({ ...s, raven: v }))}  id="raven" />
            <SettingRow label="Build servers / Build VM" sub="Non-CS source" on={sync.build} onChange={(v) => setSync((s) => ({ ...s, build: v }))} id="build" />
            <SettingRow label="VMs (generic pool)"     on={sync.vms}   onChange={(v) => setSync((s) => ({ ...s, vms: v }))}   id="vms" />
          </ul>
          <p className="py-3 text-[11px]" style={{ color: "#96A3AF" }}>
            CS environments (Mig, Mig2, SB, ITL) are not ingested — they
            appear only in trigger logic and curated mock rows.
          </p>
        </div>
      </div>

      {/* Classification rules */}
      <div className="c-card">
        <div className="c-card-header">Naming &amp; Classification Rules</div>
        <div className="p-4">
          <p className="text-[12px] mb-3" style={{ color: "#5D6F7E" }}>
            Rules applied in priority order. A higher match stops evaluation.
          </p>
          <ol className="space-y-2">
            {classRules.map((r, i) => (
              <li key={r.className} className="flex items-start gap-3 text-[12px]">
                <span
                  className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                  style={{ background: "#ECEFF2", color: "#5D6F7E" }}
                >
                  {i + 1}
                </span>
                <span style={{ color: "#354756" }}>
                  {r.pattern} →{" "}
                  <span className="font-semibold" style={{ color: "#007A8F" }}>
                    {r.className}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Retention reference */}
      <div className="c-card">
        <div className="c-card-header">Retention Windows (Reference)</div>
        <div className="p-4">
          <ul className="space-y-2 text-[12px]" style={{ color: "#354756" }}>
            {[
              ["5 days",  "Staging Restorer / Build VM (Trigger 1 & Trigger 2 build path)"],
              ["7 days",  "SB, ITL scheduled path (Trigger 2)"],
              ["30 days", "_LIVE backup & delete path (Trigger 2)"],
            ].map(([days, desc]) => (
              <li key={days} className="flex gap-3">
                <span
                  className="shrink-0 font-semibold w-[50px]"
                  style={{ color: "#007A8F" }}
                >
                  {days}
                </span>
                <span style={{ color: "#5D6F7E" }}>{desc}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

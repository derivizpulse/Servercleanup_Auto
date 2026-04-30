import { useDerivizStore, useTrigger1Targets } from "../store/useDerivizStore";
import { TriggerCard } from "../components/TriggerCard";

const READ_ONLY =
  "Milestone updates are captured by the Conversion team in their delivery workflow, then reflected here. " +
  "This page only explains the rules. Use the Overview tab for in-scope DBs, last run times, and exclusions.";

const TRIGGER1_STEPS = [
  "The Conversion team marks SB and ITL deliverables complete in their workflow.",
  "That completion status is synced into Deriviz and evaluates Trigger 1.",
  "For each in-scope Build VM database that was restored via the Staging Restorer flow and is not excluded in this app, Deriviz sets Delete and a 5-day deletion clock (Staging Restorer policy).",
  "A system line is written to the Audit log; linked blob backups for those Build VM DBs follow the retention and lifecycle messaging (see the Blob tab when applicable).",
];

const TRIGGER2_STEPS = [
  "The Conversion team marks conversion / LIVE completion in their workflow.",
  "Deriviz applies Trigger 2 to in-scope, non-excluded rows, using separate rules per class:",
  "Name contains _LIVE → Backup & Delete with a 30-day window; backup is created first where required.",
  "Build VM (not excluded) → Delete with a 5-day window.",
  "SB or ITL → Scheduled Delete with a 7-day window.",
  "Each change is logged; the Trigger column in Overview shows Trigger 2 so this cleanup view matches what automation set.",
];

export function Triggers() {
  const t1 = useTrigger1Targets();
  const t1Fired = useDerivizStore((s) => s.trigger1LastFired);
  const t2Fired = useDerivizStore((s) => s.trigger2LastFired);
  const dbs = useDerivizStore((s) => s.databases);
  const blobNote = useDerivizStore((s) => s.trigger1BlobNoticeVisible);
  const dismissBlob = useDerivizStore((s) => s.dismissTrigger1BlobNotice);

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
    <div className="space-y-5">
      <div>
        <h1>Triggers</h1>
        <p className="mt-1 text-[12px] leading-relaxed" style={{ color: "#5D6F7E" }}>
          Trigger 1 and Trigger 2 follow milestone updates made by the Conversion team in their delivery flow.
          They are not started from this screen. Use <span className="font-medium" style={{ color: "#354756" }}>Overview</span> for
          operational cleanup actions and the primary database table.
        </p>
      </div>

      <div
        className="rounded-[4px] border px-3 py-2.5 text-[11px] leading-relaxed"
        style={{ borderColor: "#D9E7EA", background: "#F0FAFC", color: "#1E4E59" }}
      >
        SB/ITL/LIVE completion is marked by the Conversion team in their flow, and those updates sync here.
        This tab documents the automation logic; operational cleanup remains on <strong>Overview</strong>.
      </div>

      {blobNote && (
        <div
          className="flex items-start justify-between gap-4 rounded-[4px] p-3"
          style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}
        >
          <div>
            <p className="text-[12px] font-semibold" style={{ color: "#C27803" }}>Blob backup lifecycle</p>
            <p className="mt-1 text-[12px]" style={{ color: "#92600A" }}>
              After a Trigger 1 run, Staging Restorer Build VM backups in blob storage follow your retention
              window; excluded databases are left unchanged. Other products own backup deletion timing.
            </p>
          </div>
          <button
            type="button"
            onClick={dismissBlob}
            className="shrink-0 text-[11px] font-medium hover:underline focus:outline-none"
            style={{ color: "#C27803" }}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <TriggerCard
          title="Trigger 1 — SB & ITL deliverables marked complete"
          description="Fires when the Conversion team marks SB/ITL deliverables complete. In-scope Build VM rows and batch exclusions are managed on Overview — not on this help page."
          systemSteps={TRIGGER1_STEPS}
          readOnlyNote={READ_ONLY}
          lastFired={t1Fired}
          inScopeCount={t1Eligible.length}
        />
        <TriggerCard
          title="Trigger 2 — Conversion marked as implemented"
          description="Fires when the Conversion team marks conversion/LIVE as complete in their flow. Per-DB results and the last run summary are shown on Overview."
          systemSteps={TRIGGER2_STEPS}
          readOnlyNote={READ_ONLY}
          lastFired={t2Fired}
          inScopeCount={t2InScope.length}
        />
      </div>
    </div>
  );
}

// Deriviz — Operations: long-running backup / delete / schedule jobs with progress

import { useMemo } from "react";
import { useDerivizStore } from "../store/useDerivizStore";
import type { OperationJob, OperationKind, OperationStatus } from "../types";

const KIND_LABEL: Record<OperationKind, string> = {
  backup: "Backup",
  delete: "Delete",
  backup_and_delete: "Backup & Delete",
  reschedule: "Reschedule",
  schedule_delete: "Schedule",
};

const STATUS_STYLE: Record<
  OperationStatus,
  { bg: string; color: string; border: string }
> = {
  queued:   { bg: "#F7F8FA", color: "#5D6F7E", border: "#D9E0E7" },
  running:  { bg: "#E8F8FA", color: "#007A8F", border: "#A8D8DF" },
  succeeded:{ bg: "#F0FDF4", color: "#1B8A4A", border: "#BBF7D0" },
  failed:   { bg: "#FEF2F2", color: "#B23838", border: "#FECACA" },
  cancelled:{ bg: "#F4F4F5", color: "#71717A", border: "#E4E4E7" },
};

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function Operations() {
  const jobs = useDerivizStore((s) => s.operationJobs);
  const dismissOperation = useDerivizStore((s) => s.dismissOperation);
  const cancelOrStopOperation = useDerivizStore((s) => s.cancelOrStopOperation);
  const clearSucceededOperations = useDerivizStore((s) => s.clearSucceededOperations);

  const stats = useMemo(() => {
    let active = 0;
    let done = 0;
    for (const j of jobs) {
      if (j.status === "running" || j.status === "queued") active++;
      if (j.status === "succeeded") done++;
    }
    return { active, done };
  }, [jobs]);

  return (
    <div className="flex min-h-0 flex-col gap-4" style={{ height: "calc(100svh - 6.5rem)", minHeight: 360 }}>
      <div className="shrink-0">
        <h1 className="text-[15px] font-semibold" style={{ color: "#1E2228" }}>
          Operations
        </h1>
        <p className="mt-1 max-w-2xl text-[12px] leading-relaxed" style={{ color: "#5D6F7E" }}>
          Backup, delete, and schedule actions run asynchronously. Cancel a queued job or stop one in progress. Delete and Backup &amp; Delete move the database to the{" "}
          <strong style={{ color: "#354756" }}>Overview → Deleted</strong> tab when the job completes — not while it is still running.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px]" style={{ color: "#96A3AF" }}>
          <span>
            <strong style={{ color: "#354756" }}>{stats.active}</strong> active
          </span>
          <span className="opacity-40">·</span>
          <span>
            <strong style={{ color: "#354756" }}>{stats.done}</strong> completed (shown below)
          </span>
          {stats.done > 0 && (
            <button
              type="button"
              className="text-[11px] font-medium underline-offset-2 hover:underline"
              style={{ color: "#007A8F" }}
              onClick={() => clearSucceededOperations()}
            >
              Clear completed
            </button>
          )}
        </div>
      </div>

      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[6px] bg-white"
        style={{ border: "1px solid #ECEFF2" }}
      >
        <div className="c-card-header shrink-0">Running & recent jobs</div>

        {jobs.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
            <p className="text-[13px] font-medium" style={{ color: "#354756" }}>
              No operations yet
            </p>
            <p className="mt-2 max-w-md text-[12px]" style={{ color: "#96A3AF" }}>
              When you delete a database, run a backup, or apply Backup &amp; Delete from Overview, progress appears here automatically.
            </p>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead className="sticky top-0 z-10" style={{ background: "#F7F8FA", borderBottom: "1px solid #ECEFF2" }}>
                <tr>
                  {["Database", "Kind", "Status", "Progress", "Updated", ""].map((h) => (
                    <th key={h} className="cf-th whitespace-nowrap px-3 py-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobs.map((job, i) => (
                  <JobRow
                    key={job.id}
                    job={job}
                    stripe={i % 2 === 1}
                    onDismiss={() => dismissOperation(job.id)}
                    onCancelOrStop={() => cancelOrStopOperation(job.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function JobRow({
  job,
  stripe,
  onDismiss,
  onCancelOrStop,
}: {
  job: OperationJob;
  stripe: boolean;
  onDismiss: () => void;
  onCancelOrStop: () => void;
}) {
  const st = STATUS_STYLE[job.status];
  const showProgress = job.status === "queued" || job.status === "running";
  const canInterrupt = job.status === "queued" || job.status === "running";
  return (
    <tr style={{ background: stripe ? "#F7F8FA" : "#FFFFFF" }}>
      <td className="cf-td px-3 py-2 align-middle">
        <span className="font-medium" style={{ color: "#007A8F" }}>
          {job.dbName}
        </span>
        <span className="mt-0.5 block text-[10px]" style={{ color: "#96A3AF" }}>
          {job.server}
        </span>
      </td>
      <td className="cf-td align-middle text-[12px]" style={{ color: "#354756" }}>
        {KIND_LABEL[job.kind]}
      </td>
      <td className="cf-td align-middle">
        <span
          className="inline-flex rounded-[3px] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}
        >
          {job.status}
        </span>
      </td>
      <td className="cf-td align-middle min-w-[140px]">
        <div className="flex flex-col gap-1">
          <div
            className="h-2 w-full overflow-hidden rounded-full"
            style={{ background: "#EDF0F3" }}
          >
            <div
              className="h-full rounded-full transition-[width] duration-300 ease-out"
              style={{
                width: `${job.progress}%`,
                background: job.status === "failed" ? "#DC2626" : "#007A8F",
              }}
            />
          </div>
          <span className="text-[10px]" style={{ color: "#5D6F7E" }}>
            {showProgress ? job.message : `${job.progress}% · ${job.message}`}
          </span>
        </div>
      </td>
      <td className="cf-td align-middle whitespace-nowrap text-[11px] tabular-nums" style={{ color: "#96A3AF" }}>
        {formatTime(job.updatedAt)}
      </td>
      <td className="cf-td align-middle">
        {canInterrupt ? (
          <button
            type="button"
            className="text-[11px] font-medium"
            style={{ color: "#007A8F" }}
            onClick={onCancelOrStop}
          >
            {job.status === "queued" ? "Cancel" : "Stop"}
          </button>
        ) : job.status === "succeeded" || job.status === "failed" || job.status === "cancelled" ? (
          <button
            type="button"
            className="text-[11px] font-medium"
            style={{ color: "#96A3AF" }}
            onClick={onDismiss}
          >
            Dismiss
          </button>
        ) : (
          <span className="text-[11px]" style={{ color: "#C9D1DA" }}>
            —
          </span>
        )}
      </td>
    </tr>
  );
}

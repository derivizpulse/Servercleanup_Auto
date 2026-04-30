import { useDerivizStore } from "../store/useDerivizStore";
import { StatusBadge, type StatusBadgeKind } from "./Badge";
import { formatShortDate } from "../lib/classify";

export function BlobTable() {
  const rows = useDerivizStore((s) => s.blobs);
  return (
    <div className="overflow-hidden rounded-lg border border-cf-border bg-white">
      <div className="max-h-[min(60vh,560px)] overflow-auto">
        <table className="w-full min-w-[800px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-cf-surface">
            <tr className="border-b border-cf-border">
              <th className="h-11 px-3 text-xs font-medium uppercase tracking-wider text-cf-secondary">
                Backup file
              </th>
              <th className="h-11 px-3 text-xs font-medium uppercase tracking-wider text-cf-secondary">
                Linked DB
              </th>
              <th className="h-11 px-3 text-xs font-medium uppercase tracking-wider text-cf-secondary">
                Size
              </th>
              <th className="h-11 px-3 text-xs font-medium uppercase tracking-wider text-cf-secondary">
                Scheduled deletion
              </th>
              <th className="h-11 px-3 text-xs font-medium uppercase tracking-wider text-cf-secondary">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr
                key={b.id}
                className="h-11 border-b border-cf-subtle bg-white hover:bg-[#F8F9FC]"
              >
                <td className="px-3 font-mono text-xs text-cf-text">{b.backupFile}</td>
                <td className="px-3 text-cf-text">{b.linkedDbName}</td>
                <td className="px-3 text-cf-text">{b.sizeGb} GB</td>
                <td className="px-3 text-cf-text">
                  {b.scheduledDeletion
                    ? formatShortDate(b.scheduledDeletion)
                    : "—"}
                </td>
                <td className="px-3">
                  <StatusBadge kind={b.status as StatusBadgeKind} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

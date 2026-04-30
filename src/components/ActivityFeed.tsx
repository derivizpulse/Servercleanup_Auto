import { useDerivizStore } from "../store/useDerivizStore";
import { formatShortDate } from "../lib/classify";

export function ActivityFeed({ limit = 5 }: { limit?: number }) {
  const entries = useDerivizStore((s) => s.activityLog.slice(0, limit));
  return (
    <div className="c-card p-4">
      <h2 className="text-[14px] font-semibold" style={{ color: "#1E2228" }}>
        Recent activity
      </h2>
      <ul className="mt-3 space-y-3">
        {entries.map((e) => (
          <li
            key={e.id}
            className="border-b pb-3 last:border-0 last:pb-0"
            style={{ borderColor: "#ECEFF2" }}
          >
            <p className="text-[12px]" style={{ color: "#354756" }}>{e.message}</p>
            <p className="mt-1 text-[10px]" style={{ color: "#96A3AF" }}>
              {e.server && e.dbName
                ? `${e.server} · ${e.dbName} · `
                : ""}
              {formatShortDate(e.at)} · {new Date(e.at).toLocaleTimeString()}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

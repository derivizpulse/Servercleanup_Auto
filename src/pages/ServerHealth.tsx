import { useEffect, useMemo, useState } from "react";
import { matchesTeamFilter, type TeamFilter } from "../lib/teams";

type HealthCard = {
  id: string;
  name: string;
  filterServer: string;
  usedPct: number;
  totalGb: number;
  usedGb: number;
  freeGb: number;
  lastSync: string;
  status: "Active" | "Warning";
};

const INITIAL_SERVERS: HealthCard[] = [
  { id: "skylark-1", name: "Skylark", filterServer: "Aquila-1", usedPct: 78, totalGb: 275, usedGb: 214, freeGb: 61, lastSync: "Nov 12, 2024 7:32 AM", status: "Active" },
  { id: "aquila-1", name: "Aquila", filterServer: "Aquila-2", usedPct: 64, totalGb: 310, usedGb: 198, freeGb: 112, lastSync: "Nov 12, 2024 7:41 AM", status: "Active" },
  { id: "raven-1", name: "Raven", filterServer: "Raven-1", usedPct: 86, totalGb: 420, usedGb: 361, freeGb: 59, lastSync: "Nov 12, 2024 7:35 AM", status: "Warning" },
  { id: "phoenix-1", name: "Phoenix", filterServer: "Raven-2", usedPct: 52, totalGb: 180, usedGb: 94, freeGb: 86, lastSync: "Nov 12, 2024 7:29 AM", status: "Active" },
  { id: "lyra-1", name: "Lyra", filterServer: "Aquila-3", usedPct: 71, totalGb: 290, usedGb: 206, freeGb: 84, lastSync: "Nov 12, 2024 7:22 AM", status: "Active" },
  { id: "orion-1", name: "Orion", filterServer: "SB-1", usedPct: 81, totalGb: 360, usedGb: 292, freeGb: 68, lastSync: "Nov 12, 2024 7:33 AM", status: "Warning" },
  { id: "atlas-1", name: "Atlas", filterServer: "ITL-1", usedPct: 59, totalGb: 240, usedGb: 142, freeGb: 98, lastSync: "Nov 12, 2024 7:26 AM", status: "Active" },
  { id: "nova-1", name: "Nova", filterServer: "SB-2", usedPct: 74, totalGb: 330, usedGb: 244, freeGb: 86, lastSync: "Nov 12, 2024 7:38 AM", status: "Active" },
];

function formatNow() {
  return new Date().toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Gauge({
  usedPct,
  status,
}: {
  usedPct: number;
  status: "Active" | "Warning";
}) {
  const radius = 48;
  const circumference = Math.PI * radius;
  const usedLen = (circumference * usedPct) / 100;
  const track = status === "Warning" ? "#F7D8A7" : "#9AB8EE";
  const fill = status === "Warning" ? "#D88A0B" : "#3F73CC";
  return (
    <div className="relative h-[86px] w-[150px] shrink-0">
      <svg viewBox="0 0 150 86" className="h-full w-full" aria-hidden>
        <path
          d="M12 74 A63 63 0 0 1 138 74"
          fill="none"
          stroke={track}
          strokeWidth="10"
          strokeLinecap="butt"
        />
        <path
          d="M12 74 A63 63 0 0 1 138 74"
          fill="none"
          stroke={fill}
          strokeWidth="10"
          strokeLinecap="butt"
          strokeDasharray={`${usedLen} ${circumference}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-3">
        <span className="text-[10px]" style={{ color: "#5D6F7E" }}>Used</span>
        <span className="text-[37px] font-semibold leading-none" style={{ color: "#1E2228" }}>
          {usedPct}%
        </span>
      </div>
    </div>
  );
}

function ServerCard({ s, onCleanUpServer }: { s: HealthCard; onCleanUpServer: (server: string) => void }) {
  const statusColor = s.status === "Active" ? "#1B8A4A" : "#C27803";
  const statusBg = s.status === "Active" ? "#F0FDF4" : "#FFFBEB";
  const statusBorder = s.status === "Active" ? "#BBF7D0" : "#FDE68A";
  return (
    <div className="c-card overflow-hidden">
      <div className="flex items-start justify-between px-3 pt-3">
        <h2 className="text-[12px] font-medium" style={{ color: "#5D6F7E" }}>{s.name}</h2>
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center rounded-[3px] border px-1.5 py-0.5 text-[10px] font-medium"
            style={{ color: statusColor, borderColor: statusBorder, background: statusBg }}
          >
            {s.status}
          </span>
          <button type="button" className="text-[11px] underline" style={{ color: "#006A80" }}>
            More Details
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-3 pb-2 pt-1">
        <Gauge usedPct={s.usedPct} status={s.status} />
        <div className="min-w-[125px] flex-1">
          {[
            { label: "Total Size", value: `${s.totalGb} GB`, dot: "#E3E6EA" },
            { label: "Used Space", value: `${s.usedGb} GB`, dot: "#3F73CC" },
            { label: "Free Space", value: `${s.freeGb} GB`, dot: "#8FB0EA" },
          ].map((r) => (
            <div key={r.label} className="mb-1 flex items-center justify-between">
              <span className="flex items-center gap-2 text-[11px]" style={{ color: "#5D6F7E" }}>
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: r.dot }} />
                {r.label}
              </span>
              <span className="text-[12px] font-semibold" style={{ color: "#1E2228" }}>{r.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between border-t px-3 py-2" style={{ borderColor: "#CFD6DE" }}>
        <p className="text-[11px]" style={{ color: "#5D6F7E" }}>
          Last sync on{" "}
          <span style={{ color: "#1E2228" }}>{s.lastSync}</span>
        </p>
        <button
          type="button"
          onClick={() => onCleanUpServer(s.filterServer)}
          className="c-btn-primary h-[24px] px-3 text-[11px]"
        >
          Clean Up
        </button>
      </div>
    </div>
  );
}

export function ServerHealth({
  teamFilter,
  onCleanUpServer,
}: {
  teamFilter: TeamFilter;
  onCleanUpServer: (server: string) => void;
}) {
  const [servers, setServers] = useState<HealthCard[]>(INITIAL_SERVERS);
  const visibleServers = useMemo(
    () => servers.filter((server) => matchesTeamFilter(server.filterServer, teamFilter)),
    [servers, teamFilter]
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      setServers((prev) => {
        if (prev.length === 0) return prev;
        const idx = Math.floor(Math.random() * prev.length);
        return prev.map((s, i) => {
          if (i !== idx) return s;
          const delta = Math.floor(Math.random() * 7) - 3; // -3..+3
          const nextUsed = Math.min(s.totalGb - 1, Math.max(1, s.usedGb + delta));
          const nextFree = s.totalGb - nextUsed;
          const nextPct = Math.round((nextUsed / s.totalGb) * 100);
          return {
            ...s,
            usedGb: nextUsed,
            freeGb: nextFree,
            usedPct: nextPct,
            status: nextPct >= 80 ? "Warning" : "Active",
            lastSync: formatNow(),
          };
        });
      });
    }, 4000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1 rounded-[3px] border px-2 py-0.5" style={{ borderColor: "#A8D8DF", background: "#E8F8FA", color: "#006A80" }}>
          <span className="inline-block h-2 w-2 animate-pulse rounded-full" style={{ background: "#1E96AB" }} />
          Live
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {visibleServers.length === 0 ? (
          <div
            className="c-card col-span-full px-4 py-10 text-center text-[12px]"
            style={{ color: "#5D6F7E" }}
          >
            No servers are assigned to this team.
          </div>
        ) : (
          visibleServers.map((s) => (
            <ServerCard key={s.id} s={s} onCleanUpServer={onCleanUpServer} />
          ))
        )}
      </div>
    </div>
  );
}

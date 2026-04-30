// CareFlow Design System — Stat card with radial gauge
// Card uses CareFlow c-card pattern: white bg, gs-10 border, radius-md, card shadow

import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";
import { cn } from "../lib/cn";

export function GaugeStatCard({
  label,
  percent,
  valueLabel,
  rows,
  onViewDetails,
  className,
}: {
  label: string;
  percent: number;
  valueLabel: string;
  rows: { k: string; v: string }[];
  onViewDetails?: () => void;
  className?: string;
}) {
  const p = Math.max(0, Math.min(100, percent));
  const data = [{ name: "cap", value: p }];

  return (
    <div
      className={cn("c-card flex flex-col min-h-[160px] p-0", className)}
    >
      {/* Card header */}
      <div className="c-card-header">
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "#5D6F7E" }}>
          {label}
        </span>
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-wrap gap-3 p-3 sm:flex-nowrap">
        {/* Gauge */}
        <div className="h-[70px] w-[120px] shrink-0 self-center">
          <RadialBarChart
            width={120}
            height={70}
            cx={60}
            cy={60}
            innerRadius={32}
            outerRadius={48}
            data={data}
            startAngle={180}
            endAngle={0}
            barSize={10}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar
              dataKey="value"
              background={{ fill: "#ECEFF2" }}
              fill="#007A8F"
              cornerRadius={4}
            />
          </RadialBarChart>
        </div>

        {/* Metrics */}
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-semibold tabular-nums" style={{ color: "#1E2228" }}>
            {valueLabel}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "#96A3AF" }}>
            {p}% of policy target
          </p>
          <ul className="mt-2 space-y-1">
            {rows.map((r) => (
              <li key={r.k} className="flex justify-between gap-3 text-[11px]">
                <span style={{ color: "#96A3AF" }}>{r.k}</span>
                <span className="font-medium" style={{ color: "#354756" }}>{r.v}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Footer link */}
      <div
        className="border-t px-3 py-2 text-right"
        style={{ borderColor: "#ECEFF2" }}
      >
        <button
          type="button"
          onClick={onViewDetails}
          className="text-[11px] font-medium hover:underline focus:outline-none"
          style={{ color: "#007A8F" }}
        >
          View details →
        </button>
      </div>
    </div>
  );
}

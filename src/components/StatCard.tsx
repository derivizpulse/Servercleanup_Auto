import { cn } from "../lib/cn";

export function StatCard({
  label,
  value,
  sub,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-cf-border bg-white p-5 shadow-card",
        className
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-cf-secondary">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-cf-text">{value}</p>
      {sub && <p className="mt-1 text-xs text-cf-muted">{sub}</p>}
    </div>
  );
}

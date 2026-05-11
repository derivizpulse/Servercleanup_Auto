import { TEAM_FILTER_OPTIONS, type TeamFilter } from "../lib/teams";

export function TeamFilterSelect({
  value,
  onChange,
}: {
  value: TeamFilter;
  onChange: (value: TeamFilter) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-[11px] text-cf-secondary">
      <span className="cf-field-label shrink-0">Team</span>
      <select
        className="c-select h-8 min-w-[9.5rem] text-[12px]"
        value={value}
        onChange={(e) => onChange(e.target.value as TeamFilter)}
        aria-label="Team scope"
      >
        {TEAM_FILTER_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

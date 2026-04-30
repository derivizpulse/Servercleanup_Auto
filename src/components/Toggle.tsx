// CareFlow Design System — Toggle & Checkbox
// Exact specs from CareFlow Figma greyscale/primary tokens

export function Toggle({
  on,
  onChange,
  ariaLabel,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      onClick={() => onChange(!on)}
      className="relative inline-flex h-[16px] w-[28px] shrink-0 cursor-pointer rounded-full border transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#007A8F] focus:ring-offset-1"
      style={{
        backgroundColor: on ? "#007A8F" : "#C9D1DA",
        borderColor: on ? "#007A8F" : "#C9D1DA",
      }}
    >
      <span
        className="pointer-events-none absolute top-[1px] h-[12px] w-[12px] rounded-full bg-white shadow-sm transition-transform duration-150"
        style={{ transform: on ? "translateX(13px)" : "translateX(1px)" }}
      />
    </button>
  );
}

export function CCheckbox({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className="flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-[3px] border transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-[#007A8F] focus:ring-offset-1"
      style={{
        backgroundColor: checked ? "#007A8F" : "#FFFFFF",
        borderColor: checked ? "#007A8F" : "#C9D1DA",
      }}
    >
      {checked && (
        <svg width="9" height="7" viewBox="0 0 9 7" fill="none" aria-hidden>
          <path
            d="M1 3.5L3.5 6L8 1"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

import { cn } from "../../lib/cn";
import type { ReactElement } from "react";

const INK = "#3F4C55";
const ACTIVE_ROW_BORDER = "#0D8EA0";

/** 10 app modules in the product suite; SRV Clean = this cleanup experience. */
export type SuiteModuleId =
  | "prac-list"
  | "deals-hub"
  | "scheduler"
  | "proj-mgmt"
  | "img-mgmt"
  | "work-bench"
  | "srv-clean"
  | "bot-status"
  | "iss-tracker"
  | "doc-mig";

type IconFn = (p: { active: boolean }) => ReactElement;

function c(active: boolean) {
  return active ? INK : INK;
}

/** Prac list — home + molar in roof */
function IconPracList({ active }: { active: boolean }) {
  const s = c(active);
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3.5L4.5 10.5V20.5H19.5V10.5L12 3.5Z"
        stroke={s}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M12 6.8c-0.9 0-1.4 0.6-1.4 1.3 0 0.8 0.6 1.4 1.4 1.4s1.4-0.6 1.4-1.4c0-0.7-0.5-1.3-1.4-1.3z"
        fill={s}
        opacity="0.9"
      />
    </svg>
  );
}

/** Deals hub — three connected nodes */
function IconDealsHub({ active }: { active: boolean }) {
  const s = c(active);
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6L12 15.5L18 6" stroke={s} strokeWidth="0.9" fill="none" />
      <circle cx="6" cy="6" r="1.6" stroke={s} strokeWidth="1.1" fill="none" />
      <circle cx="18" cy="6" r="1.6" stroke={s} strokeWidth="1.1" fill="none" />
      <circle cx="12" cy="16" r="1.6" stroke={s} strokeWidth="1.1" fill="none" />
    </svg>
  );
}

function IconScheduler({ active }: { active: boolean }) {
  const s = c(active);
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="5" width="16" height="14" rx="1" stroke={s} strokeWidth="1.2" />
      <path d="M4 9h16" stroke={s} strokeWidth="1.2" />
      <circle cx="9" cy="13" r="0.8" fill={s} />
      <circle cx="12" cy="16" r="0.8" fill={s} />
      <circle cx="15" cy="12" r="0.8" fill={s} />
    </svg>
  );
}

function IconProjMgmt({ active }: { active: boolean }) {
  const s = c(active);
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="6" y="4" width="12" height="16" rx="1" stroke={s} strokeWidth="1.2" />
      <path d="M9.5 10l1.2 1.1 2.5-2.2" stroke={s} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconImgMgmt({ active }: { active: boolean }) {
  const s = c(active);
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="1.5"
        stroke={s}
        strokeWidth="1"
        strokeDasharray="2.5 2.5"
      />
      <path
        d="M12 9.2c-1.2 0-1.5 0.7-1.5 1.2s0.3 0.7 0.4 0.7c0.1 0 0.2-0.1 0.2-0.1s0.1 0.1 0.2 0.1c0.1 0 0.4-0.1 0.4-0.7 0-0.5-0.3-1.2-1.5-1.2z"
        fill="none"
        stroke={s}
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconWorkBench({ active }: { active: boolean }) {
  const s = c(active);
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="12" rx="1" stroke={s} strokeWidth="1.2" />
      <path d="M7 20h10" stroke={s} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M8 9l2 1.2 1.2-0.2L14 7" stroke={s} strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function IconSrvClean({ active }: { active: boolean }) {
  const s = c(active);
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="3.5" width="16" height="7.2" rx="0.8" stroke={s} strokeWidth="1.2" />
      <path d="M6.2 5.2h.8M6.2 6.2h.8M6.2 7.2h.8M6.2 8.1h.8" stroke={s} strokeWidth="0.4" />
      <circle cx="9.2" cy="6.2" r="0.5" fill={s} />
      <circle cx="10.4" cy="6.2" r="0.5" fill={s} />
      <circle cx="12.2" cy="6.2" r="0.5" fill={s} />
      <rect x="4" y="12.3" width="16" height="7.2" rx="0.8" stroke={s} strokeWidth="1.2" />
      <path d="M6.2 14h.8M6.2 15h.8M6.2 16h.8" stroke={s} strokeWidth="0.4" />
      <circle cx="9.2" cy="16" r="0.5" fill={s} />
      <circle cx="10.4" cy="16" r="0.5" fill={s} />
      <circle cx="12.2" cy="16" r="0.5" fill={s} />
    </svg>
  );
}

function IconBotStatus({ active }: { active: boolean }) {
  const s = c(active);
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="6" y="7" width="12" height="11" rx="1.2" stroke={s} strokeWidth="1.2" />
      <path d="M8 4v3M16 4v3" stroke={s} strokeWidth="1" strokeLinecap="round" />
      <circle cx="9" cy="12" r="1" fill={s} />
      <circle cx="15" cy="12" r="1" fill={s} />
      <path d="M9 16h5" stroke={s} strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function IconIssTracker({ active }: { active: boolean }) {
  const s = c(active);
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="7.2" cy="9.2" r="3.2" stroke={s} strokeWidth="1.2" />
      <path d="M7.2 5.2v0.8" stroke={s} strokeWidth="1" />
      <path d="M7.2 9.2v-1.6" stroke={s} strokeWidth="0.8" />
      <path d="M7.2 9.2H9" stroke={s} strokeWidth="0.8" />
      <path d="M12.2 3.2h2" stroke={s} strokeWidth="0.5" strokeLinecap="round" />
      <path d="M12.2 4.2h1.2" stroke={s} strokeWidth="0.5" strokeLinecap="round" />
      <path d="M12.2 2.1h0.2" stroke={s} strokeWidth="0.5" strokeLinecap="round" />
    </svg>
  );
}

function IconDocMig({ active }: { active: boolean }) {
  const s = c(active);
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2.5" y="4.5" width="7.2" height="9.5" rx="0.7" stroke={s} strokeWidth="1" />
      <rect x="14" y="4.5" width="7.2" height="9.5" rx="0.7" stroke={s} strokeWidth="1" />
      <path
        d="M10.5 10.5C11.2 7.2 12.2 5.2 16 4.2M10.2 7.1c0.2 0.1 0.1 0.1 0.1 0.1"
        stroke={s}
        strokeWidth="0.9"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M13.5 14.5c-0.8 2-2 2.2-3.2 0.2"
        stroke={s}
        strokeWidth="0.9"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

const items: { id: SuiteModuleId; label: string; Icon: IconFn }[] = [
  { id: "prac-list",   label: "Prac List",    Icon: IconPracList },
  { id: "deals-hub",   label: "Deals Hub",    Icon: IconDealsHub },
  { id: "scheduler",   label: "Scheduler",     Icon: IconScheduler },
  { id: "proj-mgmt",   label: "Proj. Mgmt",  Icon: IconProjMgmt },
  { id: "img-mgmt",    label: "Img. Mgmt",   Icon: IconImgMgmt },
  { id: "work-bench",  label: "Work Bench",  Icon: IconWorkBench },
  { id: "srv-clean",   label: "SRV Clean",   Icon: IconSrvClean },
  { id: "bot-status",  label: "Bot Status",  Icon: IconBotStatus },
  { id: "iss-tracker", label: "Iss. Tracker", Icon: IconIssTracker },
  { id: "doc-mig",     label: "Doc. Mig",     Icon: IconDocMig },
];

type CfSidebarProps = {
  activeModule: SuiteModuleId;
  onSelectModule: (id: SuiteModuleId) => void;
};

/** Wider rail for multi-line labels; matches Figma left nav density */
const RAIL_CLASS = "w-[88px] min-w-[88px] max-w-[88px]";

export function CfSidebar({ activeModule, onSelectModule }: CfSidebarProps) {
  return (
    <aside
      className={cn(
        "fixed left-0 top-[30px] z-40 flex h-[calc(100dvh-30px)] flex-col overflow-y-auto border-r border-[#D0D6DE] bg-white",
        RAIL_CLASS
      )}
    >
      <nav className="flex w-full flex-col" aria-label="App suite">
        {items.map((it) => {
          const ItemIcon = it.Icon;
          const isActive = activeModule === it.id;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => onSelectModule(it.id)}
              className={cn(
                "relative flex min-h-[56px] w-full flex-col items-center justify-center gap-1.5 border-l-[3px] border-b px-1.5 py-2.5 text-center transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B7A] focus-visible:ring-offset-1",
                isActive
                  ? "bg-[#D7ECEE]"
                  : "border-l-transparent bg-white hover:bg-[#F3F5F6]"
              )}
              style={{
                borderColor: isActive ? "#D0D6DE" : "#E8EDF1",
                borderLeftColor: isActive ? ACTIVE_ROW_BORDER : "transparent",
              }}
            >
              <ItemIcon active={isActive} />
              <span
                className="w-full whitespace-nowrap text-[9px] font-medium leading-[11px]"
                style={{
                  fontFamily: "Roboto, sans-serif",
                  color: INK,
                  fontWeight: isActive ? 600 : 500,
                }}
              >
                {it.label}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

export const CF_SIDEBAR_PL_CLASS = "pl-[88px]";

import type { Classification } from "../types";
import { cn } from "../lib/cn";

// CareFlow Design System — Tag/Badge patterns
// Source: CareFlow Figma file 9tXBSmlPmhQObMvJo2nmJr

const classificationStyles: Record<Classification, string> = {
  Account:
    "bg-[#E0F2F5] text-[#007A8F] border-[#A8D8DF]",
  Conversion:
    "bg-[#FFFBEB] text-[#C27803] border-[#FDE68A]",
  Live:
    "bg-[#FFF7ED] text-[#C2620E] border-[#FED7AA]",
  Ungrouped:
    "bg-[#F7F8FA] text-[#5D6F7E] border-[#C9D1DA]",
};

export function ClassificationBadge({ classification }: { classification: Classification }) {
  return (
    <span className={cn("c-tag", classificationStyles[classification])}>
      {classification}
    </span>
  );
}

// Status badges — CareFlow semantic colours
const statusStyles = {
  Active:    "bg-[#F0FDF4] text-[#1B8A4A] border-[#BBF7D0]",
  Scheduled: "bg-[#FFFBEB] text-[#C27803] border-[#FDE68A]",
  Delete:    "bg-[#FEF2F2] text-[#B23838] border-[#FECACA]",
  Backup:    "bg-[#E0F2F5] text-[#007A8F] border-[#A8D8DF]",
  Live:      "bg-[#FFF7ED] text-[#C2620E] border-[#FED7AA]",
} as const;

export type StatusBadgeKind = keyof typeof statusStyles;

export function StatusBadge({ kind }: { kind: StatusBadgeKind }) {
  return (
    <span className={cn("c-tag", statusStyles[kind])}>
      {kind}
    </span>
  );
}

export function AutoBackedUpBadge() {
  return (
    <span className="c-tag bg-[#F7F8FA] text-[#5D6F7E] border-[#C9D1DA]">
      Auto-Backed Up
    </span>
  );
}

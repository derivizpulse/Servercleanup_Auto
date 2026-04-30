import type { SVGProps } from "react";
import { cn } from "../../lib/cn";

function Icon(
  p: SVGProps<SVGSVGElement> & { className?: string; title?: string }
) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...p}
    />
  );
}

export function IconGrid({ className }: { className?: string }) {
  return (
    <Icon className={cn(className)}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </Icon>
  );
}
export function IconCyl({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <ellipse cx="12" cy="5" rx="7" ry="2.5" />
      <path d="M5 5v14a7 2.5 0 0 0 14 0V5" />
      <ellipse cx="12" cy="19" rx="7" ry="2.5" />
    </Icon>
  );
}
export function IconBolt({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
    </Icon>
  );
}
export function IconCloud({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M6 20h10a4 4 0 0 0 0-8 0.5 0 0 0-1-5 0.5-4-4-3.5-6 0-1.5-2.5" />
    </Icon>
  );
}
export function IconGear({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .2 1l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.5.2 1.6 1.6 0 0 0-.7 1.4V22a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .2-1.8A1.6 1.6 0 0 0 5.4 15H5a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.2-.8A1.6 1.6 0 0 0 6.2 8l-.1-.1A2 2 0 0 1 9 5.1L9.1 5a1.6 1.6 0 0 0 1.4-.2 1.6 1.6 0 0 0 .7-1.4V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 .9 1.5" />
    </Icon>
  );
}
export function IconSearch({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3-3" />
    </Icon>
  );
}
export function IconMenu({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </Icon>
  );
}
export function IconBell({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 7-3 7h15s-3 0-3-7" />
      <path d="M13.7 20a1.5 1.5 0 0 1-3.4 0" />
    </Icon>
  );
}
export function IconHelp({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 0 1 3.2-1.1 1.6 1.6 0 0 1 1.4 1.1c.3 1-.2 2-1.3 2.1-.8.1-1.1.3-1.2 1" />
    </Icon>
  );
}
export function IconGraph({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M3 3v16h16" />
      <path d="M6 12l3-3 2 2 4-4 3 3" />
    </Icon>
  );
}
export function IconUser({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="7" r="3.5" />
      <path d="M4 21v-1a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v1" />
    </Icon>
  );
}

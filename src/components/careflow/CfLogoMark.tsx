/** Careflow mark: mint arc (C) + navy S (styleguide) */
export function CfLogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M16 2a14 14 0 0 0-6.2 1.4l1.2 2.5A11 11 0 1 1 5 16H2a14 14 0 1 0 14-14Z"
        fill="#2BB573"
      />
      <path
        d="M19.2 8.2c-1.5 0-2.8.5-3.7 1.3l1.2 1.4c.6-.5 1.3-.8 2.1-.8 1.1 0 1.8.6 1.8 1.5 0 1-1.1 1.3-2.4 1.3h-1.2V16h1.1c1.2 0 2.2.3 2.2 1.3 0 .8-.7 1.3-1.7 1.3-.8 0-1.5-.3-2.1-.8l-1.2 1.4c1 .8 2.2 1.2 3.5 1.2 2.2 0 3.7-1.1 3.7-2.7 0-1.1-.6-1.8-1.5-2.1 1-.3 1.7-1.1 1.7-2.2 0-1.6-1.4-2.7-3.5-2.7Z"
        fill="#1A3A52"
      />
    </svg>
  );
}

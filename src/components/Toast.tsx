// CareFlow Design System — Toast / Notification
// Aligned to CareFlow modal shadow + semantic status colours

import { useDerivizStore } from "../store/useDerivizStore";
import type { ToastVariant } from "../types";

const accentColor: Record<ToastVariant, string> = {
  success: "#1B8A4A",
  warning: "#C27803",
  danger:  "#B23838",
  info:    "#007A8F",
};

const label: Record<ToastVariant, string> = {
  success: "Success",
  warning: "Warning",
  danger:  "Error",
  info:    "Info",
};

export function ToastContainer() {
  const toasts  = useDerivizStore((s) => s.toasts);
  const dismiss = useDerivizStore((s) => s.dismissToast);

  return (
    <div
      className="fixed right-4 z-[300] flex max-w-[380px] flex-col gap-2"
      style={{ top: "38px" }}
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex overflow-hidden rounded-[4px] bg-white"
          style={{
            boxShadow: "0 4px 12px rgba(13,22,29,0.24)",
            border: "1px solid #ECEFF2",
            minWidth: "300px",
          }}
        >
          {/* Left accent bar */}
          <div className="w-[4px] shrink-0" style={{ backgroundColor: accentColor[t.variant] }} />

          <div className="flex flex-1 items-start gap-3 px-3 py-3">
            <div className="flex-1 min-w-0">
              <p
                className="text-[11px] font-semibold uppercase tracking-wide mb-0.5"
                style={{ color: accentColor[t.variant] }}
              >
                {label[t.variant]}
              </p>
              <p className="text-[12px] leading-[16px]" style={{ color: "#354756" }}>
                {t.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="shrink-0 mt-0.5 text-[11px] font-medium hover:underline focus:outline-none"
              style={{ color: "#96A3AF" }}
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

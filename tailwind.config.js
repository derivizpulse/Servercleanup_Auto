/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // CareFlow: Roboto throughout
        sans: ["Roboto", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        cf: {
          // ── Shell (Deriviz frame — River Bed header, white rail) ──────
          header:        "#44515C",  // River Bed — top bar
          canvas:        "#F4F7F9",  // main content background

          // ── CareFlow Greyscale (from Design System file) ────────────
          "gs-5":        "#F7F8FA",  // Greyscale/5   — section headers, card bg
          "gs-10":       "#ECEFF2",  // Greyscale/10  — borders, dividers
          "gs-20":       "#C9D1DA",  // Greyscale/20  — input borders, table lines
          "gs-40":       "#96A3AF",  // Greyscale/40  — placeholder text
          "gs-60":       "#5D6F7E",  // Greyscale/60  — labels, secondary text
          "gs-80":       "#354756",  // Greyscale/80  — body text, nav labels
          "gs-100":      "#1E2228",  // Greyscale/100 — headings

          // Convenience aliases
          page:          "#FFFFFF",
          surface:       "#F7F8FA",  // = gs-5
          border:        "#C9D1DA",  // = gs-20
          "border-soft": "#ECEFF2",  // = gs-10
          text:          "#354756",  // = gs-80
          secondary:     "#5D6F7E",  // = gs-60
          muted:         "#96A3AF",  // = gs-40
          subtle:        "#ECEFF2",  // = gs-10

          // ── Interactive / Primary (CareFlow --primary token) ──────────
          primary:       "#007A8F",  // --primary (buttons, CTAs)
          "primary-hover":"#005F6E", // darker shade for hover
          "primary-light":"#E0F2F5", // tinted bg for active/hover cells
          "primary-text": "#007A8F", // text-primary links

          // ── Interactive links / active states ─────────────────────────
          link:          "#147B8D",  // Interactive/80 — links, nav active
          "link-hover":  "#0E5F6E",

          // ── Brand accent (Deriviz logo green) ─────────────────────────
          brand:         "#42BA78",  // Ocean Green
          "brand-surface":"#E6F7F0", // active sidebar cell bg

          // ── Notification badge ─────────────────────────────────────────
          badge:         "#FF6375",  // Orient — bell badge

          // ── Status / semantic ──────────────────────────────────────────
          success:       "#1B8A4A",
          "success-bg":  "#F0FDF4",
          "success-border":"#BBF7D0",
          warning:       "#C27803",
          "warning-bg":  "#FFFBEB",
          "warning-border":"#FDE68A",
          danger:        "#B23838",  // CareFlow required/error colour
          "danger-bg":   "#FEF2F2",
          "danger-border":"#FECACA",
          info:          "#007A8F",
        },
      },
      fontSize: {
        // CareFlow type scale
        "cf-h1":   ["18px", { lineHeight: "24px", fontWeight: "600" }],
        "cf-h2":   ["14px", { lineHeight: "18px", fontWeight: "600" }],
        "cf-body": ["12px", { lineHeight: "15.96px", fontWeight: "400" }],
        "cf-sm":   ["11px", { lineHeight: "14px",   fontWeight: "400" }],
        "cf-xs":   ["10px", { lineHeight: "13px",   fontWeight: "500" }],
      },
      borderRadius: {
        cf:    "4px",   // --corner-radius/radius-md
        "cf-sm":"3px",  // inputs
        "cf-lg":"6px",  // cards / slideout
      },
      boxShadow: {
        // CareFlow elevation
        card:   "0 1px 3px rgba(13,22,29,0.08), 0 1px 2px rgba(13,22,29,0.04)",
        modal:  "0 4px 12px rgba(13,22,29,0.24)",
        btn:    "0px 1px 1px 0px rgba(0,0,0,0.12)",
        topbar: "0 1px 0 0 rgba(0,0,0,0.15)",
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
// Palette from the Failure Folks Academy logo and campaign banner.
// Theme-aware tokens (neutrals, brand blue, status tints) come from scripts/gen-theme.py → src/theme.css.
// Fixed in both themes: `navy` (panels, sidebar), `gold` (star / headline), `accent` orange (figure).
import theme from "./theme.colors.json" with { type: "json" };

const { gold_tints, accent_tints, ...themed } = theme;

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
      colors: {
        ...themed,
        // Logo navy #013876 — fixed, used for panels and the sidebar in both themes
        navy: {
          50: "#eef4ff", 100: "#dbe7ff", 200: "#bdd3ff", 300: "#8fb3fb", 400: "#5287f2",
          500: "#1f5fe0", 600: "#1349c0", 700: "#0d3d9c", 800: "#013876", 900: "#0a2a5c", 950: "#061a3d",
        },
        // Logo orange #F98F03 — brand accent; never used for status
        accent: { ...accent_tints, 200: "#ffcc88", 400: "#fca93a", 500: "#f98f03", 600: "#dd7700", 700: "#b25e00" },
        // Logo star gold #FCBB0B — highlights on navy
        gold: { ...gold_tints, 200: "#ffe27a", 400: "#fcbb0b", 500: "#e6a700", 600: "#b88400" },
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.05)",
        lift: "0 4px 12px -2px rgba(16,24,40,0.08), 0 2px 4px -2px rgba(16,24,40,0.04)",
        pop: "0 16px 40px -12px rgba(16,24,40,0.28)",
        glow: "0 10px 28px -10px rgba(1,56,118,0.55)",
      },
      borderRadius: { xl: "14px", "2xl": "18px" },
    },
  },
  plugins: [],
};

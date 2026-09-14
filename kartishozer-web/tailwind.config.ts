import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#E8503A",
          50: "#FDEEEC",
          100: "#FBDCD8",
          200: "#F5B4AB",
          300: "#EF8C7E",
          400: "#EC6851",
          500: "#E8503A",
          600: "#D03B26",
          700: "#A32E1E",
          800: "#762116",
          900: "#49140D",
        },
        accent: {
          DEFAULT: "#00B4A6",
          50: "#E6FAF8",
          100: "#CCF4F0",
          500: "#00B4A6",
          600: "#009488",
        },
        ink: {
          950: "#14100F",
          900: "#1E1917",
          700: "#463D39",
          500: "#786D68",
          300: "#B7ADA8",
          100: "#EDE7E4",
          50: "#FAF7F5",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-heebo)",
          "Segoe UI",
          "Arial Hebrew",
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        card: "0 2px 12px rgba(20, 16, 15, 0.06)",
        sheet: "0 -4px 24px rgba(20, 16, 15, 0.12)",
        pop: "0 8px 24px rgba(232, 80, 58, 0.25)",
      },
      spacing: {
        "safe-b": "env(safe-area-inset-bottom)",
        "safe-t": "env(safe-area-inset-top)",
      },
      maxWidth: {
        app: "480px",
      },
      keyframes: {
        "slide-up": {
          "0%": { transform: "translateY(16px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "slide-up": "slide-up 0.35s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;

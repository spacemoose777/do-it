import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#0f0f13",
          secondary: "#1a1a24",
          tertiary: "#252533",
        },
        text: {
          primary: "#e8e8ed",
          secondary: "#8b8b9e",
        },
        accent: {
          DEFAULT: "#6366f1",
          hover: "#818cf8",
        },
        success: "#22c55e",
        warning: "#f59e0b",
        danger: "#ef4444",
        border: "#2a2a3a",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

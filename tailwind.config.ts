import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["'DM Serif Display'", "serif"],
        body: ["'DM Sans'", "sans-serif"],
        mono: ["'DM Mono'", "monospace"],
      },
      colors: {
        sand: {
          50: "#faf8f4",
          100: "#f3ede0",
          200: "#e8dcc5",
          300: "#d9c5a0",
          400: "#c8a978",
          500: "#b8905a",
          600: "#a07848",
          700: "#85613c",
          800: "#6d5034",
          900: "#5a422d",
        },
        slate: {
          950: "#0a0f1a",
        },
      },
      animation: {
        "fade-up": "fadeUp 0.5s ease forwards",
        "count-up": "countUp 0.3s ease forwards",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        countUp: {
          from: { opacity: "0", transform: "scale(0.9)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

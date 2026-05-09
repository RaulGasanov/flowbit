import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/widgets/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/entities/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/shared/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-muted": "rgb(var(--surface-muted) / <alpha-value>)",
        page: "rgb(var(--page) / <alpha-value>)",
        sidebar: "rgb(var(--sidebar) / <alpha-value>)",
        panel: "rgb(var(--panel) / <alpha-value>)",
        "panel-muted": "rgb(var(--panel-muted) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        soft: "rgb(var(--soft) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
      },
    },
  },
  plugins: [],
};

export default config;

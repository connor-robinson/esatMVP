import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0e0f13",
        surface: "rgba(255, 255, 255, 0.05)",
        border: "rgba(255, 255, 255, 0.1)",
        primary: {
          DEFAULT: "#85BC82",
          hover: "#6c9e69",
          light: "#9fce9c",
        },
        interview: {
          DEFAULT: "#7b6fa6",
          hover: "#6b6194",
          light: "#8c7fba",
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Consolas", "monospace"],
        serif: ["Garamond", "EB Garamond", "Georgia", "serif"],
      },
      borderRadius: {
        "organic-sm": "6px",
        "organic-md": "10px",
        "organic-lg": "16px",
      },
      transitionTimingFunction: {
        signature: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
      transitionDuration: {
        instant: "120ms",
        fast: "200ms",
        normal: "300ms",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};

export default config;






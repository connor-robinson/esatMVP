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
        // Theme colors using CSS variables
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        "surface-elevated": "var(--color-surface-elevated)",
        "surface-subtle": "var(--color-surface-subtle)",
        "surface-mid": "var(--color-surface-mid)",
        "surface-neutral": "var(--color-surface-neutral)",
        border: "var(--color-border)",
        "border-subtle": "var(--color-border-subtle)",
        
        primary: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
        },
        secondary: "var(--color-secondary)",
        accent: "var(--color-accent)",
        
        // Subject colors
        maths: "var(--color-maths)",
        physics: "var(--color-physics)",
        chemistry: "var(--color-chemistry)",
        biology: "var(--color-biology)",
        advanced: "var(--color-advanced)",
        
        // Status colors
        success: "var(--color-success)",
        error: "var(--color-error)",
        warning: "var(--color-warning)",
        
        // Text colors
        text: {
          DEFAULT: "var(--color-text)",
          muted: "var(--color-text-muted)",
          subtle: "var(--color-text-subtle)",
          disabled: "var(--color-text-disabled)",
        },
        
        // Legacy support (for backward compatibility)
        interview: {
          DEFAULT: "var(--color-secondary)",
          hover: "var(--color-secondary)",
          light: "var(--color-secondary)",
        },
        cyan: {
          DEFAULT: "var(--color-accent)",
          hover: "var(--color-accent)",
          light: "var(--color-accent)",
        },
        
        // Neutral grays (kept for compatibility, but prefer theme colors)
        neutral: {
          950: "#0a0b0d",
          900: "var(--color-surface)",
          800: "var(--color-surface-elevated)",
          700: "#2a2f3d",
          600: "#3d4354",
          500: "#5a6072",
          400: "#7d8599",
          300: "#a4acbd",
          200: "#c9cfd9",
          100: "#e5e7eb",
          50: "#f5f6f7",
        },
        
        // Icon colors (using theme colors)
        icon: {
          base: "var(--color-text-muted)",
          shadow: "var(--color-text-subtle)",
          accent: "var(--color-primary)",
        },
        
        // Glow effects (using theme colors with opacity)
        glow: {
          primary: "rgba(133, 188, 130, 0.4)",
          focus: "rgba(133, 188, 130, 0.3)",
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        heading: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Consolas", "monospace"],
        serif: ["Garamond", "EB Garamond", "Georgia", "serif"],
      },
      fontSize: {
        xs: ["0.71rem", { lineHeight: "1.4" }],
        sm: ["0.857rem", { lineHeight: "1.4" }],
        base: ["1rem", { lineHeight: "1.5" }],
        lg: ["1.4rem", { lineHeight: "1.4" }],
        xl: ["1.96rem", { lineHeight: "1.3" }],
        "2xl": ["2.744rem", { lineHeight: "1.2" }],
        "3xl": ["3.842rem", { lineHeight: "1.1" }],
      },
      borderRadius: {
        "organic-sm": "6px",
        "organic-md": "10px",
        "organic-lg": "16px",
        "organic-xl": "24px",
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      transitionTimingFunction: {
        signature: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
      transitionDuration: {
        instant: "120ms",
        fast: "200ms",
        normal: "300ms",
        "400": "400ms",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        shake: "shake 0.4s ease-in-out",
        "pulse-soft": "pulseSoft 3s ease-in-out infinite",
        "glow-in": "glowIn 200ms cubic-bezier(0.32, 0.72, 0, 1)",
        "soft-scale": "softScale 120ms cubic-bezier(0.32, 0.72, 0, 1)",
        "gentle-slide": "gentleSlide 200ms cubic-bezier(0.32, 0.72, 0, 1)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-10px)" },
          "75%": { transform: "translateX(10px)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.9", transform: "scale(1.02)" },
        },
        glowIn: {
          "0%": { boxShadow: "0 0 0 0 transparent" },
          "100%": { boxShadow: "0 0 12px 0 rgba(133, 188, 130, 0.4)" },
        },
        softScale: {
          "0%": { transform: "scale(1)" },
          "100%": { transform: "scale(0.97)" },
        },
        gentleSlide: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      boxShadow: {
        glow: "0 0 12px 0 rgba(133, 188, 130, 0.4)",
        "glow-focus": "0 0 0 3px rgba(133, 188, 130, 0.3)",
      },
      spacing: {
        "18": "4.5rem",
      },
      scale: {
        "115": "1.15",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};

export default config;




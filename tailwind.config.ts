import type { Config } from "tailwindcss";
import { themeTokens } from "./src/config/theme";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/config/**/*.{js,ts}",
    "./src/lib/**/*.{js,ts}",
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
        "session-green": "var(--color-session-green)",
        success: "var(--color-success)",
        error: "var(--color-error)",
        warning: "var(--color-warning)",
        /** Drill card pills — dark-UI saturation in both light and dark */
        "difficulty-pill-easy": "var(--color-difficulty-pill-easy)",
        "difficulty-pill-medium": "var(--color-difficulty-pill-medium)",
        "difficulty-pill-hard": "var(--color-difficulty-pill-hard)",

        /** Folder/topic item card background */
        "folder-card": "var(--color-folder-card)",
        "folder-card-selected": "var(--color-folder-card-selected)",
        /** Muted button background (n500) */
        "surface-dark": "var(--color-surface-dark)",
        /** Easy difficulty pill */
        "difficulty-easy": "var(--color-difficulty-easy)",
        /** Medium difficulty pill */
        "difficulty-medium": "var(--color-difficulty-medium)",
        /** TMUA exam label accent (#CA7BB3 dark) */
        "tmua-accent": "var(--color-tmua-accent)",
        
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
          primary: themeTokens.shadows.glow.replace("0 0 12px 0 ", ""),
          focus: themeTokens.shadows.glowFocus.replace("0 0 0 3px ", ""),
        },
      },
      fontFamily: {
        sans: [...themeTokens.typography.fontFamily.sans],
        heading: [...themeTokens.typography.fontFamily.heading],
        mono: [...themeTokens.typography.fontFamily.mono],
        serif: [...themeTokens.typography.fontFamily.serif],
      },
      // Theme tuples widen to `(string | object)[]`; double-cast matches Tailwind's `[size, theme]` tuple type
      fontSize: { ...themeTokens.typography.fontSize } as unknown as NonNullable<
        NonNullable<Config["theme"]>["extend"]
      >["fontSize"],
      letterSpacing: {
        footnote: "0.1em",
        /** Headline / Light node `247:3340` */
        "headline-light": "0.4px",
        /** H2 / Bold node `247:3350` */
        "h2-bold": "1.17px",
      },
      borderRadius: {
        "organic-sm": themeTokens.radius.organicSm,
        "organic-md": themeTokens.radius.organicMd,
        "organic-lg": themeTokens.radius.organicLg,
        "organic-xl": themeTokens.radius.organicXl,
        xl: themeTokens.radius.xl,
        "2xl": themeTokens.radius["2xl"],
        "3xl": themeTokens.radius["3xl"],
      },
      transitionTimingFunction: {
        signature: themeTokens.motion.timing.signature,
      },
      transitionDuration: {
        instant: themeTokens.motion.duration.instant,
        fast: themeTokens.motion.duration.fast,
        normal: themeTokens.motion.duration.normal,
        "400": themeTokens.motion.duration["400"],
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
        "loading-dot": "loadingDot 1.1s ease-in-out infinite",
        "pricing-bulge": "pricingBulge 2.4s ease-in-out infinite",
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
          "100%": { boxShadow: "0 0 12px 0 rgba(169, 177, 103, 0.4)" },
        },
        softScale: {
          "0%": { transform: "scale(1)" },
          "100%": { transform: "scale(0.97)" },
        },
        gentleSlide: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        pricingBulge: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.035)" },
        },
      },
      boxShadow: {
        glow: themeTokens.shadows.glow,
        "glow-focus": themeTokens.shadows.glowFocus,
        "bar-floating": themeTokens.shadows.barFloating,
        "badge-mint": themeTokens.shadows.badgeMint,
        "modal-card": themeTokens.shadows.modalCard,
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




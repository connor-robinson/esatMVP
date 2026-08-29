"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  applyThemeCssVariables,
  LIGHT_MODE_STRATEGY_STORAGE_KEY,
  type LightModeStrategy,
} from "@/config/theme";
import { isMarketingHomepagePath } from "@/lib/homepage/routing";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
  lightStrategy: LightModeStrategy;
  toggleLightStrategy: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getInitialLightStrategy(): LightModeStrategy {
  if (typeof window === "undefined") return "inverted";
  const saved = localStorage.getItem(LIGHT_MODE_STRATEGY_STORAGE_KEY);
  return saved === "designed" || saved === "inverted" ? saved : "inverted";
}

// Get initial theme from localStorage or default to dark
// This runs on the client side only
function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  
  const savedTheme = localStorage.getItem("theme") as Theme;
  if (savedTheme && (savedTheme === "dark" || savedTheme === "light")) {
    return savedTheme;
  }
  return "dark";
}

function applyThemeToDocument(
  mode: Theme,
  lightStrategy: LightModeStrategy,
): void {
  if (mode === "dark") {
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
  } else {
    document.documentElement.classList.add("light");
    document.documentElement.classList.remove("dark");
  }
  applyThemeCssVariables(mode, lightStrategy);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMarketingHomepage = isMarketingHomepagePath(pathname);

  // Initialize with the theme from localStorage (or what the script set)
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    return getInitialTheme();
  });
  const [lightStrategy, setLightStrategy] = useState<LightModeStrategy>(() =>
    getInitialLightStrategy(),
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Sync with what might have been set by the initialization script
    const currentTheme = getInitialTheme();
    const currentLightStrategy = getInitialLightStrategy();
    setTheme(currentTheme);
    setLightStrategy(currentLightStrategy);

    const appliedTheme = isMarketingHomepagePath(window.location.pathname)
      ? "dark"
      : currentTheme;
    applyThemeToDocument(appliedTheme, currentLightStrategy);

    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    localStorage.setItem("theme", theme);
    localStorage.setItem(LIGHT_MODE_STRATEGY_STORAGE_KEY, lightStrategy);

    const appliedTheme = isMarketingHomepage ? "dark" : theme;
    applyThemeToDocument(appliedTheme, lightStrategy);
  }, [theme, lightStrategy, mounted, isMarketingHomepage]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const toggleLightStrategy = () => {
    setLightStrategy((prev) => (prev === "designed" ? "inverted" : "designed"));
  };

  const effectiveTheme: Theme = isMarketingHomepage ? "dark" : theme;
  const isDark = effectiveTheme === "dark";

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, isDark, lightStrategy, toggleLightStrategy }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}




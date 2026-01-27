"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize with the theme from localStorage (or what the script set)
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    // Check if html already has a class set by the script
    const htmlClass = document.documentElement.classList.contains("light") ? "light" : "dark";
    return htmlClass;
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Sync with what might have been set by the initialization script
    const currentTheme = getInitialTheme();
    setTheme(currentTheme);
    
    // Ensure the class is applied (in case script didn't run)
    if (currentTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
    
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("theme", theme);
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      } else {
        document.documentElement.classList.add("light");
        document.documentElement.classList.remove("dark");
      }
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const isDark = theme === "dark";

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark }}>
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




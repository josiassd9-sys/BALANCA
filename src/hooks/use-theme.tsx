
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

// --- Helper Functions ---

// Converts a hex color string to an HSL string 'h s l'.
function hexToHsl(hex: string): string {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  r /= 255; g /= 255; b /= 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);
  
  return `${h} ${s}% ${l}%`;
}

// Converts an HSL string 'h s l' back to a hex color string.
function hslToHex(hsl: string): string {
    const [h, s, l] = hsl.split(' ').map((val, i) => parseInt(val.replace('%', ''), 10) / (i > 0 ? 100 : 360));
    
    if (s === 0) return `#${Math.round(l * 255).toString(16).padStart(2, '0').repeat(3)}`;

    const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
    const g = Math.round(hue2rgb(p, q, h) * 255);
    const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}


// --- Theme Definition ---

const defaultTheme = {
  background: '#1c1c1e', // hsl(240 5% 15%)
  card: '#161618',       // hsl(240 5% 12%)
  primary: '#5ddc9d',      // hsl(158 44% 55%)
  foreground: '#fcfcfc',   // hsl(0 0% 98%)
  cardForeground: '#fcfcfc', // hsl(0 0% 98%)
  caçambaForeground: '#fcfcfc', // hsl(0 0% 98%)
};

export type Theme = typeof defaultTheme;

const THEME_STORAGE_KEY = 'app-theme-colors';

// --- Context Definition ---

interface ThemeContextType {
  theme: Theme;
  setTheme: (newTheme: Partial<Theme>) => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// --- Theme Provider Component ---

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Lazy initialization from localStorage
    if (typeof window === 'undefined') return defaultTheme;
    try {
      const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
      return storedTheme ? JSON.parse(storedTheme) : defaultTheme;
    } catch (error) {
      return defaultTheme;
    }
  });

  // Apply theme colors as CSS variables whenever the theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    root.style.setProperty('--background-hsl', hexToHsl(theme.background));
    root.style.setProperty('--card-hsl', hexToHsl(theme.card));
    root.style.setProperty('--primary-hsl', hexToHsl(theme.primary));
    root.style.setProperty('--foreground-hsl', hexToHsl(theme.foreground));
    root.style.setProperty('--card-foreground-hsl', hexToHsl(theme.cardForeground));
    root.style.setProperty('--cacamba-foreground-hsl', hexToHsl(theme.caçambaForeground));

  }, [theme]);

  // Function to update the theme state and save to localStorage
  const setTheme = useCallback((newTheme: Partial<Theme>) => {
    setThemeState(prevTheme => {
      const updatedTheme = { ...prevTheme, ...newTheme };
      try {
         if (typeof window !== 'undefined') {
            window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(updatedTheme));
         }
      } catch (error) {
        console.error("Failed to save theme to localStorage", error);
      }
      return updatedTheme;
    });
  }, []);

  // Function to reset the theme to defaults
  const resetTheme = useCallback(() => {
    setThemeState(defaultTheme);
    try {
        if (typeof window !== 'undefined') {
            window.localStorage.removeItem(THEME_STORAGE_KEY);
        }
    } catch (error) {
      console.error("Failed to remove theme from localStorage", error);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// --- Custom Hook to use the Theme Context ---

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

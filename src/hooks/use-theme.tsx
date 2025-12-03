
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

// Converts an HSL string 'h s% l%' back to a hex color string.
function hslToHex(hsl: string): string {
    if (!hsl || typeof hsl !== 'string') return '#000000';
    const parts = hsl.match(/(\d+)/g);
    if (!parts || parts.length < 3) return '#000000';
    
    let h = parseInt(parts[0], 10);
    let s = parseInt(parts[1], 10);
    let l = parseInt(parts[2], 10);

    s /= 100;
    l /= 100;

    let c = (1 - Math.abs(2 * l - 1)) * s;
    let x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    let m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) {
        r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
        r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
        r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
        r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
        r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
        r = c; g = 0; b = x;
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}


// --- Theme Definition ---

const defaultThemeHsl = {
  background: '240 5% 15%',
  card: '240 5% 12%',
  primary: '158 44% 55%',
  foreground: '0 0% 98%',
  cardForeground: '0 0% 98%',
  cacambaForeground: '0 0% 98%',
};

export type ThemeHsl = typeof defaultThemeHsl;
export type ThemeHex = { [K in keyof ThemeHsl]: string };


const THEME_STORAGE_KEY = 'app-theme-colors-hex';

// --- Context Definition ---

interface ThemeContextType {
  theme: ThemeHex;
  setTheme: (newTheme: Partial<ThemeHex>) => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const convertHslMapToHexMap = (hslTheme: ThemeHsl): ThemeHex => {
    return (Object.keys(hslTheme) as Array<keyof ThemeHsl>).reduce((acc, key) => {
        acc[key] = hslToHex(hslTheme[key]);
        return acc;
    }, {} as ThemeHex);
};


// --- Theme Provider Component ---

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeHex>(() => convertHslMapToHexMap(defaultThemeHsl));

  // On initial client-side mount, load theme from localStorage
  useEffect(() => {
    try {
      const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (storedTheme) {
        setThemeState(JSON.parse(storedTheme));
      }
    } catch (error) {
      console.error("Failed to load theme from localStorage", error);
    }
  }, []);

  // Apply theme colors as CSS variables whenever the theme changes
  useEffect(() => {
    const root = document.documentElement;
    (Object.keys(theme) as Array<keyof ThemeHex>).forEach(key => {
        const variableName = `--${key}-hsl`;
        root.style.setProperty(variableName, hexToHsl(theme[key]));
    });
    
    // Also save to localStorage on every change
    try {
        window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
    } catch (error) {
        console.error("Failed to save theme to localStorage", error);
    }

  }, [theme]);

  // Function to update the theme state
  const setTheme = useCallback((newTheme: Partial<ThemeHex>) => {
    setThemeState(prevTheme => ({ ...prevTheme, ...newTheme }));
  }, []);

  // Function to reset the theme to defaults
  const resetTheme = useCallback(() => {
    setThemeState(convertHslMapToHexMap(defaultThemeHsl));
    try {
        window.localStorage.removeItem(THEME_STORAGE_KEY);
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

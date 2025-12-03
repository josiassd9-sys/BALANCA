
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

// --- Helper Functions ---

function hexToHsl(hex: string): string {
  if (!hex || !hex.startsWith('#')) return '0 0% 0%';
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

function hslToHex(hsl: string): string {
    if (!hsl || typeof hsl !== 'string') return '#000000';
    const parts = hsl.match(/(\d+(\.\d+)?)/g);
    if (!parts || parts.length < 3) return '#000000';
    
    let h = parseFloat(parts[0]);
    let s = parseFloat(parts[1]);
    let l = parseFloat(parts[2]);

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

const defaultThemeColorsHsl = {
  background: '240 5% 15%',
  foreground: '0 0% 98%',
  card: '240 5% 12%',
  cardForeground: '0 0% 98%',
  popover: '240 6% 9%',
  popoverForeground: '0 0% 98%',
  primary: '158 44% 55%',
  primaryForeground: '158 44% 95%',
  secondary: '240 3.7% 15.9%',
  secondaryForeground: '0 0% 98%',
  muted: '240 3.7% 15.9%',
  mutedForeground: '240 5% 64.9%',
  accent: '240 3.7% 15.9%',
  accentForeground: '0 0% 98%',
  destructive: '0 62.8% 30.6%',
  destructiveForeground: '0 0% 98%',
  border: '240 3.7% 40%',
  input: '240 3.7% 15.9%',
  ring: '158 44% 55%',
  cacambaForeground: '0 0% 98%',
  accentPrice: '38 95% 55%',
};

const defaultThemeConfig = {
    colors: (Object.keys(defaultThemeColorsHsl) as Array<keyof typeof defaultThemeColorsHsl>).reduce((acc, key) => {
        acc[key] = hslToHex(defaultThemeColorsHsl[key]);
        return acc;
    }, {} as ThemeHex),
    radius: 0.5,
    fontFamily: 'Inter',
};


export type ThemeHex = { [key: string]: string };
export type AppTheme = typeof defaultThemeConfig;


const THEME_STORAGE_KEY = 'app-theme-config';

// --- Context Definition ---

interface ThemeContextType {
  theme: AppTheme;
  setTheme: (newTheme: Partial<AppTheme>) => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);


// --- Theme Provider Component ---

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>(defaultThemeConfig);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // On initial client-side mount, load theme from localStorage
  useEffect(() => {
    if (!isClient) return;
    try {
      const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (storedTheme) {
        const parsed = JSON.parse(storedTheme);
        // Merge stored theme with defaults to avoid breaking changes
        setThemeState(prevTheme => ({
          ...prevTheme,
          ...parsed,
          colors: {
            ...prevTheme.colors,
            ...(parsed.colors || {}),
          }
        }));
      }
    } catch (error) {
      console.error("Failed to load theme from localStorage", error);
    }
  }, [isClient]);

  // Apply theme as CSS variables whenever it changes
  useEffect(() => {
    if (!isClient) return;

    const root = document.documentElement;
    
    // Apply colors
    (Object.keys(theme.colors) as Array<keyof ThemeHex>).forEach(key => {
        const variableName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
        root.style.setProperty(`${variableName}-hsl`, hexToHsl(theme.colors[key]));
    });

    // Apply radius
    root.style.setProperty('--radius', `${theme.radius}rem`);

    // Apply font family to body
    const newFontClass = `font-${theme.fontFamily.toLowerCase()}`;
    document.body.className = newFontClass;
    
    // Also apply to root for good measure, though body is usually sufficient
    root.className = newFontClass;


    // Save to localStorage
    try {
        window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
    } catch (error) {
        console.error("Failed to save theme to localStorage", error);
    }

  }, [theme, isClient]);

  // Function to update the theme state
  const setTheme = useCallback((newThemeConfig: Partial<AppTheme>) => {
    setThemeState(prevTheme => ({
        ...prevTheme,
        ...newThemeConfig,
        colors: {
            ...prevTheme.colors,
            ...(newThemeConfig.colors || {})
        }
    }));
  }, []);

  // Function to reset the theme to defaults
  const resetTheme = useCallback(() => {
    setThemeState(defaultThemeConfig);
    if (isClient) {
        try {
            window.localStorage.removeItem(THEME_STORAGE_KEY);
        } catch (error) {
          console.error("Failed to remove theme from localStorage", error);
        }
    }
  }, [isClient]);

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

    
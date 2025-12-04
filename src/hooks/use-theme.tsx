
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { themes, defaultTheme } from '@/lib/themes';

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


// --- Theme Definition ---
export type ThemeHex = { [key: string]: string };

export interface AppTheme {
    colors: ThemeHex;
    radius: number;
    fontFamily: string;
    fontSize: number;
    titleFontFamily: string;
    titleFontSize: number;
}

const defaultThemeConfig: AppTheme = {
    colors: defaultTheme.colors,
    radius: 0.5,
    fontFamily: 'Inter',
    fontSize: 16,
    titleFontFamily: 'Inter',
    titleFontSize: 24,
};


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
    const fontClassMap: { [key: string]: string } = {
        'Inter': 'font-inter',
        'Roboto': 'font-roboto',
        'Lato': 'font-lato',
        'Poppins': 'font-poppins',
        'Open Sans': 'font-open-sans',
        'Nunito': 'font-nunito',
    };
    
    // Clear existing font classes before adding the new one
    Object.values(fontClassMap).forEach(fontClass => {
        document.body.classList.remove(fontClass);
    });
    
    const newFontClass = fontClassMap[theme.fontFamily] || 'font-inter';
    document.body.classList.add(newFontClass);
    
    // Apply font size
    root.style.fontSize = `${theme.fontSize}px`;

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

    
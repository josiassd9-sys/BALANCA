
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { defaultTheme, themes } from '@/lib/themes';

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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}


// --- Theme Definition ---
export type ThemeHex = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  inputBorder: string;           // ← NOVO
  inputFocusBorder: string;      // ← NOVO
  ring: string;
  displayDigits?: string;
  cacambaForeground: string;
  accentPrice: string;
  liquidTotal?: string;
  settingsButtonBg: string;
};

export type ShadowIntensity = 'none' | 'soft' | 'medium' | 'strong' | 'extreme';
export type CollapseAnimationVariant = 'none' | 'snappy' | 'smooth' | 'gentle';
export type InputDepthPreset = 'flat' | 'soft' | 'medium' | 'strong' | 'deep';

export interface AppTheme {
  colors: ThemeHex;
  radius: number;
  fontFamily: string;
  fontSize: number;
  titleFontFamily: string;
  titleFontSize: number;
  appTitle: string;
  shadowIntensity: ShadowIntensity;
  shadowStrength: number;
  motionStrength: number;
  inputDepthPreset: InputDepthPreset;
  inputDepthStrength: number;
  collapseAnimationVariant: CollapseAnimationVariant;
}

const defaultThemeConfig: AppTheme = {
  // New installations start with "Menta Fresca" and can be changed by the user later.
  colors: {
    ...(themes.find((themePreset) => themePreset.name === 'Menta Fresca')?.colors || defaultTheme.colors),
    // Keep display digits readable while allowing further customization in settings.
    displayDigits: '#10B981',
    // Requested default for first install.
    liquidTotal: '#DC2626',
  },
  radius: 0.8,
  fontFamily: 'Inter',
  fontSize: 16,
  titleFontFamily: 'Inter',
  titleFontSize: 24,
  appTitle: 'Pesagem Avulsa',
  shadowIntensity: 'medium',
  shadowStrength: 500,
  motionStrength: 500,
  inputDepthPreset: 'medium',
  inputDepthStrength: 500,
  collapseAnimationVariant: 'smooth',
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
  const [hasHydratedTheme, setHasHydratedTheme] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    try {
      const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme) {
        const parsedTheme = JSON.parse(savedTheme) as Partial<AppTheme>;
        setThemeState((prevTheme) => ({
          ...prevTheme,
          ...parsedTheme,
          colors: {
            ...prevTheme.colors,
            ...(parsedTheme.colors || {}),
          },
          shadowIntensity: parsedTheme.shadowIntensity || prevTheme.shadowIntensity,
          shadowStrength: clamp(typeof parsedTheme.shadowStrength === 'number' ? parsedTheme.shadowStrength : prevTheme.shadowStrength, 0, 1000),
          motionStrength: clamp(typeof parsedTheme.motionStrength === 'number' ? parsedTheme.motionStrength : prevTheme.motionStrength, 0, 1000),
          inputDepthPreset: parsedTheme.inputDepthPreset || prevTheme.inputDepthPreset,
          inputDepthStrength: clamp(typeof parsedTheme.inputDepthStrength === 'number' ? parsedTheme.inputDepthStrength : prevTheme.inputDepthStrength, 0, 1000),
          collapseAnimationVariant: parsedTheme.collapseAnimationVariant || prevTheme.collapseAnimationVariant,
        }));
      }
    } catch (error) {
      console.error("Failed to load theme from localStorage", error);
    } finally {
      setHasHydratedTheme(true);
    }
  }, [isClient]);

  // Apply theme as CSS variables whenever it changes
  useEffect(() => {
    if (!isClient || !hasHydratedTheme) return;

    const root = document.documentElement;

    // Apply colors - Versão corrigida para suportar camelCase -> kebab-case
    (Object.keys(theme.colors) as Array<keyof ThemeHex>).forEach((key) => {
      const value = theme.colors[key];
      if (typeof value !== "string") return;

      const variableName = `--${key.replace(/([A-Z])/g, "-$1").toLowerCase()}-hsl`;
      root.style.setProperty(variableName, hexToHsl(value));
    });

    root.style.setProperty('--radius', `${theme.radius}rem`);

    const fontClassMap: { [key: string]: string } = {
      'Inter': 'font-inter', 'Roboto': 'font-roboto', 'Lato': 'font-lato', 'Poppins': 'font-poppins',
      'Open Sans': 'font-open-sans', 'Nunito': 'font-nunito', 'Montserrat': 'font-montserrat',
      'Playfair Display': 'font-playfair', 'Raleway': 'font-raleway', 'Bebas Neue': 'font-bebas',
      'Lobster': 'font-lobster', 'Oswald': 'font-oswald', 'Source Sans Pro': 'font-source-sans-pro',
      'Exo 2': 'font-exo-2', 'Ubuntu': 'font-ubuntu', 'PT Sans': 'font-pt-sans',
      'Titillium Web': 'font-titillium-web', 'Fira Sans': 'font-fira-sans', 'Quicksand': 'font-quicksand',
      'Merriweather': 'font-merriweather', 'PT Serif': 'font-pt-serif', 'Lora': 'font-lora',
      'EB Garamond': 'font-eb-garamond', 'Cormorant Garamond': 'font-cormorant-garamond', 'Arvo': 'font-arvo',
      'Crimson Text': 'font-crimson-text', 'Bitter': 'font-bitter', 'Roboto Slab': 'font-roboto-slab',
      'Anton': 'font-anton', 'Archivo Black': 'font-archivo-black', 'Righteous': 'font-righteous',
      'Passion One': 'font-passion-one', 'Russo One': 'font-russo-one', 'Ultra': 'font-ultra',
      'Staatliches': 'font-staatliches', 'Changa One': 'font-changa-one', 'Teko': 'font-teko',
      'Yanone Kaffeesatz': 'font-yanone-kaffeesatz', 'Pacifico': 'font-pacifico', 'Dancing Script': 'font-dancing-script',
      'Satisfy': 'font-satisfy', 'Caveat': 'font-caveat', 'Shadows Into Light': 'font-shadows-into-light',
      'Kaushan Script': 'font-kaushan-script', 'Great Vibes': 'font-great-vibes', 'Source Code Pro': 'font-source-code-pro',
      'Special Elite': 'font-special-elite', 'Press Start 2P': 'font-press-start-2p', 'Rock Salt': 'font-rock-salt'
    };

    Object.values(fontClassMap).forEach((fontClass) => {
      document.body.classList.remove(fontClass);
    });

    const newFontClass = fontClassMap[theme.fontFamily] || 'font-inter';
    document.body.classList.add(newFontClass);
    root.style.fontSize = `${theme.fontSize}px`;
    root.setAttribute('data-shadow-intensity', theme.shadowIntensity);
    root.setAttribute('data-motion-variant', theme.collapseAnimationVariant);

    const shadowStrengthScale = clamp(theme.shadowStrength, 0, 1000) / 500;
    root.style.setProperty('--shadow-strength-scale', shadowStrengthScale.toFixed(3));

    const motionStrengthScale = clamp(theme.motionStrength, 0, 1000) / 500;
    root.style.setProperty('--motion-strength-scale', motionStrengthScale.toFixed(3));

    const inputDepthBaseMap: Record<InputDepthPreset, number> = {
      flat: 0,
      soft: 0.25,
      medium: 0.5,
      strong: 0.75,
      deep: 1,
    };
    const inputDepthBase = inputDepthBaseMap[theme.inputDepthPreset];
    const inputDepthScale = clamp(theme.inputDepthStrength, 0, 1000) / 1000;
    const inputDepthTotal = clamp(inputDepthBase + inputDepthScale, 0, 2);
    root.style.setProperty('--input-depth-scale', inputDepthTotal.toFixed(3));

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
    } catch (error) {
      console.error("Failed to save theme to localStorage", error);
    }
  }, [theme, isClient, hasHydratedTheme]);

  // Function to update the theme state
  const setTheme = useCallback((newThemeConfig: Partial<AppTheme>) => {
    setThemeState(prevTheme => ({
        ...prevTheme,
        ...newThemeConfig,
        shadowStrength: clamp(
          typeof newThemeConfig.shadowStrength === 'number' ? newThemeConfig.shadowStrength : prevTheme.shadowStrength,
          0,
          1000,
        ),
        motionStrength: clamp(
          typeof newThemeConfig.motionStrength === 'number' ? newThemeConfig.motionStrength : prevTheme.motionStrength,
          0,
          1000,
        ),
        inputDepthStrength: clamp(
          typeof newThemeConfig.inputDepthStrength === 'number' ? newThemeConfig.inputDepthStrength : prevTheme.inputDepthStrength,
          0,
          1000,
        ),
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

    

    
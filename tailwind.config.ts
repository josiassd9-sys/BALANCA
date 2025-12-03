
import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ['var(--font-inter)'],
        roboto: ['var(--font-roboto)'],
        lato: ['var(--font-lato)'],
      },
      colors: {
        border: 'hsl(var(--border-hsl))',
        input: 'hsl(var(--input-hsl))',
        ring: 'hsl(var(--ring-hsl))',
        background: 'hsl(var(--background-hsl))',
        foreground: 'hsl(var(--foreground-hsl))',
        primary: {
          DEFAULT: 'hsl(var(--primary-hsl))',
          foreground: 'hsl(var(--primary-foreground-hsl))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary-hsl))',
          foreground: 'hsl(var(--secondary-foreground-hsl))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive-hsl))',
          foreground: 'hsl(var(--destructive-foreground-hsl))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted-hsl))',
          foreground: 'hsl(var(--muted-foreground-hsl))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent-hsl))',
          foreground: 'hsl(var(--accent-foreground-hsl))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover-hsl))',
          foreground: 'hsl(var(--popover-foreground-hsl))',
        },
        card: {
          DEFAULT: 'hsl(var(--card-hsl))',
          foreground: 'hsl(var(--card-foreground-hsl))',
        },
        'accent-price': 'hsl(var(--accent-price-hsl))',
        'cacamba-foreground': 'hsl(var(--cacamba-foreground-hsl))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;

    
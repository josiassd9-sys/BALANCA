
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
        'inter': ['Inter', 'sans-serif'],
        'roboto': ['Roboto', 'sans-serif'],
        'lato': ['Lato', 'sans-serif'],
        'poppins': ['Poppins', 'sans-serif'],
        'open-sans': ['Open Sans', 'sans-serif'],
        'nunito': ['Nunito', 'sans-serif'],
        'montserrat': ['Montserrat', 'sans-serif'],
        'playfair-display': ['Playfair Display', 'serif'],
        'raleway': ['Raleway', 'sans-serif'],
        'bebas-neue': ['Bebas Neue', 'sans-serif'],
        'lobster': ['Lobster', 'cursive'],
        'oswald': ['Oswald', 'sans-serif'],
        'source-sans-pro': ['Source Sans Pro', 'sans-serif'],
        'exo-2': ['Exo 2', 'sans-serif'],
        'ubuntu': ['Ubuntu', 'sans-serif'],
        'pt-sans': ['PT Sans', 'sans-serif'],
        'titillium-web': ['Titillium Web', 'sans-serif'],
        'fira-sans': ['Fira Sans', 'sans-serif'],
        'quicksand': ['Quicksand', 'sans-serif'],
        'merriweather': ['Merriweather', 'serif'],
        'pt-serif': ['PT Serif', 'serif'],
        'lora': ['Lora', 'serif'],
        'eb-garamond': ['EB Garamond', 'serif'],
        'cormorant-garamond': ['Cormorant Garamond', 'serif'],
        'arvo': ['Arvo', 'serif'],
        'crimson-text': ['Crimson Text', 'serif'],
        'bitter': ['Bitter', 'serif'],
        'roboto-slab': ['Roboto Slab', 'serif'],
        'anton': ['Anton', 'sans-serif'],
        'archivo-black': ['Archivo Black', 'sans-serif'],
        'righteous': ['Righteous', 'cursive'],
        'passion-one': ['Passion One', 'cursive'],
        'russo-one': ['Russo One', 'sans-serif'],
        'ultra': ['Ultra', 'serif'],
        'staatliches': ['Staatliches', 'cursive'],
        'changa-one': ['Changa One', 'cursive'],
        'teko': ['Teko', 'sans-serif'],
        'yanone-kaffeesatz': ['Yanone Kaffeesatz', 'sans-serif'],
        'pacifico': ['Pacifico', 'cursive'],
        'dancing-script': ['Dancing Script', 'cursive'],
        'satisfy': ['Satisfy', 'cursive'],
        'caveat': ['Caveat', 'cursive'],
        'shadows-into-light': ['Shadows Into Light', 'cursive'],
        'kaushan-script': ['Kaushan Script', 'cursive'],
        'great-vibes': ['Great Vibes', 'cursive'],
        'source-code-pro': ['Source Code Pro', 'monospace'],
        'special-elite': ['Special Elite', 'cursive'],
        'press-start-2p': ['Press Start 2P', 'cursive'],
        'rock-salt': ['Rock Salt', 'cursive'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }],
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

    
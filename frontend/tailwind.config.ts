import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/sections/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#13102B',
        indigo: {
          DEFAULT: '#1E1B4B',
          light: '#2D2A6B',
        },
        violet: {
          DEFAULT: '#6C4AB6',
          soft: 'rgba(108, 74, 182, 0.15)',
          glow: 'rgba(108, 74, 182, 0.4)',
        },
        mint: {
          DEFAULT: '#00E6A8',
          soft: 'rgba(0, 230, 168, 0.12)',
          glow: 'rgba(0, 230, 168, 0.35)',
        },
        // Legacy Brand Palette Aliases
        qiflow: {
          ink: '#13102B',
          indigo: '#1E1B4B',
          violet: '#6C4AB6',
          mint: '#00E6A8',
          lilac: '#C9BCF0',
          offwhite: '#F7F6FB',
          white: '#FFFFFF',
        },
        brand: {
          ink: '#13102B',
          indigo: '#1E1B4B',
          violet: '#6C4AB6',
          mint: '#00E6A8',
          lilac: '#C9BCF0',
          offwhite: '#F7F6FB',
          white: '#FFFFFF',
          DEFAULT: '#6C4AB6',
          50: '#F7F6FB',
          100: '#e5e1f7',
          200: '#C9BCF0',
          300: '#a894e6',
          400: '#876cdb',
          500: '#6C4AB6',
          600: '#55379b',
          700: '#3e257a',
          800: '#1E1B4B',
          900: '#13102B',
          950: '#0a0817',
        },
      },
      fontFamily: {
        sans: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        '2xl': '20px',
        'xl': '14px',
      },
      boxShadow: {
        'glow-mint': '0 0 40px rgba(0, 230, 168, 0.35)',
        'glow-violet': '0 0 40px rgba(108, 74, 182, 0.4)',
        'card': '0 8px 32px rgba(0,0,0,0.4)',
        'card-lg': '0 20px 60px rgba(0,0,0,0.5)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        drift: 'drift 22s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        drift: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(40px, -30px) scale(1.1)' },
          '66%': { transform: 'translate(-30px, 20px) scale(0.95)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 12px rgba(0, 230, 168, 0.35)' },
          '50%': { opacity: '0.5', boxShadow: '0 0 4px rgba(0, 230, 168, 0.35)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

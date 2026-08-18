import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Official QiFlow Brand Palette
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
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
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
      },
    },
  },
  plugins: [],
};

export default config;

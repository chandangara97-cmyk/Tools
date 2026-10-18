/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#05080f',
          900: '#080e1a',
          800: '#121a2c',
          700: '#1a2438',
          600: '#243044',
        },
        teal: {
          accent: '#5b8def',
          dark: '#072b27',
          light: '#9aa8ff',
        },
        gold: {
          DEFAULT: '#e8b84a',
          soft: '#f7df9a',
          dim: 'rgba(226,176,74,0.15)',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'Public Sans', 'system-ui', 'sans-serif'],
        serif: ['Instrument Serif', 'Zilla Slab', 'Georgia', 'serif'],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0,0,0,0.3)',
        'glass-lg': '0 24px 64px rgba(0,0,0,0.45)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
    },
  },
  plugins: [],
}

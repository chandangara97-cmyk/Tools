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
          900: '#07161d',
          800: '#0b2545',
          700: '#102b4e',
          600: '#173a67',
        },
        teal: {
          accent: '#0e8a7d',
          dark: '#072b27',
          light: '#27b3a3',
        },
        gold: {
          DEFAULT: '#d6a34b',
          soft: '#f7dfae',
        }
      }
    },
  },
  plugins: [],
}

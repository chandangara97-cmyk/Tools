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
          900: '#0d1224',
          800: '#0b2545',
          700: '#102b4e',
          600: '#173a67',
        },
        teal: {
          accent: '#4f46e5',
          dark: '#072b27',
          light: '#9aa8ff',
        },
        gold: {
          DEFAULT: '#f2b233',
          soft: '#ffe3a3',
        }
      }
    },
  },
  plugins: [],
}

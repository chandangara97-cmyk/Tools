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
          800: '#121830',
          700: '#181f3d',
          600: '#1d2547',
        },
        teal: {
          accent: '#4f46e5',
          dark: '#0d1224',
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

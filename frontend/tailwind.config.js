import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        red: {
          50: '#fef2f2',
          100: '#fef2f2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#FF0505',
          600: '#CC0000',
          700: '#B30000',
          800: '#990000',
          900: '#800000',
        }
      }
    },
  },
  plugins: [
    typography,
  ],
}
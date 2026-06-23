/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          600: '#0D9488',
          700: '#0F766E',
        },
        navy: '#0D1B2A',
      }
    },
  },
  plugins: [],
}
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-mint': '#3ED2B9',
        'background-base': '#FAFFFF',
        'background-card': '#FFFFFF',
        'text-primary': '#2E2E2E',
        'text-secondary': '#6E6E6E',
        'error-red': '#E74C3C',
        'border-light': '#E6E6E6',
        'panel-bg-primary': '#FFFFFF',
        'panel-bg-secondary': '#FFFFFF',
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', '"Noto Sans KR"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
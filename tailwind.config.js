/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#007AFF",
        "secondary": "#5AC8FA",
        "success": "#4CD964",
        "warning": "#FF9500",
        "danger": "#FF3B30",
      },
      fontFamily: {
        "sans": ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      animation: {
        'shimmer': 'shimmer 2s infinite',
      },
    },
  },
}

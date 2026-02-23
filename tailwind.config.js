/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./{components,services,styles,public}/**/*.{js,ts,jsx,tsx,html,css}"
  ],
  darkMode: "class",
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
        'shimmer': 'shimmer 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'fadeIn': 'fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        'slideDown': 'slideDown 0.3s ease-out',
        'slideUp': 'slideUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slideUpFast': 'slideUpFast 0.3s ease-out',
        'slideRight': 'slideRight 0.3s ease-out',
        'iosPageIn': 'iosPageIn var(--duration-medium) var(--ease-ios-standard)',
        'iosBackdropIn': 'iosBackdropIn var(--duration-short) ease-out',
        'iosSheetIn': 'iosSheetIn var(--duration-medium) var(--ease-ios-snappy)',
        'iosSoftPulse': 'iosSoftPulse 2.4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(30px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideUpFast: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideRight: {
          from: { opacity: '0', transform: 'translateX(-20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        iosPageIn: {
          '0%': { opacity: '0', transform: 'translateY(14px) scale(0.992)', filter: 'blur(2px)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)', filter: 'blur(0)' },
        },
        iosSheetIn: {
          '0%': { opacity: '0', transform: 'translateY(28px) scale(0.985)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        iosBackdropIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        iosSoftPulse: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
}

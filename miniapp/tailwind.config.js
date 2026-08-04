/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        bg: '#090615',
        surface: '#120f26',
        'surface-soft': '#1e1a3a',
        border: '#2a264f',
        ink: '#ffffff',
        'ink-soft': '#94a3b8',
        'ink-faint': '#475569',
        success: '#10b981',
        'success-soft': '#064e3b',
        danger: '#ef4444',
        'danger-soft': '#7f1d1d',
        warning: '#f59e0b',
        'warning-soft': '#78350f',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #3b82f6, #8b5cf6, #d946ef)',
        'gradient-blue': 'linear-gradient(135deg, #3b82f6, #06b6d4)',
      },
      borderRadius: {
        '2xl': '16px',
        'pill': '999px',
      },
      boxShadow: {
        'soft': '0 4px 20px rgba(0, 0, 0, 0.15)',
      }
    },
  },
  plugins: [],
}
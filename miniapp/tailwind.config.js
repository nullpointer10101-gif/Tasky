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
        bg: '#f8fafc',
        surface: '#ffffff',
        'surface-soft': '#f1f5f9',
        border: '#e2e8f0',
        ink: '#0f172a',
        'ink-soft': '#475569',
        'ink-faint': '#94a3b8',
        success: '#10b981',
        'success-soft': '#d1fae5',
        danger: '#ef4444',
        'danger-soft': '#fee2e2',
        warning: '#f59e0b',
        'warning-soft': '#fef3c7',
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
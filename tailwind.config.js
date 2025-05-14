/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#0f172a',
        'secondary': '#1e293b',
        'accent-blue': {
          DEFAULT: '#38bdf8',
          '40': 'rgba(56, 189, 248, 0.4)',
          '20': 'rgba(56, 189, 248, 0.2)',
          '10': 'rgba(56, 189, 248, 0.1)',
        },
        'accent-purple': {
          DEFAULT: '#a855f7',
          '40': 'rgba(168, 85, 247, 0.4)',
          '20': 'rgba(168, 85, 247, 0.2)',
          '10': 'rgba(168, 85, 247, 0.1)',
        },
        'accent-pink': {
          DEFAULT: '#ec4899',
          '40': 'rgba(236, 72, 153, 0.4)',
          '20': 'rgba(236, 72, 153, 0.2)',
          '10': 'rgba(236, 72, 153, 0.1)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Roboto Mono', 'monospace'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  safelist: [
    'shadow-accent-purple/40',
    'shadow-accent-blue/40',
    'shadow-accent-pink/40',
  ],
  plugins: [],
}


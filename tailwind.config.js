/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '480px',
        'game-sm': '1024px',
        'game-md': '1280px',
        'game-lg': '1920px',
      },
      fontSize: {
        'game-title': ['var(--font-game-title)', { lineHeight: '1.1' }],
        'game-heading': ['var(--font-game-heading)', { lineHeight: '1.2' }],
        'game-subheading': ['var(--font-game-subheading)', { lineHeight: '1.3' }],
        'game-body': ['var(--font-game-body)', { lineHeight: '1.5' }],
        'game-caption': ['var(--font-game-caption)', { lineHeight: '1.4' }],
        'game-micro': ['var(--font-game-micro)', { lineHeight: '1.3' }],
      },
      colors: {
        arcane: {
          dark: '#0a0a1a',
          darker: '#050510',
          purple: '#4a2c6a',
          'purple-light': '#6b4d8a',
          gold: '#d4af37',
          'gold-light': '#e8c555',
          glow: '#8866aa',
          ember: '#ff6b35',
          ice: '#4da6ff',
          poison: '#7cfc00',
        },
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body: ['Inter', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'shake': 'shake 0.5s ease-in-out',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 10px rgba(212,175,55,0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(212,175,55,0.6)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
      },
    },
  },
  plugins: [],
};

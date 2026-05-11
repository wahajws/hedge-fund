/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        terminal: {
          base: '#050b11',
          shell: '#071019',
          panel: '#0b1722',
          muted: '#101f2b',
          line: '#1d3545',
          strong: '#31566b'
        },
        risk: {
          normal: '#22c55e',
          watch: '#22d3ee',
          elevated: '#f59e0b',
          high: '#f97316',
          critical: '#ef4444'
        }
      },
      fontFamily: {
        sans: ['Inter', 'IBM Plex Sans', 'Segoe UI', 'Arial', 'sans-serif'],
        mono: ['IBM Plex Mono', 'JetBrains Mono', 'Consolas', 'monospace']
      },
      boxShadow: {
        panel: '0 16px 40px rgba(0, 0, 0, 0.35)'
      }
    }
  },
  plugins: []
};

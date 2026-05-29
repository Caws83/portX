/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        portx: {
          black: '#050508',
          surface: '#0c0c12',
          card: '#12121a',
          border: '#1e1e2e',
          muted: '#6b7280',
          green: '#00ff88',
          'green-dim': '#00cc6a',
          blue: '#00d4ff',
          'blue-dim': '#0099cc',
          danger: '#ff4466',
          warning: '#ffaa00',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 40px rgba(0, 255, 136, 0.15)',
        'glow-blue': '0 0 40px rgba(0, 212, 255, 0.15)',
        card: '0 4px 24px rgba(0, 0, 0, 0.4)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(ellipse at top, rgba(0, 255, 136, 0.08) 0%, transparent 50%)',
        'gradient-hero': 'linear-gradient(135deg, rgba(0, 255, 136, 0.1) 0%, rgba(0, 212, 255, 0.05) 100%)',
      },
    },
  },
  plugins: [],
}

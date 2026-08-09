/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Cairo', 'system-ui', 'sans-serif']
      },
      colors: {
        pure: '#ffffff',
        ink: {
          950: 'rgb(var(--ink-950) / <alpha-value>)',
          900: 'rgb(var(--ink-900) / <alpha-value>)',
          850: 'rgb(var(--ink-850) / <alpha-value>)',
          800: 'rgb(var(--ink-800) / <alpha-value>)',
          700: 'rgb(var(--ink-700) / <alpha-value>)',
          600: 'rgb(var(--ink-600) / <alpha-value>)'
        },
        white: 'rgb(var(--fg) / <alpha-value>)',
        brand: {
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e'
        },
        neon: {
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b'
        }
      },
      boxShadow: {
        glow: '0 0 45px rgba(20,184,166,.35)',
        'glow-amber': '0 0 45px rgba(251,191,36,.28)',
        'glow-neon': '0 0 60px rgba(13,148,136,.45)',
        card: '0 10px 40px rgba(0,0,0,.45)'
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        floatSlow: 'float 9s ease-in-out infinite',
        fadeUp: 'fadeUp .7s ease both',
        'spin-slow': 'spin 16s linear infinite',
        'spin-slow-rev': 'spin 22s linear infinite reverse',
        pulseSoft: 'pulseSoft 3s ease-in-out infinite',
        pingSoft: 'pingSoft 2.6s cubic-bezier(0, 0, 0.2, 1) infinite',
        orbit: 'orbit 4s linear infinite',
        orbitRev: 'orbitRev 7s linear infinite',
        shimmer: 'shimmer 4s linear infinite'
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-14px)' }
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'none' }
        },
        pulseSoft: {
          '0%,100%': { opacity: '.55' },
          '50%': { opacity: '1' }
        },
        pingSoft: {
          '0%': { transform: 'scale(1)', opacity: '.6' },
          '75%,100%': { transform: 'scale(1.8)', opacity: '0' }
        },
        orbit: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' }
        },
        orbitRev: {
          from: { transform: 'rotate(360deg)' },
          to: { transform: 'rotate(0deg)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' }
        }
      }
    }
  },
  plugins: []
};

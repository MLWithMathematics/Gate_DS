/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // GATE.AI Flux-inspired palette
        flux: {
          dark:    '#0F2044',   // deep navy — dark sections, text
          navy:    '#1E3A5F',   // mid navy
          blue:    '#2563EB',   // primary accent
          'blue-dark': '#1D4ED8',
          'blue-light': '#EFF6FF',
          slate:   '#475569',   // body text
          light:   '#F8FAFC',   // alternate section bg
          border:  '#E2E8F0',   // subtle borders
          success: '#059669',
          warning: '#D97706',
          error:   '#DC2626',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans:    ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'slide-in': {
          from: { opacity: '0', transform: 'translateX(-16px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        'count-up': {
          from: { opacity: '0', transform: 'scale(0.8)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        'fade-up':        'fade-up 0.5s ease forwards',
        float:            'float 4s ease-in-out infinite',
        shimmer:          'shimmer 2s linear infinite',
        'slide-in':       'slide-in 0.4s ease forwards',
        'count-up':       'count-up 0.4s ease forwards',
      },
      boxShadow: {
        'card':     '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
        'card-md':  '0 2px 8px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.08)',
        'card-lg':  '0 4px 16px rgba(0,0,0,0.1), 0 16px 48px rgba(0,0,0,0.08)',
        'card-hover': '0 8px 32px rgba(37,99,235,0.12), 0 2px 8px rgba(0,0,0,0.08)',
        'blue-glow': '0 0 0 3px rgba(37,99,235,0.15)',
        'inner-top': 'inset 0 1px 0 rgba(255,255,255,0.8)',
      },
      backgroundImage: {
        'gradient-radial':  'radial-gradient(var(--tw-gradient-stops))',
        'dot-grid': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Ccircle cx='1' cy='1' r='1' fill='%23CBD5E1' opacity='0.5'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

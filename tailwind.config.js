const plugin = require('tailwindcss/plugin')

// Gradients per DESIGN_SYSTEM §1
const GRADIENTS = {
  aurora:   ['#06B6D4', '#8B5CF6'],
  sunset:   ['#EC4899', '#F97316'],
  champion: ['#FCD34D', '#F59E0B'],
  spring:   ['#34D399', '#06B6D4'],
  ember:    ['#EF4444', '#EC4899'],
  plasma:   ['#A855F7', '#EC4899', '#F97316'],
  silver:   ['#94A3B8', '#CBD5E1'],
  bronze:   ['#D97706', '#92400E'],
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./src/**/*.{js,jsx,ts,tsx}', './src/emails/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      // Typography per DESIGN_SYSTEM §2
      fontFamily: {
        // Default body (legacy compat — Manrope still loaded for legacy pages)
        sans: ['var(--font-sans)', 'var(--font-manrope)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'Menlo', 'Consolas', 'monospace'],
      },

      fontSize: {
        // Custom scale per §2
        'display-xl': ['72px', { lineHeight: '80px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-lg': ['56px', { lineHeight: '64px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-md': ['40px', { lineHeight: '48px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'h1':         ['28px', { lineHeight: '36px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'h2':         ['22px', { lineHeight: '30px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'h3':         ['18px', { lineHeight: '26px', letterSpacing: '-0.005em', fontWeight: '600' }],
        'body':       ['15px', { lineHeight: '24px', fontWeight: '400' }],
        'caption':    ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'micro':      ['11px', { lineHeight: '14px', letterSpacing: '0.04em', fontWeight: '500' }],
      },

      colors: {
        // Midnight base (DESIGN_SYSTEM §1)
        midnight: {
          deepest:  '#060B26',
          base:     '#0B1437',
          elevated: '#131C4A',
          line:     '#1F2A5C',
        },
        // White scale
        whitex: {
          DEFAULT: '#FFFFFF',
          soft:    '#F8FAFC',
          muted:   '#94A3B8',
          faint:   '#475569',
        },
        // Semantic
        success:  '#34D399',
        danger:   '#EF4444',
        warning:  '#F59E0B',
        info:     '#06B6D4',
        glow:     '#A78BFA',

        // Gradient stop accents (handy for borders, dot indicators, etc.)
        aurora:   { from: '#06B6D4', to: '#8B5CF6' },
        sunset:   { from: '#EC4899', to: '#F97316' },
        champion: { from: '#FCD34D', to: '#F59E0B' },
        spring:   { from: '#34D399', to: '#06B6D4' },
        ember:    { from: '#EF4444', to: '#EC4899' },

        // Legacy shadcn tokens (kept; the Day-1 Button component depends on them)
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        card:        { DEFAULT: 'hsl(var(--card-bg))',   foreground: 'hsl(var(--card-foreground))' },
        popover:     { DEFAULT: 'hsl(var(--popover))',   foreground: 'hsl(var(--popover-foreground))' },
        primary:     { DEFAULT: 'hsl(var(--primary))',   foreground: 'hsl(var(--primary-foreground))' },
        secondary:   { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        muted:       { DEFAULT: 'hsl(var(--muted-bg))',  foreground: 'hsl(var(--muted-foreground))' },
        accent:      { DEFAULT: 'hsl(var(--accent))',    foreground: 'hsl(var(--accent-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))',foreground: 'hsl(var(--destructive-foreground))' },
        border:      'hsl(var(--border-token))',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',
      },

      // Spacing scale per §3 (we already have most via Tailwind defaults; add the bigger ones)
      spacing: {
        72: '18rem',
        96: '24rem',
      },

      // Radii per §3
      borderRadius: {
        sm:    '8px',
        md:    '14px',
        lg:    'var(--radius)',  // 12px legacy default; keep token for shadcn primitives
        xl:    '20px',
        '2xl': '28px',
        '3xl': '36px',
      },

      // Glow recipes per §1
      boxShadow: {
        'glow-aurora':   '0 0 40px -8px rgba(139,92,246,0.45), 0 0 80px -20px rgba(6,182,212,0.30)',
        'glow-champion': '0 0 50px -8px rgba(251,191,36,0.55), 0 0 100px -20px rgba(245,158,11,0.40)',
        'glow-sunset':   '0 0 40px -8px rgba(236,72,153,0.45), 0 0 80px -20px rgba(249,115,22,0.30)',
        'glow-ember':    '0 0 40px -8px rgba(239,68,68,0.50), 0 0 80px -20px rgba(236,72,153,0.30)',
        'glow-spring':   '0 0 40px -8px rgba(52,211,153,0.40), 0 0 80px -20px rgba(6,182,212,0.30)',
        'glow-soft':     '0 0 30px -10px rgba(167,139,250,0.40)',
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
        'crown-bob': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-4px)' },
        },
        'pulse-aurora-ring': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(167,139,250,0.5)' },
          '50%':      { boxShadow: '0 0 0 8px rgba(167,139,250,0)' },
        },
      },

      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        'crown-bob':      'crown-bob 4s ease-in-out infinite',
        'pulse-aurora':   'pulse-aurora-ring 3s ease-in-out infinite',
      },
    },
  },

  plugins: [
    require('tailwindcss-animate'),

    // Gradient utilities — bg-gradient-aurora / -sunset / -champion / -spring / -ember / -plasma / -silver / -bronze
    plugin(({ addUtilities, theme }) => {
      const utilities = {}
      Object.entries(GRADIENTS).forEach(([name, stops]) => {
        utilities[`.bg-gradient-${name}`] = {
          'background-image': `linear-gradient(135deg, ${stops.join(', ')})`,
        }
        utilities[`.text-gradient-${name}`] = {
          'background-image': `linear-gradient(135deg, ${stops.join(', ')})`,
          '-webkit-background-clip': 'text',
          'background-clip': 'text',
          'color': 'transparent',
        }
        utilities[`.border-gradient-${name}`] = {
          'border-image': `linear-gradient(135deg, ${stops.join(', ')}) 1`,
        }
      })
      // Tabular nums for scores/timers/XP per §2
      utilities['.tabular'] = {
        'font-variant-numeric': 'tabular-nums',
        'font-feature-settings': '"tnum"',
      }
      addUtilities(utilities)
    }),
  ],
}

/* ================================================================
   TAILWIND CONFIG
   Extends Tailwind with shadcn-style CSS variable references
   so all tokens are available as Tailwind utilities:

     bg-background     text-foreground     border-border
     bg-primary        text-primary-foreground
     bg-accent         text-accent-foreground
     bg-muted          text-muted-foreground
     bg-card           text-card-foreground
     bg-destructive    text-destructive-foreground
     rounded           rounded-md  rounded-lg  rounded-full
     shadow-sm         shadow-md   shadow-lg   shadow-gold

   Wedding palette colours are kept for direct use:
     text-gold-mid     bg-rose-soft     text-sage-mid  …
================================================================ */

tailwind.config = {
  theme: {
    extend: {

      /* ── Fonts ─────────────────────────────────────────────── */
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        body:    ['Jost', 'sans-serif'],
      },

      /* ── Semantic colour tokens (shadcn pattern) ─────────── */
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        border:     'hsl(var(--border))',
        input:      'hsl(var(--input))',
        ring:       'hsl(var(--ring))',

        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },

        /* ── Wedding raw palette (direct access) ──────────── */
        parchment: '#FAF6EF',
        ivory:     '#F5EFE4',
        rose: {
          soft:  '#E8C4B8',
          muted: '#D4998A',
          deep:  '#B5705E',
        },
        gold: {
          light: '#E8D5A3',
          mid:   '#C9A96E',
          deep:  '#A07840',
        },
        sage: {
          light: '#D4DDD0',
          mid:   '#9CAF98',
        },
        ink: '#2C2420',
      },

      /* ── Border radius (from tokens) ────────────────────── */
      borderRadius: {
        DEFAULT: 'var(--radius)',
        sm:      'var(--radius-sm)',
        md:      'var(--radius-md)',
        lg:      'var(--radius-lg)',
        xl:      'var(--radius-xl)',
        full:    'var(--radius-full)',
      },

      /* ── Box shadows (from tokens) ───────────────────────── */
      boxShadow: {
        sm:   'var(--shadow-sm)',
        md:   'var(--shadow-md)',
        lg:   'var(--shadow-lg)',
        gold: 'var(--shadow-gold)',
      },

      /* ── Letter spacing ─────────────────────────────────── */
      letterSpacing: {
        widest2: '0.25em',
        widest3: '0.35em',
        label:   '0.3em',
      },

      /* ── Transition durations (from tokens) ─────────────── */
      transitionDuration: {
        fast: '150ms',
        base: '200ms',
        slow: '350ms',
      },
    },
  },
};

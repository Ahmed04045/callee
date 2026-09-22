/** @type {import('tailwindcss').Config} */
//
// Circosodal design tokens.
//
// Every `md3-*` colour resolves to a CSS variable, so switching the
// `data-theme` attribute on <html> re-skins the whole app with no component
// changes. The four palettes (electric / ultraviolet / acid / paper) are
// defined in src/index.css; add a fifth there + in src/theme/themes.js.
// Variables hold "R G B" triplets so Tailwind opacity modifiers keep working
// (e.g. bg-md3-primary/20).

const token = (name) => `rgb(var(--md3-${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        md3: {
          primary: token('primary'),
          onPrimary: token('onPrimary'),
          primaryContainer: token('primaryContainer'),
          onPrimaryContainer: token('onPrimaryContainer'),
          secondary: token('secondary'),
          secondaryContainer: token('secondaryContainer'),
          onSecondaryContainer: token('onSecondaryContainer'),
          // Extra accent for highlights (badges, hot moments, "new")
          tertiary: token('tertiary'),
          surface: token('surface'),
          onSurface: token('onSurface'),
          surfaceVariant: token('surfaceVariant'),
          onSurfaceVariant: token('onSurfaceVariant'),
          surfaceContainerLow: token('surfaceContainerLow'),
          surfaceContainer: token('surfaceContainer'),
          surfaceContainerHigh: token('surfaceContainerHigh'),
          surfaceContainerHighest: token('surfaceContainerHighest'),
          outline: token('outline'),
          outlineVariant: token('outlineVariant'),
          error: token('error'),
          errorContainer: token('errorContainer'),
          success: token('success'),
          successContainer: token('successContainer'),
          // Scrim is intentionally NOT theme-dependent — modal backdrops
          // should always be a plain black dim.
          scrim: '#000000',
        },
      },
      fontFamily: {
        sans: ['Sora', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Unbounded', 'Sora', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        // The "electric" look: a hairline ring plus a soft coloured bloom.
        glow: '0 0 0 1px rgb(var(--md3-primary) / 0.55), 0 0 18px rgb(var(--md3-primary) / var(--glow-strength))',
        'glow-sm': '0 0 10px rgb(var(--md3-primary) / var(--glow-strength))',
      },
    },
  },
  plugins: [],
};

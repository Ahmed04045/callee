/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Material 3 "Deep Purple" scheme — DARK variant, now the default.
      // Same purple brand seed as before (#6750A4 primary), flipped to M3's
      // standard dark-mode roles: primary becomes a light lavender tint
      // (so it's legible on dark surfaces), containers get darker, and the
      // page background is true black per spec rather than M3's usual
      // slightly-tinted dark surface — surfaceContainer* still step up in
      // lightness above it so cards/panels read as distinct layers.
      // Referenced via themeConfig.js — change values here (not in
      // components) to retune the whole app.
      colors: {
        md3: {
          primary: '#D0BCFF',
          onPrimary: '#381E72',
          primaryContainer: '#4F378B',
          onPrimaryContainer: '#EADDFF',
          secondary: '#CCC2DC',
          secondaryContainer: '#4A4458',
          onSecondaryContainer: '#E8DEF8',
          surface: '#000000',
          onSurface: '#E6E0E9',
          surfaceVariant: '#49454F',
          onSurfaceVariant: '#CAC4D0',
          surfaceContainerLow: '#0B0A0D',
          surfaceContainer: '#141218',
          surfaceContainerHigh: '#1D1B20',
          surfaceContainerHighest: '#2B2930',
          outline: '#948F99',
          outlineVariant: '#49454F',
          error: '#F2B8B5',
          errorContainer: '#8C1D18',
          success: '#4ADE80',
          successContainer: '#14532D',
          // Scrim is intentionally NOT theme-dependent — modal backdrops
          // should always be a plain black dim, in light or dark mode.
          scrim: '#000000',
        },
      },
      fontFamily: {
        sans: ['"Google Sans"', 'Roboto', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Material 3 "Deep Purple" scheme, seeded from the two colors given
      // (primary #6750A4, primaryContainer #EADDFF) with the rest of the
      // roles filled in using Google's standard M3 baseline purple scheme
      // so it reads as a coherent, real M3 palette rather than one color
      // floating in isolation. Referenced via themeConfig.js — change
      // values here (not in components) to retune the whole app.
      colors: {
        md3: {
          primary: '#6750A4',
          onPrimary: '#FFFFFF',
          primaryContainer: '#EADDFF',
          onPrimaryContainer: '#21005D',
          secondary: '#625B71',
          secondaryContainer: '#E8DEF8',
          onSecondaryContainer: '#1D192B',
          surface: '#FEF7FF',
          onSurface: '#1D1B20',
          surfaceVariant: '#E7E0EC',
          onSurfaceVariant: '#49454F',
          surfaceContainerLow: '#F7F2FA',
          surfaceContainer: '#F3EDF7',
          surfaceContainerHigh: '#ECE6F0',
          surfaceContainerHighest: '#E6E0E9',
          outline: '#CAC4D0',
          outlineVariant: '#E7E0EC',
          error: '#B3261E',
          errorContainer: '#F9DEDC',
          success: '#146C2E',
          successContainer: '#C4EED0',
        },
      },
      fontFamily: {
        sans: ['"Google Sans"', 'Roboto', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}